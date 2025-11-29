import { NextResponse } from 'next/server';
import { assetDatabase } from '@/lib/database/asset-service';

export async function GET() {
  try {
    const assets = await assetDatabase.getAllBlacklistedAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Failed to fetch blacklisted assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blacklisted assets' },
      { status: 500 }
    );
  }
}
