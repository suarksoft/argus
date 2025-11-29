import { NextRequest, NextResponse } from 'next/server';
import { EnhancedWalletRiskAnalyzer } from '@/lib/analyzer/enhancedWalletRiskAnalyzer';

// Rate limiting helper (simple in-memory, production'da Redis kullan)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(apiKey: string, limit: number = 10): boolean {
  const now = Date.now();
  const minuteMs = 60 * 1000;
  
  const record = rateLimitMap.get(apiKey);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(apiKey, {
      count: 1,
      resetAt: now + minuteMs
    });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { address, network, homeDomain, apiKey } = body;

    // Validate API key (production'da database'den kontrol et)
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key required',
          code: 'MISSING_API_KEY'
        },
        { status: 401 }
      );
    }

    // Rate limiting check
    if (!checkRateLimit(apiKey, 10)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        },
        { status: 429 }
      );
    }

    // Validate address
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required',
          code: 'MISSING_ADDRESS'
        },
        { status: 400 }
      );
    }

    if (!address.startsWith('G') || address.length !== 56) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Stellar address format',
          code: 'INVALID_ADDRESS'
        },
        { status: 400 }
      );
    }

    // Validate network
    const isTestnet = network === 'testnet';
    if (network && network !== 'testnet' && network !== 'public') {
      return NextResponse.json(
        {
          success: false,
          error: 'Network must be "testnet" or "public"',
          code: 'INVALID_NETWORK'
        },
        { status: 400 }
      );
    }

    // Perform analysis
    const analyzer = new EnhancedWalletRiskAnalyzer(isTestnet);
    
    const startTime = Date.now();
    const analysis = await analyzer.analyzeWallet(address, homeDomain);
    const duration = Date.now() - startTime;

    // Return success response
    return NextResponse.json(
      {
        success: true,
        cached: false,
        cacheAge: null,
        analysis: {
          ...analysis,
          timestamp: new Date().toISOString(),
          processingTime: `${duration}ms`
        }
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      }
    );

  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const network = searchParams.get('network') || 'public';
  const apiKey = searchParams.get('apiKey') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!address) {
    return NextResponse.json(
      {
        success: false,
        error: 'Address parameter required',
        code: 'MISSING_ADDRESS'
      },
      { status: 400 }
    );
  }

  // Reuse POST logic
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ address, network, apiKey })
    })
  );
}
