import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCHING TOP HUNTERS ===');

    try {
      const reportsCollection = await getCollection('scam_reports');
      const usersCollection = await getCollection('users');

      // Get all verified reports grouped by reporter
      const verifiedReports = await reportsCollection
        .find({ status: 'verified' })
        .toArray();

      // Count verified reports per user
      const userStats: Record<string, { verifiedCount: number; username: string }> = {};

      verifiedReports.forEach((report: any) => {
        const email = report.reporterEmail;
        if (email) {
          if (!userStats[email]) {
            userStats[email] = {
              verifiedCount: 0,
              username: report.reporterUsername || email.split('@')[0],
            };
          }
          userStats[email].verifiedCount++;
        }
      });

      // Get user data and calculate points
      const hunterPromises = Object.entries(userStats)
        .slice(0, 10) // Top 10
        .map(async ([email, stats]) => {
          // Get user from database
          const user = await usersCollection.findOne({ email });
          
          // Calculate points (verified reports * 50 + reputation)
          const points = (stats.verifiedCount * 50) + (user?.reputation || 0);

          return {
            username: stats.username,
            verifiedCount: stats.verifiedCount,
            points,
          };
        });
      
      const hunters = await Promise.all(hunterPromises);

      // Sort by points descending
      hunters.sort((a, b) => b.points - a.points);

      // Take top 3
      const topHunters = hunters.slice(0, 3);

      console.log('✅ Top hunters:', topHunters);

      return NextResponse.json({
        success: true,
        hunters: topHunters,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json({
        success: true,
        hunters: [],
      });
    }

  } catch (error: any) {
    console.error('=== HUNTERS ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch top hunters' },
      { status: 500 }
    );
  }
}

