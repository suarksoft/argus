import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';
import { ObjectId } from 'mongodb';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    console.log('=== VOTE SUBMISSION ===');
    console.log('Threat ID:', id);
    console.log('Token:', token ? 'Present' : 'Missing');

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

    const body = await request.json();
    const { voteType } = body; // 'confirm' or 'reject'

    if (!voteType || !['confirm', 'reject'].includes(voteType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vote type. Must be "confirm" or "reject"' },
        { status: 400 }
      );
    }

    try {
      const reportsCollection = await getCollection('scam_reports');

      // Find threat
      let threat;
      try {
        threat = await reportsCollection.findOne({
          _id: new ObjectId(id),
        });
      } catch {
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

      // Check if user already voted
      const votesCollection = await getCollection('threat_votes');
      const existingVote = await votesCollection.findOne({
        threatId: id,
        voterEmail: user.email,
      });

      if (existingVote) {
        // User already voted - update vote
        if (existingVote.voteType === voteType) {
          return NextResponse.json(
            { success: false, error: 'You have already voted this way' },
            { status: 400 }
          );
        }

        // Change vote
        await votesCollection.updateOne(
          { _id: existingVote._id },
          {
            $set: {
              voteType,
              updatedAt: new Date(),
            }
          }
        );

        // Update threat vote counts
        if (voteType === 'confirm') {
          await reportsCollection.updateOne(
            { _id: threat._id },
            {
              $inc: { upvotes: 1, downvotes: -1 },
              $set: { updatedAt: new Date() }
            }
          );
        } else {
          await reportsCollection.updateOne(
            { _id: threat._id },
            {
              $inc: { upvotes: -1, downvotes: 1 },
              $set: { updatedAt: new Date() }
            }
          );
        }
      } else {
        // New vote
        await votesCollection.insertOne({
          threatId: id,
          voterEmail: user.email,
          voterUsername: user.username,
          voteType,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Update threat vote counts
        if (voteType === 'confirm') {
          await reportsCollection.updateOne(
            { _id: threat._id },
            {
              $inc: { upvotes: 1 },
              $set: { updatedAt: new Date() }
            }
          );
        } else {
          await reportsCollection.updateOne(
            { _id: threat._id },
            {
              $inc: { downvotes: 1 },
              $set: { updatedAt: new Date() }
            }
          );
        }
      }

      // Get updated threat
      const updatedThreat = await reportsCollection.findOne({
        _id: threat._id,
      });

      if (!updatedThreat) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch updated threat' },
          { status: 500 }
        );
      }

      console.log('✅ Vote recorded:', voteType);

      return NextResponse.json({
        success: true,
        message: `Vote ${voteType === 'confirm' ? 'confirmed' : 'rejected'} successfully`,
        threat: {
          _id: updatedThreat._id.toString(),
          upvotes: updatedThreat.upvotes || 0,
          downvotes: updatedThreat.downvotes || 0,
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to record vote' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== VOTE ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record vote' },
      { status: 500 }
    );
  }
}

