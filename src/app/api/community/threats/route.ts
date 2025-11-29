import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'verified';
    const sort = searchParams.get('sort') || 'recent';
    const address = searchParams.get('address');

    console.log('=== FETCHING THREATS ===');
    console.log('Filter:', filter);
    console.log('Sort:', sort);
    console.log('Address:', address || 'all');

    try {
      const reportsCollection = await getCollection('scam_reports');

      // Build query (GERÇEK VERİ)
      const query: any = {};
      if (filter === 'verified') {
        query.status = 'verified';
      } else if (filter === 'pending') {
        query.status = 'pending';
      }
      
      // Address filter (GERÇEK VERİ)
      if (address && address.startsWith('G') && address.length === 56) {
        query.address = address;
      }

      // Build sort
      const sortOptions: any = {};
      if (sort === 'upvotes') {
        sortOptions.upvotes = -1;
      } else {
        sortOptions.createdAt = -1;
      }

      // Fetch threats
      const threats = await reportsCollection
        .find(query)
        .sort(sortOptions)
        .limit(50)
        .toArray();

      console.log('✅ Found', threats.length, 'threats');

      // Calculate severity (if not stored)
      const enrichedThreats = threats.map(threat => {
        // Auto-calculate severity if not set
        let severity = threat.severity || 'MEDIUM';
        
        if (threat.upvotes > 20 || threat.scamType === 'HONEYPOT') {
          severity = 'CRITICAL';
        } else if (threat.upvotes > 10 || ['PHISHING', 'FAKE_EXCHANGE'].includes(threat.scamType)) {
          severity = 'HIGH';
        } else if (threat.upvotes > 5) {
          severity = 'MEDIUM';
        }

        return {
          ...threat,
          _id: threat._id.toString(),
          severity,
        };
      });

      return NextResponse.json({
        success: true,
        threats: enrichedThreats,
        total: enrichedThreats.length,
        filter,
        sort,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Return empty array if DB not available
      return NextResponse.json({
        success: true,
        threats: [],
        total: 0,
        message: 'Database not available',
      });
    }

  } catch (error: any) {
    console.error('=== THREATS FETCH ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch threats' },
      { status: 500 }
    );
  }
}

