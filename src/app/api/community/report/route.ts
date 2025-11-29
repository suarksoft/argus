import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

// Verify auth token
async function verifyToken(token: string) {
  try {
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({
      sessionToken: token,
      tokenExpiry: { $gt: new Date() }
    });
    return user;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    console.log('=== SCAM REPORT SUBMISSION ===');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user
    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    console.log('User:', user.email);

    const body = await request.json();
    const {
      address,
      scamType,
      title,
      description,
      evidenceUrls,
      contactEmail,
      reporterIp,
    } = body;

    // Validation
    if (!address || !scamType || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be filled' },
        { status: 400 }
      );
    }

    // Address validation
    if (!address.startsWith('G') || address.length !== 56) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    try {
      const reportsCollection = await getCollection('scam_reports');

      // Rate limiting: Check recent reports from this user
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentReports = await reportsCollection.countDocuments({
        reporterEmail: user.email,
        createdAt: { $gte: oneHourAgo }
      });

      if (recentReports >= 5) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Maximum 5 reports per hour.' },
          { status: 429 }
        );
      }

      // Check duplicate (same address, same user, last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const duplicate = await reportsCollection.findOne({
        address,
        reporterEmail: user.email,
        createdAt: { $gte: oneDayAgo }
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'You already reported this address in the last 24 hours' },
          { status: 400 }
        );
      }

      // Create report
      const report = await reportsCollection.insertOne({
        address,
        addressType: 'account', // Could detect contract vs account
        scamType,
        title,
        description,
        evidenceUrls: evidenceUrls || [],
        
        // Reporter info
        reporterEmail: user.email,
        reporterUsername: user.username,
        reporterIp: reporterIp || 'unknown',
        contactEmail: contactEmail || user.email,
        
        // Status
        status: 'pending',
        upvotes: 0,
        downvotes: 0,
        
        // Metadata
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update user stats
      const usersCollection = await getCollection('users');
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $inc: { reportsSubmitted: 1 },
          $set: { lastActive: new Date() }
        }
      );

      console.log('✅ Report created:', report.insertedId);

      return NextResponse.json({
        success: true,
        reportId: report.insertedId.toString(),
        message: 'Report submitted successfully. Our moderators will review it shortly.',
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to submit report' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== REPORT SUBMISSION ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

