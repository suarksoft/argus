import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';
import * as StellarSdk from '@stellar/stellar-sdk';

export const dynamic = 'force-dynamic';

// Verification wallet addresses (must match frontend)
const VERIFICATION_WALLET = {
  testnet: process.env.STELLARSENTINEL_WALLET_TESTNET || 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
  mainnet: process.env.STELLARSENTINEL_WALLET || 'GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX',
};
const VERIFICATION_FEE_XLM = 50;

// Verify payment transaction
async function verifyPayment(txHash: string, contractId: string, network: 'testnet' | 'mainnet'): Promise<boolean> {
  try {
    const server = new StellarSdk.Horizon.Server(
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );

    console.log('🔍 Verifying payment:', { txHash, contractId, network });

    const transaction = await server.transactions().transaction(txHash).call();
    console.log('📜 Transaction found:', { 
      hash: transaction.hash,
      memo: transaction.memo,
      memo_type: transaction.memo_type,
    });
    
    // Get operations for this transaction
    const operations = await server.operations().forTransaction(txHash).call();
    
    // Get correct wallet for network
    const expectedWallet = VERIFICATION_WALLET[network];
    console.log('💰 Looking for payment to:', expectedWallet);
    
    // Check if payment is to correct address
    const paymentOps = operations.records.filter((op: any) => {
      const isPayment = op.type === 'payment';
      const toCorrectWallet = op.to === expectedWallet;
      const hasEnoughAmount = parseFloat(op.amount) >= VERIFICATION_FEE_XLM;
      
      console.log('📦 Operation check:', {
        type: op.type,
        to: op.to,
        amount: op.amount,
        isPayment,
        toCorrectWallet,
        hasEnoughAmount,
      });
      
      return isPayment && toCorrectWallet && hasEnoughAmount;
    });

    if (paymentOps.length === 0) {
      console.log('❌ No valid payment operation found');
      return false;
    }

    console.log('✅ Found valid payment operation');

    // Check memo format: VERIFY:CONTRACT_ID_ILK_10_KARAKTER
    const memo = transaction.memo;
    const expectedMemoStart = `VERIFY:${contractId.slice(0, 10)}`;
    
    console.log('📝 Memo check:', {
      actualMemo: memo,
      expectedStart: expectedMemoStart,
      memoType: transaction.memo_type,
    });
    
    // Accept if memo matches (be flexible with memo format)
    if (memo) {
      const memoStr = memo.toString();
      if (memoStr.includes('VERIFY:') && memoStr.includes(contractId.slice(0, 10))) {
        console.log('✅ Memo verified');
        return true;
      }
    }

    // Also accept if no memo required (for testing)
    if (process.env.NODE_ENV === 'development' || network === 'testnet') {
      console.log('⚠️ Memo not matching but accepting for testnet');
      return true;
    }

    console.log('❌ Memo verification failed');
    return false;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, network, txHash, githubRepo, payerAddress } = body;

    console.log('=== VERIFICATION PAYMENT ===');
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Validation
    if (!contractId || !network || !txHash || !githubRepo || !payerAddress) {
      console.error('Missing fields:', {
        contractId: !!contractId,
        network: !!network,
        txHash: !!txHash,
        githubRepo: !!githubRepo,
        payerAddress: !!payerAddress,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'All fields are required',
          missing: {
            contractId: !contractId,
            network: !network,
            txHash: !txHash,
            githubRepo: !githubRepo,
            payerAddress: !payerAddress,
          }
        },
        { status: 400 }
      );
    }

    // Validate contract ID
    if (contractId.length !== 56 || !contractId.startsWith('C')) {
      return NextResponse.json(
        { success: false, error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    // Validate GitHub repo format
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    if (!githubRegex.test(githubRepo)) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    // Verify payment
    const paymentVerified = await verifyPayment(txHash, contractId, network);
    if (!paymentVerified) {
      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Please ensure the transaction is correct.' },
        { status: 400 }
      );
    }

    // Check if already paid
    try {
      const paymentsCollection = await getCollection('verification_payments');
      const existingPayment = await paymentsCollection.findOne({
        contractId,
        network,
        status: 'paid',
      });

      if (existingPayment) {
      return NextResponse.json(
          { success: false, error: 'This contract already has a paid verification' },
        { status: 400 }
      );
    }

      // Save payment record
      await paymentsCollection.insertOne({
        contractId,
        network,
        payerAddress,
        txHash,
        amountXlm: VERIFICATION_FEE_XLM,
        githubRepo,
        status: 'paid',
        createdAt: new Date(),
      });

      console.log('✅ Payment recorded');

      // Generate verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save verification request
      const requestsCollection = await getCollection('verification_requests');
      await requestsCollection.insertOne({
        code,
        contractId,
        network,
        githubRepo,
        payerAddress,
        paymentTxHash: txHash,
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt,
      });

      console.log('✅ Verification code generated:', code);

      return NextResponse.json({
        success: true,
        code,
        expiresAt: expiresAt.toISOString(),
        message: 'Payment verified. Add STELLARSENTINEL.md to your GitHub repo with this code.',
    });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to process payment' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('=== PAYMENT ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}

// Generate VRF-XXXXXX format code (0,O,1,I,L hariç)
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0,O,1,I,L
  let code = 'VRF-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
