import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network') || 'testnet';

    console.log('=== FETCHING CONTRACT DETAIL ===');
    console.log('Contract ID:', contractId);
    console.log('Network:', network);

    try {
      const contractsCollection = await getCollection('verified_contracts');

      // Find contract
      const contract = await contractsCollection.findOne({
        contractId,
        network,
      // network: network, // Match exact network
      });

      if (!contract) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Increment view count
      await contractsCollection.updateOne(
        { _id: contract._id },
        { $inc: { viewCount: 1 } }
      );

      // Map to frontend format
      const contractData = {
        _id: contract._id.toString(),
        contractId: contract.contractId,
        network: contract.network,
        name: contract.name || 'Unnamed Contract',
        description: contract.description || '',
        githubRepo: contract.githubRepo,
        githubCommit: contract.githubCommit,
        compilerVersion: contract.compilerVersion || '',
        securityScore: contract.securityScore || 0,
        riskLevel: contract.riskLevel || 'MEDIUM',
        verifiedAt: contract.verifiedAt ? new Date(contract.verifiedAt).toISOString() : contract.createdAt ? new Date(contract.createdAt).toISOString() : new Date().toISOString(),
        verifiedBy: contract.verifiedBy || 'cli-tool',
        isAudited: contract.isAudited || false,
        auditUrl: contract.auditUrl || null,
        viewCount: (contract.viewCount || 0) + 1,
        trustCount: contract.trustCount || 0,
        wasmHash: contract.wasmHash,
        wasmSize: contract.wasmSize,
        sourceHash: contract.sourceHash,
        sourceFiles: contract.sourceFiles || [],
        verificationChecks: contract.verificationChecks || {},
        dappId: contract.dappId || null,
      };

      return NextResponse.json({
        success: true,
        contract: contractData,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== CONTRACT DETAIL ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

