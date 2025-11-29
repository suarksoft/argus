import { NextRequest, NextResponse } from 'next/server';
import { analyzeAddressComprehensive } from '@/lib/server/comprehensive-analyzer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    console.log('=== COMPREHENSIVE ANALYSIS START ===');
    console.log('Address:', address);
    console.log('Context:', context);

    // Perform comprehensive analysis
    const analysis = await analyzeAddressComprehensive(address, context);

    const responseTime = Date.now() - startTime;
    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Risk Score:', analysis.riskScore);
    console.log('Risk Level:', analysis.riskLevel);
    console.log('Response Time:', responseTime, 'ms');

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        metadata: {
          ...analysis.accountInfo,
          responseTime,
          timestamp: new Date().toISOString(),
        }
      },
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error('=== ANALYSIS ERROR ===');
    console.error('Error:', error.message);
    console.error('Time:', responseTime, 'ms');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

