import { NextRequest, NextResponse } from 'next/server';

interface ContractDetails {
  contractId: string;
  network: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  checks?: any[];
  wasmHash?: string;
  wasmSize?: number;
  sourceHash?: string;
  sourceFiles?: string[];
  gitCommit?: string;
  gitRemote?: string;
  gitBranch?: string;
  rustVersion?: string;
  sorobanVersion?: string;
  contractName?: string;
  metadata?: {
    name?: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
    documentationUrl?: string;
    auditReportUrl?: string;
    license?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'testnet';

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    // Validate contract ID format
    if (contractId.length !== 56 || !contractId.startsWith('C')) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    // Mock verification data - PostgreSQL entegrasyonu için
    const isVerified = contractId === 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    
    if (!isVerified) {
      return NextResponse.json({
        contractId,
        network,
        verified: false,
        metadata: null,
        message: 'Contract not verified'
      });
    }

    const response: ContractDetails = {
      contractId,
      network,
      verified: true,
      verifiedAt: '2024-01-01T00:00:00Z',
      verifiedBy: 'argus-cli',
      checks: [
        { name: 'WASM Hash Match', passed: true, message: 'WASM binary matches source code' },
        { name: 'Source Code Available', passed: true, message: 'Source code is publicly accessible' },
        { name: 'Build Environment', passed: true, message: 'Build environment is reproducible' }
      ],
      wasmHash: 'abc123def456...',
      wasmSize: 1024,
      sourceHash: 'def456abc123...',
      sourceFiles: ['src/lib.rs', 'src/contract.rs'],
      gitCommit: 'a1b2c3d4e5f6...',
      gitRemote: 'https://github.com/example/contract',
      gitBranch: 'main',
      rustVersion: '1.70.0',
      sorobanVersion: '20.0.0',
      contractName: 'Example Contract',
      metadata: {
        name: 'Example Smart Contract',
        description: 'A verified smart contract example',
        logoUrl: 'https://example.com/logo.png',
        websiteUrl: 'https://example.com',
        documentationUrl: 'https://docs.example.com',
        license: 'MIT'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Contract details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update contract metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') || 'testnet';
    
    const metadata = await request.json();

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    // Validate contract ID format
    if (contractId.length !== 56 || !contractId.startsWith('C')) {
      return NextResponse.json(
        { error: 'Invalid contract ID format' },
        { status: 400 }
      );
    }

    // Check if contract is verified (only verified contracts can have metadata updated)
    const isVerified = contractId === 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
    
    if (!isVerified) {
      return NextResponse.json(
        { error: 'Only verified contracts can have metadata updated' },
        { status: 403 }
      );
    }

    // Mock metadata update - PostgreSQL entegrasyonu için
    const updatedMetadata = {
      contract_id: contractId,
      network,
      name: metadata.name,
      description: metadata.description,
      logo_url: metadata.logoUrl,
      website_url: metadata.websiteUrl,
      documentation_url: metadata.documentationUrl,
      audit_report_url: metadata.auditReportUrl,
      license: metadata.license,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      metadata: updatedMetadata,
    });

  } catch (error) {
    console.error('Metadata update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
