import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';

export const dynamic = 'force-dynamic';

// Verification wallet addresses (must match frontend)
const VERIFICATION_WALLET = {
  testnet: process.env.STELLARSENTINEL_WALLET_TESTNET || 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE',
  mainnet: process.env.STELLARSENTINEL_WALLET || 'GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX',
};
const VERIFICATION_FEE_XLM = 50;

// Generate VRF-XXXXXX format code (0,O,1,I,L hariç)
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'VRF-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Verify payment transaction on Stellar network
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
    
    // Check if payment is to correct address with correct amount
    const paymentOps = operations.records.filter((op: any) => {
      const isPayment = op.type === 'payment';
      const toCorrectWallet = op.to === expectedWallet;
      const hasEnoughAmount = parseFloat(op.amount) >= VERIFICATION_FEE_XLM;
      
      console.log('📦 Operation:', {
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

    console.log('✅ Payment verified successfully!');
    return true;
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, network, txHash, githubRepo, payerAddress } = body;

    console.log('=== PAYMENT VERIFICATION REQUEST ===');
    console.log('📥 Request:', { contractId, network, txHash: txHash?.slice(0, 16) + '...', githubRepo, payerAddress });

    // Validation
    if (!contractId || !network || !txHash || !githubRepo || !payerAddress) {
      const missing = {
        contractId: !contractId,
        network: !network,
        txHash: !txHash,
        githubRepo: !githubRepo,
        payerAddress: !payerAddress,
      };
      console.error('❌ Missing fields:', missing);
      return NextResponse.json(
        { success: false, error: 'All fields are required', missing },
        { status: 400 }
      );
    }

    // Validate contract ID format
    if (contractId.length !== 56 || !contractId.startsWith('C')) {
      console.error('❌ Invalid contract ID format:', contractId);
      return NextResponse.json(
        { success: false, error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    // Validate GitHub repo format
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    if (!githubRegex.test(githubRepo)) {
      console.error('❌ Invalid GitHub URL:', githubRepo);
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    // Verify payment on Stellar network
    console.log('🔄 Verifying payment on Stellar...');
    const paymentVerified = await verifyPayment(txHash, contractId, network);
    
    if (!paymentVerified) {
      console.error('❌ Payment verification failed');
      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Please ensure the transaction is correct.' },
        { status: 400 }
      );
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    console.log('🎫 Generated verification code:', code);
    console.log('⏰ Expires at:', expiresAt.toISOString());

    // Return success with code (no DB dependency)
    console.log('✅ Returning success response');
    
    return NextResponse.json({
      success: true,
      code,
      expiresAt: expiresAt.toISOString(),
      message: 'Payment verified! Add STELLARSENTINEL.md to your GitHub repo with this code.',
    });

  } catch (error: any) {
    console.error('=== PAYMENT ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Payment processing failed' },
      { status: 500 }
    );
  }
}
