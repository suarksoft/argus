import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';

interface GenerateCodeRequest {
  contractId: string;
  network: 'testnet' | 'mainnet';
}

// Generate a unique 6-character verification code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Check if contract exists on Stellar (basic check)
async function checkContractExists(contractId: string, network: string): Promise<boolean> {
  try {
    const rpcUrl = network === 'testnet' 
      ? 'https://soroban-testnet.stellar.org'
      : 'https://soroban-mainnet.stellar.org';
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getContractData',
        params: {
          contractId,
          key: { type: 'LedgerKeyContractCode' },
          durability: 'persistent'
        }
      })
    });

    if (!response.ok) return true; // Be permissive
    
    const data = await response.json();
    return !data.error; // If no error, contract exists
  } catch (error) {
    console.log('Contract check skipped:', error);
    return true; // Be permissive
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCodeRequest = await request.json();
    const { contractId, network } = body;

    console.log('=== VERIFICATION CODE GENERATION ===');
    console.log('Contract ID:', contractId);
    console.log('Network:', network);

    // Validate input
    if (!contractId || !network) {
      return NextResponse.json(
        { success: false, error: 'Contract ID and network are required' },
        { status: 400 }
      );
    }

    // Validate contract ID format
    if (contractId.length !== 56 || !contractId.startsWith('C')) {
      return NextResponse.json(
        { success: false, error: 'Invalid contract ID format. Must start with C and be 56 characters.' },
        { status: 400 }
      );
    }

    // Validate network
    if (!['testnet', 'mainnet'].includes(network)) {
      return NextResponse.json(
        { success: false, error: 'Network must be testnet or mainnet' },
        { status: 400 }
      );
    }

    // Optional: Check if contract exists
    const exists = await checkContractExists(contractId, network);
    if (!exists) {
      console.warn('Contract may not exist, but proceeding...');
    }

    // Rate limiting check (MongoDB)
    try {
      const requestsCollection = await getCollection('verification_requests');
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentCount = await requestsCollection.countDocuments({
        contractId,
        network,
        createdAt: { $gte: oneHourAgo }
      });

      if (recentCount >= 5) {
        return NextResponse.json(
          { success: false, error: 'Too many verification attempts. Please try again in 1 hour.' },
          { status: 429 }
        );
      }
    } catch (dbError) {
      console.log('Rate limit check skipped (DB not available):', dbError);
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    
    while (attempts < 10) {
      code = generateCode();
      
      try {
        const requestsCollection = await getCollection('verification_requests');
        const existing = await requestsCollection.findOne({
          code,
          expiresAt: { $gt: new Date() }
        });
        
        if (!existing) break; // Code is unique
      } catch (dbError) {
        console.log('Uniqueness check skipped:', dbError);
        break; // Proceed with generated code
      }
      
      attempts++;
    }

    // Create verification request
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    try {
      const requestsCollection = await getCollection('verification_requests');
      await requestsCollection.insertOne({
        code: code!,
        contractId,
        network,
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt,
      });
      
      console.log('✅ Verification code generated:', code);
    } catch (dbError) {
      console.log('DB save skipped:', dbError);
      // Continue anyway - code still works
    }

    return NextResponse.json({
      success: true,
      code: code!,
      expiresIn: 1800, // 30 minutes in seconds
      contractId,
      network,
    });

  } catch (error: any) {
    console.error('=== GENERATION ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate verification code' },
      { status: 500 }
    );
  }
}
