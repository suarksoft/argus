import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assetAnalyzer } from '@/lib/analyzer/asset-analyzer';
import { isValidStellarAddress } from '@/lib/stellar/utils';

// Request validation schema
const AnalyzeAssetSchema = z.object({
  assetCode: z.string().min(1).max(12),
  issuerAddress: z.string().refine(isValidStellarAddress, {
    message: 'Invalid Stellar address',
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = AnalyzeAssetSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { assetCode, issuerAddress } = validation.data;

    // Analyze asset
    const analysis = await assetAnalyzer.analyzeAsset(assetCode, issuerAddress);

    return NextResponse.json({
      success: true,
      data: analysis,
    });

  } catch (error) {
    console.error('Asset analysis error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
