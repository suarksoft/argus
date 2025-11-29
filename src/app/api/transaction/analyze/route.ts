import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TransactionAnalyzer } from '@/lib/transaction/transaction-analyzer';
import { AssetAnalyzer } from '@/lib/analyzer/asset-analyzer';
import { TransactionParser } from '@/lib/transaction/parser';
import * as StellarSdk from '@stellar/stellar-sdk';

const requestSchema = z.object({
  xdr: z.string().min(1, 'XDR string is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { xdr } = requestSchema.parse(body);

    // Parse the XDR
    const transaction = TransactionParser.parseXDR(xdr, StellarSdk.Networks.TESTNET);
    const operations = TransactionParser.parseOperations(transaction);

    // Analyze the transaction
    const assetAnalyzer = new AssetAnalyzer();
    const analyzer = new TransactionAnalyzer(assetAnalyzer);
    const analysis = await analyzer.analyzeTransaction(
      transaction.source,
      transaction.fee,
      operations
    );

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Analysis failed', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
