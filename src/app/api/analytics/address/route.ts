import { NextRequest, NextResponse } from 'next/server';
import { analyzeAddress } from '@/lib/server/risk-analyzer';
import { generateAIExplanation, generateRecommendations } from '@/lib/server/ai';
import { getCollection } from '@/lib/server/mongodb';

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

    console.log('Analyzing address:', address);

    // Perform analysis
    const analysis = await analyzeAddress(address);

    // Generate AI explanation
    const aiExplanation = await generateAIExplanation({
      ...analysis,
      ...analysis.metadata,
    });

    // Generate recommendations
    const recommendations = generateRecommendations({
      ...analysis,
      ...analysis.metadata,
    });

    // Enhanced result
    const result = {
      ...analysis,
      aiExplanation,
      recommendations,
      analyzedAt: new Date().toISOString(),
    };

    // Log to MongoDB (async, don't block response)
    try {
      const logsCollection = await getCollection('analytics_logs');
      logsCollection.insertOne({
        type: 'address',
        identifier: address,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        threats: analysis.threats.map(t => t.name),
        context,
        createdAt: new Date(),
      }).catch(err => console.error('Log save error:', err));
    } catch (err) {
      console.log('Logging skipped (DB not available)');
    }

    console.log('Analysis complete:', {
      address,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
    });

    return NextResponse.json({
      success: true,
      data: result,
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

