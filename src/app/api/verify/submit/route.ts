import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/server/mongodb';
import { fetchStellarSentinelFile, extractVerificationCode } from '@/lib/server/github';

export const dynamic = 'force-dynamic';

interface VerificationCheck {
  name: string;
  passed: boolean;
  message: string;
}

// Calculate security score based on checks and payload
function calculateSecurityScore(checks: VerificationCheck[], payload: any): number {
  let score = 100;

  // Critical checks: -30 each if failed
  const criticalChecks = ['WASM_MATCH', 'PUBLIC_SOURCE', 'SOURCE_FILES', 'BUILD_ENV'];
  criticalChecks.forEach(checkName => {
    const check = checks.find(c => c.name === checkName);
    if (check && !check.passed) {
      score -= 30;
    }
  });

  // WASM size check: -10 if suspicious
  const sizeCheck = checks.find(c => c.name === 'WASM_SIZE');
  if (sizeCheck && !sizeCheck.passed) {
    score -= 10;
  }

  // Additional factors
  if (!payload.gitRemote || !payload.gitRemote.includes('github.com')) {
    score -= 5; // No public repo
  }

  if (!payload.gitCommit) {
    score -= 5; // No commit hash
  }

  return Math.max(0, Math.min(100, score));
}

function runVerificationChecks(payload: any): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  // Check 1: WASM Hash (critical)
  checks.push({
    name: 'WASM_MATCH',
    passed: true, // Placeholder - gerçekte on-chain hash ile karşılaştır
    message: 'WASM hash verification (placeholder - implement on-chain check)',
  });

  // Check 2: Public Source (critical)
  const hasGitRemote = !!payload.gitRemote && payload.gitRemote.includes('github.com');
  checks.push({
    name: 'PUBLIC_SOURCE',
    passed: hasGitRemote,
    message: hasGitRemote 
      ? `Source code available at ${payload.gitRemote}`
      : 'No public GitHub repository found',
  });

  // Check 3: Source Files (critical)
  const reasonableFileCount = payload.sourceFiles.length >= 1 && payload.sourceFiles.length <= 1000;
  checks.push({
    name: 'SOURCE_FILES',
    passed: reasonableFileCount,
    message: `${payload.sourceFiles.length} source files${reasonableFileCount ? ' (reasonable)' : ' (suspicious)'}`,
  });

  // Check 4: Build Environment (critical)
  const validBuildEnv = !!payload.rustVersion && !!payload.sorobanVersion;
  checks.push({
    name: 'BUILD_ENV',
    passed: validBuildEnv,
    message: validBuildEnv
      ? `Built with ${payload.rustVersion}, ${payload.sorobanVersion}`
      : 'Invalid or missing build environment information',
  });

  // Check 5: WASM Size (warning)
  const reasonableSize = payload.wasmSize > 100 && payload.wasmSize < 10 * 1024 * 1024;
  checks.push({
    name: 'WASM_SIZE',
    passed: reasonableSize,
    message: `WASM size: ${(payload.wasmSize / 1024).toFixed(1)}KB${reasonableSize ? ' (reasonable)' : ' (suspicious)'}`,
  });

  return checks;
}

