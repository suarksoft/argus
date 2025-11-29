import { NextRequest, NextResponse } from 'next/server';
import { analyzeAddressComprehensive } from '@/lib/server/comprehensive-analyzer';

/**
 * LEGACY ENDPOINT - Redirects to comprehensive analysis
 * 
 * This endpoint is kept for backward compatibility.
 * All new code should use /api/analytics/comprehensive
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, context } = body;

    // Validation
    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!address.startsWith('G') || address.length !== 56) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    console.log('=== LEGACY ENDPOINT: Redirecting to comprehensive ===');
    console.log('Address:', address);

    // Use comprehensive analyzer (GERÇEK VERİ)
    const analysis = await analyzeAddressComprehensive(address, context);

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Address analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Analysis failed',
      },
      { status: 500 }
    );
  }
}

