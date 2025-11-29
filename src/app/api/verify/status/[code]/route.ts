import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    console.log('=== VERIFICATION STATUS CHECK ===');
    console.log('Code:', code);

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    try {
      const requestsCollection = await getCollection('verification_requests');
      const request = await requestsCollection.findOne({ code });

      if (!request) {
        return NextResponse.json(
          { success: false, error: 'Verification code not found' },
          { status: 404 }
        );
      }

      // Check if expired
      if (new Date(request.expiresAt) < new Date()) {
        return NextResponse.json(
          { 
            success: true, 
            data: {
              code,
              status: 'EXPIRED',
              message: 'Verification code has expired'
            }
          }
        );
      }

      console.log('✅ Status:', request.status);

      return NextResponse.json({
        success: true,
        data: {
          code: request.code,
          contractId: request.contractId,
          network: request.network,
          status: request.status,
          createdAt: request.createdAt,
          expiresAt: request.expiresAt,
          verifiedAt: request.verifiedAt,
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Return pending status if DB not available
      return NextResponse.json({
        success: true,
        data: {
          code,
          status: 'PENDING',
          message: 'Database not available - status cannot be verified'
        }
      });
    }

  } catch (error: any) {
    console.error('=== STATUS CHECK ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