export async function POST(request: NextRequest) {
  try {
    const code = request.headers.get('X-Verification-Code') || request.headers.get('x-verification-code');
    
    console.log('=== VERIFICATION SUBMISSION ===');
    console.log('Code:', code);

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Verification code header is required' },
        { status: 400 }
      );
    }

    const payload = await request.json();
    console.log('Payload:', {
      contractName: payload.contractName,
      wasmSize: payload.wasmSize,
      sourceFiles: payload.sourceFiles?.length,
    });

    // Validate payload
    if (!payload.wasmHash || !payload.sourceHash || !payload.contractName) {
      return NextResponse.json(
        { success: false, error: 'Missing required verification data' },
        { status: 400 }
      );
    }

    try {
      // Find verification request
      const requestsCollection = await getCollection('verification_requests');
      const verificationRequest = await requestsCollection.findOne({ code });

      if (!verificationRequest) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // Check if expired
      if (new Date(verificationRequest.expiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Verification code has expired' },
          { status: 400 }
        );
      }

      // Check if already used
      if (verificationRequest.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Verification code has already been used' },
          { status: 400 }
        );
      }

      // Check GitHub STELLARSENTINEL.md file
      if (verificationRequest.githubRepo) {
        console.log('Checking GitHub repo:', verificationRequest.githubRepo);
        const sentinelFile = await fetchStellarSentinelFile(verificationRequest.githubRepo);
        
        if (!sentinelFile) {
          return NextResponse.json(
            { success: false, error: 'STELLARSENTINEL.md file not found in GitHub repository. Please add the file with your verification code.' },
            { status: 400 }
          );
        }

        // Extract code from file
        const fileCode = extractVerificationCode(sentinelFile.content);
        if (!fileCode || fileCode !== code) {
          return NextResponse.json(
            { success: false, error: `Verification code mismatch. Found "${fileCode}" in STELLARSENTINEL.md, expected "${code}".` },
            { status: 400 }
          );
        }

        console.log('✅ GitHub verification code matches');
      }

      // Run verification checks
      const checks = runVerificationChecks(payload);
      
      // Determine if verification passed
      const criticalChecks = ['WASM_MATCH', 'PUBLIC_SOURCE', 'SOURCE_FILES', 'BUILD_ENV'];
      const criticalCheckResults = checks.filter(check => criticalChecks.includes(check.name));
      const verified = criticalCheckResults.every(check => check.passed);

      console.log('Verification result:', verified ? 'PASSED' : 'FAILED');
      console.log('Checks:', checks.map(c => `${c.name}: ${c.passed ? 'PASS' : 'FAIL'}`));

      // Calculate security score (0-100)
      const securityScore = calculateSecurityScore(checks, payload);

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (securityScore >= 90) riskLevel = 'LOW';
      else if (securityScore >= 70) riskLevel = 'MEDIUM';
      else if (securityScore >= 50) riskLevel = 'HIGH';
      else riskLevel = 'CRITICAL';

      // Save to verified_contracts collection
      const verifiedContractsCollection = await getCollection('verified_contracts');
      await verifiedContractsCollection.updateOne(
        { 
          contractId: verificationRequest.contractId,
          network: verificationRequest.network 
        },
        {
          $set: {
            contractId: verificationRequest.contractId,
            network: verificationRequest.network,
            dappId: null, // Can be linked later
            name: payload.contractName,
            description: payload.description || '',
            githubRepo: verificationRequest.githubRepo || payload.gitRemote,
            githubCommit: payload.gitCommit,
            compilerVersion: `${payload.rustVersion} / ${payload.sorobanVersion}`,
            securityScore,
            riskLevel,
            verifiedBy: 'cli-tool',
            isAudited: false,
            auditUrl: null,
            viewCount: 0,
            trustCount: 0,
            wasmHash: payload.wasmHash,
            wasmSize: payload.wasmSize,
            sourceHash: payload.sourceHash,
            sourceFiles: payload.sourceFiles,
            verificationChecks: Object.fromEntries(
              checks.map(c => [c.name, c.passed])
            ),
            verifiedAt: new Date(),
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );

      // Update request status
      await requestsCollection.updateOne(
        { code },
        {
          $set: {
            status: 'COMPLETED',
            verifiedAt: new Date(),
          }
        }
      );

      console.log('✅ Verification saved to database');

      return NextResponse.json({
        success: true,
        verified,
        checks,
        message: verified 
          ? 'Contract verification completed successfully!'
          : 'Contract verification completed with warnings.',
        contractId: verificationRequest.contractId,
        network: verificationRequest.network,
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      // Return success even if DB fails (graceful degradation)
      const checks = runVerificationChecks(payload);
      const verified = checks.filter(c => 
        ['WASM_MATCH', 'PUBLIC_SOURCE', 'SOURCE_FILES', 'BUILD_ENV'].includes(c.name)
      ).every(c => c.passed);

      return NextResponse.json({
        success: true,
        verified,
        checks,
        message: verified 
          ? 'Verification completed (database save failed)'
          : 'Verification completed with warnings (database save failed)',
        warning: 'Results not persisted to database',
      });
    }

  } catch (error: any) {
    console.error('=== SUBMISSION ERROR ===');
    console.error(error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
