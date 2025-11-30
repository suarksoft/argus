import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['DeFi', 'Gaming', 'NFT', 'Social', 'Tools', 'Infrastructure', 'Bridges', 'Wallets', 'Other'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'recent';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('=== FETCHING DAPPS ===');
    console.log('Search:', search);
    console.log('Category:', category);
    console.log('Sort:', sort);

    try {
      const dappsCollection = await getCollection('dapps');

      // Build query
      const query: any = { isVerified: true }; // Only show verified dApps
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
        ];
      }

      if (category !== 'all' && CATEGORIES.includes(category)) {
        query.category = category;
      }

      // Build sort
      const sortOptions: any = {};
      if (sort === 'recent') {
        sortOptions.createdAt = -1;
      } else if (sort === 'rating') {
        sortOptions.ratingAverage = -1;
      } else if (sort === 'users') {
        sortOptions.totalUsers = -1;
      } else if (sort === 'tvl') {
        sortOptions.tvlUsd = -1;
      } else if (sort === 'name') {
        sortOptions.name = 1;
      }

      // Fetch dApps
      const skip = (page - 1) * limit;
      const dapps = await dappsCollection
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await dappsCollection.countDocuments(query);

      console.log('✅ Found', dapps.length, 'dApps');

      // Map to frontend format
      const mappedDapps = dapps.map((dapp: any) => ({
        _id: dapp._id.toString(),
        slug: dapp.slug,
        name: dapp.name,
        description: dapp.description || '',
        logoUrl: dapp.logoUrl,
        bannerUrl: dapp.bannerUrl,
        category: dapp.category || 'Other',
        websiteUrl: dapp.websiteUrl,
        githubUrl: dapp.githubUrl,
        twitterUrl: dapp.twitterUrl,
        discordUrl: dapp.discordUrl,
        contractId: dapp.contractId || null,
        contractVerified: dapp.contractVerified || false,
        contractSecurityScore: dapp.contractSecurityScore || 0,
        ratingAverage: dapp.ratingAverage || 0,
        ratingCount: dapp.ratingCount || 0,
        totalUsers: dapp.totalUsers || 0,
        tvlUsd: dapp.tvlUsd || 0,
        launchDate: dapp.launchDate ? new Date(dapp.launchDate).toISOString() : dapp.createdAt ? new Date(dapp.createdAt).toISOString() : null,
        createdAt: dapp.createdAt ? new Date(dapp.createdAt).toISOString() : new Date().toISOString(),
      }));

      return NextResponse.json({
        success: true,
        dapps: mappedDapps,
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
        dapps: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    }

  } catch (error: any) {
    console.error('=== DAPPS FETCH ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dApps' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      logoUrl,
      bannerUrl,
      websiteUrl,
      githubUrl,
      twitterUrl,
      discordUrl,
      category,
      screenshots,
      ownerAddress,
      contractId,
    } = body;

    console.log('=== DAPP SUBMISSION ===');
    console.log('Name:', name);
    console.log('Contract ID:', contractId);

    // Validation
    if (!name || !description || !category || !ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Name, description, category, and owner address are required' },
        { status: 400 }
      );
    }

    // Contract ID is required
    if (!contractId) {
      return NextResponse.json(
        { success: false, error: 'Contract ID is required. Please verify your contract first using Argus CLI.' },
        { status: 400 }
      );
    }

    // Validate category
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    try {
      const dappsCollection = await getCollection('dapps');

      // Check if slug exists
      const existing = await dappsCollection.findOne({ slug });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'A dApp with this name already exists' },
          { status: 400 }
        );
      }

      // Check contract verification status
      let contractVerified = false;
      let contractSecurityScore = 0;
      
      if (contractId) {
        try {
          const verifiedContractsCollection = await getCollection('verified_contracts');
          const verifiedContract = await verifiedContractsCollection.findOne({
            contract_id: contractId,
            verified: true
          });
          
          if (verifiedContract) {
            contractVerified = true;
            contractSecurityScore = verifiedContract.security_score || 0;
            console.log('✅ Contract verified:', contractId, 'Score:', contractSecurityScore);
          } else {
            // Contract must be verified to submit dApp
            return NextResponse.json(
              { 
                success: false, 
                error: 'This contract is not verified. Please verify your contract first using Argus CLI before submitting your dApp.',
                hint: 'Run: npx argus-stellar-cli verify --contract-id ' + contractId
              },
              { status: 400 }
            );
          }
        } catch (err) {
          console.error('Error checking contract verification:', err);
          return NextResponse.json(
            { success: false, error: 'Failed to verify contract status. Please try again.' },
            { status: 500 }
          );
        }
      }

      // Create dApp
      const dapp = await dappsCollection.insertOne({
        slug,
        name,
        description,
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
        websiteUrl: websiteUrl || null,
        githubUrl: githubUrl || null,
        twitterUrl: twitterUrl || null,
        discordUrl: discordUrl || null,
        category,
        screenshots: screenshots || [],
        ownerAddress,
        contractId: contractId || null,
        contractVerified,
        contractSecurityScore,
        isVerified: false, // Needs manual verification
        ratingAverage: 0,
        ratingCount: 0,
        totalUsers: 0,
        tvlUsd: 0,
        launchDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ dApp created:', dapp.insertedId);

      return NextResponse.json({
        success: true,
        dappId: dapp.insertedId.toString(),
        slug,
        message: 'dApp submitted successfully. It will be reviewed before being published.',
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to submit dApp' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== DAPP SUBMISSION ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit dApp' },
      { status: 500 }
    );
  }
}

