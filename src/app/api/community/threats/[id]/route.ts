import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('=== FETCHING THREAT DETAIL ===');
    console.log('ID:', id);

    try {
      const reportsCollection = await getCollection('scam_reports');

      // Fetch threat by ID (GERÇEK VERİ)
      // Try ObjectId first, then string
      let threat;
      try {
        threat = await reportsCollection.findOne({
          _id: new ObjectId(id),
        });
      } catch {
        // If ObjectId fails, try string match
        threat = await reportsCollection.findOne({
          _id: id as any,
        });
      }

      if (!threat) {
        return NextResponse.json(
          { success: false, error: 'Threat not found' },
          { status: 404 }
        );
      }

      console.log('✅ Found threat:', threat._id);

      // Map to frontend format (GERÇEK VERİ)
      const threatData = {
        _id: threat._id.toString(),
        address: threat.address || '',
        scamType: threat.scamType || 'OTHER',
        title: threat.title || 'Untitled Report',
        description: threat.description || '',
        severity: threat.severity || 'MEDIUM',
        status: threat.status || 'pending',
        reporterUsername: threat.reporterUsername || threat.reporterEmail?.split('@')[0] || 'Anonymous',
        reporterEmail: threat.reporterEmail,
        upvotes: threat.upvotes || 0,
        downvotes: threat.downvotes || 0,
        evidenceUrls: threat.evidenceUrls || [],
        createdAt: threat.createdAt ? new Date(threat.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: threat.updatedAt ? new Date(threat.updatedAt).toISOString() : threat.createdAt ? new Date(threat.createdAt).toISOString() : new Date().toISOString(),
        verifiedAt: threat.verifiedAt ? new Date(threat.verifiedAt).toISOString() : undefined,
        verifiedBy: threat.verifiedBy || undefined,
        contactEmail: threat.contactEmail,
      };

      return NextResponse.json({
        success: true,
        threat: threatData,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== THREAT DETAIL ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch threat' },
      { status: 500 }
    );
  }
}

