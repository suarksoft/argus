import { NextResponse } from 'next/server';
import { assetDatabase } from '@/lib/database/asset-service';

export async function GET() {
  try {
    const stats = await assetDatabase.getAssetStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch asset stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
