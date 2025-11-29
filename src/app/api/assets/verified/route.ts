import { NextRequest, NextResponse } from 'next/server';
import { assetDatabase } from '@/lib/database/asset-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (query) {
      const results = await assetDatabase.searchVerifiedAssets(query);
      return NextResponse.json({ assets: results });
    }

    const assets = await assetDatabase.getAllVerifiedAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Failed to fetch assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
