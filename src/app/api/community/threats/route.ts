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

      // Fetch threats (GERÇEK VERİ - MongoDB'den)
      const threats = await reportsCollection
        .find(query)
        .sort(sortOptions)
        .limit(50)
        .toArray();

      console.log('✅ Found', threats.length, 'threats from MongoDB');
      console.log('Sample threat:', threats[0] ? JSON.stringify(threats[0], null, 2) : 'No threats');

      // Map MongoDB documents to frontend format (GERÇEK VERİ)
      const enrichedThreats = threats.map((threat: any) => {
        // Severity calculation based on real data
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
        
        // Use stored severity if exists, otherwise calculate
        if (threat.severity) {
          severity = threat.severity;
        } else {
          // Calculate based on real data
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

        // Return REAL data from MongoDB
        return {
          _id: threat._id.toString(),
          address: threat.address || '',
          scamType: threat.scamType || 'OTHER',
          title: threat.title || 'Untitled Report',
          description: threat.description || '',
          severity,
          status: threat.status || 'pending',
          reporterUsername: threat.reporterUsername || threat.reporterEmail?.split('@')[0] || 'Anonymous',
          upvotes: threat.upvotes || 0,
          downvotes: threat.downvotes || 0,
          evidenceUrls: threat.evidenceUrls || [],
          createdAt: threat.createdAt ? new Date(threat.createdAt).toISOString() : new Date().toISOString(),
          verifiedAt: threat.verifiedAt ? new Date(threat.verifiedAt).toISOString() : undefined,
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

