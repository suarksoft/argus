import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING SEVERITY BREAKDOWN ===');

    try {
      const reportsCollection = await getCollection('scam_reports');

      // Get all threats and calculate severity
      const threats = await reportsCollection
        .find({ status: { $in: ['pending', 'verified'] } })
        .toArray();

      // Calculate severity breakdown
      const breakdown = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      threats.forEach((threat: any) => {
        let severity = threat.severity || 'MEDIUM';
        
        // Auto-calculate if not set
        if (!threat.severity) {
          const upvotes = threat.upvotes || 0;
          const scamType = threat.scamType || '';
          
          if (upvotes > 20 || scamType === 'HONEYPOT' || threat.status === 'verified') {
            severity = 'CRITICAL';
          } else if (upvotes > 10 || ['PHISHING', 'FAKE_EXCHANGE', 'RUG_PULL'].includes(scamType)) {
            severity = 'HIGH';
          } else if (upvotes > 5) {
            severity = 'MEDIUM';
          } else {
            severity = 'LOW';
          }
        }

        breakdown[severity as keyof typeof breakdown]++;
      });

      console.log('✅ Severity breakdown:', breakdown);

      return NextResponse.json({
        success: true,
        breakdown,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json({
        success: true,
        breakdown: {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
        },
      });
    }

  } catch (error: any) {
    console.error('=== SEVERITY ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch severity breakdown' },
      { status: 500 }
    );
  }
}

