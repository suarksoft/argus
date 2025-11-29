import { NextRequest, NextResponse } from 'next/server';
import { TransactionPreviewService } from '@/lib/analyzer/transactionPreview';
import * as StellarSdk from '@stellar/stellar-sdk';

// Rate limiting helper (same as address route)
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
    const { source, destination, asset, amount, memo, network, apiKey } = body;

    // Validate API key
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

    // Rate limiting
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

    // Validate required fields
    if (!source || !destination || !asset || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: source, destination, asset, amount',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!source.startsWith('G') || source.length !== 56) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid source address format',
          code: 'INVALID_SOURCE'
        },
        { status: 400 }
      );
    }

    if (!destination.startsWith('G') || destination.length !== 56) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid destination address format',
          code: 'INVALID_DESTINATION'
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

    // Create asset object
    let stellarAsset: StellarSdk.Asset;
    try {
      if (!asset.issuer || asset.code === 'XLM') {
        stellarAsset = StellarSdk.Asset.native();
      } else {
        stellarAsset = new StellarSdk.Asset(asset.code, asset.issuer);
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid asset format',
          code: 'INVALID_ASSET'
        },
        { status: 400 }
      );
    }

    // Perform transaction preview
    const previewService = new TransactionPreviewService(isTestnet);
    
    const startTime = Date.now();
    const preview = await previewService.previewTransaction(
      source,
      destination,
      stellarAsset,
      amount,
      memo
    );
    const duration = Date.now() - startTime;

    // Return success response
    return NextResponse.json(
      {
        success: true,
        preview: {
          ...preview,
          timestamp: new Date().toISOString(),
          processingTime: `${duration}ms`
        }
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '9',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60)
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
