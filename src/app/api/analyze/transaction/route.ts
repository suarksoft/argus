import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StellarClient } from '@/lib/stellar/client';
import { TransactionParser } from '@/lib/transaction/parser';
import { TransactionAnalyzer } from '@/lib/transaction/transaction-analyzer';
import { AssetAnalyzer } from '@/lib/analyzer/asset-analyzer';
import * as StellarSdk from '@stellar/stellar-sdk';

const AnalyzeTransactionSchema = z.object({
  xdr: z.string().optional(),
  hash: z.string().optional(),
}).refine((data) => data.xdr || data.hash, {
  message: 'Either xdr or hash must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = AnalyzeTransactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { xdr, hash } = validation.data;

    // Initialize analyzers
    const assetAnalyzer = new AssetAnalyzer();
    const transactionAnalyzer = new TransactionAnalyzer(assetAnalyzer);
    const stellarClient = new StellarClient();

    let transaction: StellarSdk.Transaction;
    let transactionHash: string | undefined;

    // Parse or fetch transaction
    if (xdr) {
      // Parse XDR
      const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'testnet'
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;
      
      transaction = TransactionParser.parseXDR(xdr, networkPassphrase);
    } else if (hash) {
      // Fetch transaction from network
      try {
        const txRecord = await stellarClient.getTransaction(hash);
        const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'testnet'
          ? StellarSdk.Networks.TESTNET
          : StellarSdk.Networks.PUBLIC;
        
        transaction = TransactionParser.parseXDR(txRecord.envelope_xdr, networkPassphrase);
        transactionHash = hash;
      } catch (error) {
        return NextResponse.json(
          { error: 'Transaction not found', message: 'Could not fetch transaction from network' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid input', message: 'XDR or hash required' },
        { status: 400 }
      );
    }

    // Parse operations
    const parsedOperations = TransactionParser.parseOperations(transaction);

    // Analyze transaction (with simulation)
    const analysis = await transactionAnalyzer.analyzeTransaction(
      transaction.source,
      transaction.fee,
      parsedOperations,
      transaction
    );

    // Add transaction hash if available
    if (transactionHash) {
      analysis.transactionHash = transactionHash;
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Transaction analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
