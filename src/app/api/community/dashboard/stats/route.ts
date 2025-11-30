import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING DASHBOARD STATS ===');

    try {
      const reportsCollection = await getCollection('scam_reports');
      const usersCollection = await getCollection('users');

      // Active Threats (pending + verified)
      const activeThreats = await reportsCollection.countDocuments({
        status: { $in: ['pending', 'verified'] }
      });

      // Verified Reports
      const verifiedReports = await reportsCollection.countDocuments({
        status: 'verified'
      });

      // Community Members
      const communityMembers = await usersCollection.countDocuments({});

      // Protected Value (estimated from verified reports)
      // TODO: Calculate from actual protected transactions
      const protectedValue = verifiedReports * 10000; // Placeholder calculation

      // Accuracy Rate (verified / total)
      const totalReports = await reportsCollection.countDocuments({});
      const accuracyRate = totalReports > 0 
        ? Math.round((verifiedReports / totalReports) * 100 * 10) / 10
        : 0;

      const stats = {
        activeThreats,
        verifiedReports,
        communityMembers,
        protectedValue,
        accuracyRate,
      };

      console.log('✅ Stats calculated:', stats);

      return NextResponse.json({
        success: true,
        stats,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Return default stats if DB not available
      return NextResponse.json({
        success: true,
        stats: {
          activeThreats: 0,
          verifiedReports: 0,
          communityMembers: 0,
          protectedValue: 0,
          accuracyRate: 0,
        },
      });
    }

  } catch (error: any) {
    console.error('=== STATS ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

