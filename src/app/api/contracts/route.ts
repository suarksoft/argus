import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const network = searchParams.get('network') || 'all';
    const riskLevel = searchParams.get('risk') || 'all';
    const sort = searchParams.get('sort') || 'recent';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('=== FETCHING VERIFIED CONTRACTS ===');
    console.log('Search:', search);
    console.log('Network:', network);
    console.log('Risk:', riskLevel);
    console.log('Sort:', sort);

    try {
      const contractsCollection = await getCollection('verified_contracts');

      // Build query
      const query: any = {};
      
      if (search) {
        query.$or = [
          { contractId: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      if (network !== 'all') {
        query.network = network;
      }

      if (riskLevel !== 'all') {
        query.riskLevel = riskLevel.toUpperCase();
      }

      // Build sort
      const sortOptions: any = {};
      if (sort === 'recent') {
        sortOptions.verifiedAt = -1;
      } else if (sort === 'score') {
        sortOptions.securityScore = -1;
      } else if (sort === 'name') {
        sortOptions.name = 1;
      }

      // Fetch contracts
      const skip = (page - 1) * limit;
      const contracts = await contractsCollection
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await contractsCollection.countDocuments(query);

      console.log('✅ Found', contracts.length, 'contracts');

      // Map to frontend format
      const mappedContracts = contracts.map((contract: any) => ({
        _id: contract._id.toString(),
        contractId: contract.contractId,
        network: contract.network,
        name: contract.name || 'Unnamed Contract',
        description: contract.description || '',
        githubRepo: contract.githubRepo,
        securityScore: contract.securityScore || 0,
        riskLevel: contract.riskLevel || 'MEDIUM',
        verifiedAt: contract.verifiedAt ? new Date(contract.verifiedAt).toISOString() : contract.createdAt ? new Date(contract.createdAt).toISOString() : new Date().toISOString(),
        viewCount: contract.viewCount || 0,
        trustCount: contract.trustCount || 0,
        compilerVersion: contract.compilerVersion || '',
        isAudited: contract.isAudited || false,
      }));

      return NextResponse.json({
        success: true,
        contracts: mappedContracts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json({
        success: true,
        contracts: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    }

  } catch (error: any) {
    console.error('=== CONTRACTS FETCH ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}

