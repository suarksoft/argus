import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    console.log('=== FETCHING DAPP DETAIL ===');
    console.log('Slug:', slug);

    try {
      const dappsCollection = await getCollection('dapps');
      const contractsCollection = await getCollection('verified_contracts');
      const reviewsCollection = await getCollection('dapp_reviews');

      // Find dApp
      const dapp = await dappsCollection.findOne({ slug });

      if (!dapp) {
        return NextResponse.json(
          { success: false, error: 'dApp not found' },
          { status: 404 }
        );
      }

      // Get associated contracts
      const contracts = await contractsCollection
        .find({ dappId: dapp._id.toString() })
        .toArray();

      // Get reviews
      const reviews = await reviewsCollection
        .find({ dappId: dapp._id.toString() })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      // Map to frontend format
      const dappData = {
        _id: dapp._id.toString(),
        slug: dapp.slug,
        name: dapp.name,
        description: dapp.description || '',
        logoUrl: dapp.logoUrl,
        bannerUrl: dapp.bannerUrl,
        websiteUrl: dapp.websiteUrl,
        githubUrl: dapp.githubUrl,
        twitterUrl: dapp.twitterUrl,
        discordUrl: dapp.discordUrl,
        category: dapp.category || 'Other',
        screenshots: dapp.screenshots || [],
        ownerAddress: dapp.ownerAddress,
        isVerified: dapp.isVerified || false,
        ratingAverage: dapp.ratingAverage || 0,
        ratingCount: dapp.ratingCount || 0,
        totalUsers: dapp.totalUsers || 0,
        tvlUsd: dapp.tvlUsd || 0,
        launchDate: dapp.launchDate ? new Date(dapp.launchDate).toISOString() : null,
        createdAt: dapp.createdAt ? new Date(dapp.createdAt).toISOString() : new Date().toISOString(),
        contracts: contracts.map((c: any) => ({
          _id: c._id.toString(),
          contractId: c.contractId,
          name: c.name,
          network: c.network,
          securityScore: c.securityScore || 0,
          riskLevel: c.riskLevel || 'MEDIUM',
        })),
        reviews: reviews.map((r: any) => ({
          _id: r._id.toString(),
          reviewerAddress: r.reviewerAddress,
          rating: r.rating,
          title: r.title,
          content: r.content,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        })),
      };

      return NextResponse.json({
        success: true,
        dapp: dappData,
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== DAPP DETAIL ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dApp' },
      { status: 500 }
    );
  }
}

