import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { portfolioScanner } from '@/lib/portfolio/scanner';

const ScanPortfolioSchema = z.object({
  accountId: z.string().min(56).max(56),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ScanPortfolioSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid account ID', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { accountId } = validation.data;

    // Scan portfolio
    const analysis = await portfolioScanner.scanPortfolio(accountId);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Portfolio scan error:', error);
    return NextResponse.json(
      {
        error: 'Scan failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
