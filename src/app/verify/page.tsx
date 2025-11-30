'use client';

import { useState, useEffect, useCallback } from 'react';
import * as React from 'react';
import { Button } from '@/components/Button';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useVerificationPayment, VERIFICATION_FEE_XLM } from '@/hooks/useVerificationPayment';

interface VerificationRequest {
  code: string;
  contractId: string;
  network: string;
  expiresAt: string;
  paymentTxHash?: string;
}

type Step = 'contract' | 'wallet' | 'payment' | 'code';

export default function VerifyPage() {
  const [contractId, setContractId] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [loading, setLoading] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('contract');

  // Wallet connection
  const { isConnected, wallet, isConnecting, connect, disconnect, error: walletError } = useWalletConnect();

  // Payment
  const { 
    isPaying, 
    isPaid, 
    paymentTxHash, 
    payVerificationFee, 
    resetPayment,
    error: paymentError 
  } = useVerificationPayment();

  // Verify payment and generate code
  const handleVerifyPayment = useCallback(async () => {
    console.log('=== HANDLE VERIFY PAYMENT START ===');
    console.log('Current state:', {
      wallet: wallet?.publicKey,
      paymentTxHash,
      contractId,
      githubRepo,
      network,
      loading,
    });

    if (!wallet || !paymentTxHash) {
      console.log('❌ Missing wallet or paymentTxHash');
      return;
    }

    const trimmedId = contractId.trim();
    const trimmedRepo = githubRepo.trim();

    if (!trimmedId || !trimmedRepo) {
      console.error('❌ Missing contract ID or GitHub repo');
      setError('Contract ID and GitHub repo are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        contractId: trimmedId,
        network,
        txHash: paymentTxHash,
        githubRepo: trimmedRepo,
        payerAddress: wallet.publicKey,
      };

      console.log('📤 Sending payment verification request:', requestBody);

      const response = await fetch('/api/verify/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (data.success) {
        console.log('✅ Success! Setting verification request...');
        setVerificationRequest({
          code: data.code,
          contractId: trimmedId,
          network,
          expiresAt: data.expiresAt,
          paymentTxHash: paymentTxHash,
        });
        console.log('✅ Verification code generated:', data.code);
      } else {
        console.error('❌ Verification failed:', data.error);
        setError(data.error || 'Failed to verify payment and generate code');
        if (data.missing) {
          console.error('Missing fields:', data.missing);
        }
      }
    } catch (err: any) {
      console.error('❌ Verification API error:', err);
      setError('Cannot connect to server: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      console.log('=== HANDLE VERIFY PAYMENT END ===');
    }
  }, [wallet, paymentTxHash, contractId, githubRepo, network, setError, setLoading, setVerificationRequest]);

  // Update step based on state
  useEffect(() => {
    if (verificationRequest) {
      setCurrentStep('code');
    } else if (isPaid && paymentTxHash) {
      // Ready to generate code
    } else if (isConnected && wallet && currentStep !== 'contract') {
      // Only auto-advance to payment if we're not on contract step
      // This prevents auto-advancing when user is still entering contract details
      if (currentStep === 'wallet') {
        setCurrentStep('payment');
      }
    }
    // Don't auto-advance from contract to wallet - user must click button
    // This ensures GitHub repo can be entered before moving to wallet step
  }, [isConnected, wallet, isPaid, paymentTxHash, verificationRequest, currentStep]);

  // Auto-verify payment after successful payment (ONCE)
  useEffect(() => {
    const checks = {
      'isPaid': isPaid,
      'hasPaymentTxHash': !!paymentTxHash,
      'paymentTxHash': paymentTxHash,
      'NO verificationRequest': !verificationRequest,
      'hasWallet': !!wallet,
      'NOT loading': !loading,
      'hasContractId': !!contractId.trim(),
      'contractId': contractId,
      'hasGithubRepo': !!githubRepo.trim(),
      'githubRepo': githubRepo,
    };
    
    console.log('=== useEffect CHECK ===');
    Object.entries(checks).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`${status} ${key}:`, value);
    });

    // Strict checks to prevent multiple calls
    if (
      isPaid && 
      paymentTxHash && 
      !verificationRequest && 
      wallet && 
      !loading &&
      contractId.trim() &&
      githubRepo.trim()
    ) {
      console.log('🎯 === AUTO-VERIFY TRIGGERED ===');
      console.log('Payment TX:', paymentTxHash);
      console.log('Contract ID:', contractId.trim());
      console.log('GitHub Repo:', githubRepo.trim());
      
      // Call only once
      handleVerifyPayment();
    } else {
      console.log('❌ Auto-verify NOT triggered - check conditions above');
    }
  }, [isPaid, paymentTxHash, verificationRequest, wallet, loading, contractId, githubRepo, handleVerifyPayment]);

  const handleContractSubmit = () => {
    const trimmedId = contractId.trim();
    const trimmedRepo = githubRepo.trim();
    
    if (!trimmedId) {
      setError('Please enter a contract ID');
      return;
    }
    if (!trimmedId.startsWith('C') || trimmedId.length !== 56) {
      setError('Invalid contract ID format. Must start with "C" and be 56 characters long.');
      return;
    }
    if (!trimmedRepo) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/;
    if (!githubRegex.test(trimmedRepo)) {
      setError('Invalid GitHub repository URL. Format: https://github.com/owner/repo');
      return;
    }
    setError(null);
    setCurrentStep('wallet');
  };

  const handleConnectWallet = async () => {
    try {
      await connect('freighter');
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handlePayment = async () => {
    if (!wallet) {
      setError('Wallet not connected');
      return;
    }

    const trimmedId = contractId.trim();
    if (!trimmedId) {
      setError('Contract ID is required');
      return;
    }

    setError(null);

    try {
      console.log('Starting payment...', {
        network,
        contractId: trimmedId,
        wallet: wallet.publicKey,
      });

      // Pay verification fee with contract ID for memo
      const result = await payVerificationFee(network, trimmedId);
      
      console.log('Payment result:', result);
      console.log('Payment TX Hash:', result.txHash);
      
      // Payment successful - useEffect will trigger handleVerifyPayment
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
    }
  };

  const handleReset = () => {
    setVerificationRequest(null);
    setContractId('');
    setGithubRepo('');
    setError(null);
    resetPayment();
    setCurrentStep('contract');
  };

  // Show verification code result
  if (verificationRequest) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 p-8 ring-1 ring-zinc-900/10 dark:ring-white/10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
              <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Payment Confirmed - Code Generated
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Contract ID: {verificationRequest.contractId.slice(0, 12)}...
            </p>
          </div>

          <div className="mb-8 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-500/30 p-6 text-center">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Your Verification Code</div>
            <div className="text-5xl font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.5em]">
              {verificationRequest.code}
            </div>
            <div className="text-sm text-zinc-500 mt-2">Expires in 24 hours</div>
          </div>

          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Next Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li>Create a file named <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">STELLARSENTINEL.md</code> in your GitHub repo root</li>
              <li>Add this code to the file: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-mono">{verificationRequest.code}</code></li>
              <li>Commit and push to your repository</li>
              <li>Run: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded font-mono">npx argus-stellar-cli verify {verificationRequest.code}</code></li>
            </ol>
          </div>

          {verificationRequest.paymentTxHash && (
            <div className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Payment Transaction</div>
              <a 
                href={`https://stellar.expert/explorer/${network}/tx/${verificationRequest.paymentTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
              >
                {verificationRequest.paymentTxHash.slice(0, 16)}...
              </a>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Run this command in your contract directory:</p>
              <div className="rounded-lg bg-zinc-900 p-4">
                <code className="text-sm text-emerald-400">
                  npx argus-stellar-cli verify {verificationRequest.code}
                </code>
              </div>
            </div>
          </div>

          <Button onClick={handleReset} className="w-full">
            Verify Another Contract
          </Button>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'contract', label: 'Enter Contract', number: 1 },
    { key: 'wallet', label: 'Connect Wallet', number: 2 },
    { key: 'payment', label: 'Pay Fee', number: 3 },
    { key: 'code', label: 'Get Code', number: 4 },
  ];

  const getStepStatus = (stepKey: string) => {
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
          <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-2.25 0L21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Contract Verification
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Verify your Soroban smart contracts and earn a verified badge
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                  getStepStatus(step.key) === 'completed' 
                    ? 'bg-emerald-500 text-white'
                    : getStepStatus(step.key) === 'current'
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {getStepStatus(step.key) === 'completed' ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  getStepStatus(step.key) === 'current' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`mx-4 h-0.5 w-16 ${
                  getStepStatus(steps[index + 1].key) === 'completed' || getStepStatus(steps[index + 1].key) === 'current'
                    ? 'bg-emerald-500'
                    : 'bg-zinc-200 dark:bg-zinc-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Multi-step Form */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 p-8 ring-1 ring-zinc-900/10 dark:ring-white/10">
          {/* Error Display */}
          {(error || walletError || paymentError) && (
            <div className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4">
              <p className="text-sm text-rose-700 dark:text-rose-300">{error || walletError || paymentError}</p>
            </div>
          )}

          {/* Step 1: Contract ID */}
          {currentStep === 'contract' && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
                Step 1: Enter Contract Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="contractId" className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                      Contract ID
                  </label>
                  <input
                    type="text"
                    id="contractId"
                    placeholder="CABCDEF123456789..."
                    value={contractId}
                    onChange={(e) => setContractId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="githubRepo" className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                    GitHub Repository URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="githubRepo"
                    placeholder="https://github.com/owner/repo"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Public repository where you'll add STELLARSENTINEL.md
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-3">
                    Network
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="testnet"
                        checked={network === 'testnet'}
                        onChange={(e) => setNetwork(e.target.value as 'testnet' | 'mainnet')}
                        className="mr-2"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Testnet</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="mainnet"
                        checked={network === 'mainnet'}
                        onChange={(e) => setNetwork(e.target.value as 'testnet' | 'mainnet')}
                        className="mr-2"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Mainnet</span>
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleContractSubmit}
                  disabled={!contractId.trim() || !githubRepo.trim()}
                  className="w-full justify-center"
                >
                  Continue to Wallet Connection
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Connect Wallet */}
          {currentStep === 'wallet' && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
                Step 2: Connect Your Wallet
              </h2>
              
              <div className="mb-6 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Contract ID</div>
                <div className="text-sm font-mono text-zinc-900 dark:text-white truncate">{contractId}</div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Connect your Freighter wallet to pay the verification fee.
                </p>

                <Button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="w-full justify-center"
                >
                  {isConnecting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Connect Freighter Wallet
                    </>
                  )}
                </Button>

                <button 
                  onClick={() => setCurrentStep('contract')}
                  className="w-full text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Back to Contract Details
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 'payment' && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6">
                Step 3: Pay Verification Fee
              </h2>
              
              <div className="mb-6 space-y-3">
                <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Contract ID</div>
                  <div className="text-sm font-mono text-zinc-900 dark:text-white truncate">{contractId}</div>
                </div>
                <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Connected Wallet</div>
                  <div className="text-sm font-mono text-zinc-900 dark:text-white truncate">{wallet?.publicKey}</div>
                </div>
              </div>

              <div className="mb-6 p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-500/30">
                <div className="text-center">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Verification Fee</div>
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                    {VERIFICATION_FEE_XLM} XLM
                  </div>
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    One-time payment per contract verification
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handlePayment}
                  disabled={isPaying || loading}
                  className="w-full justify-center"
                >
                  {isPaying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing Payment...
                    </>
                  ) : loading ? (
                    'Generating Code...'
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pay {VERIFICATION_FEE_XLM} XLM & Get Code
                    </>
                  )}
                </Button>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setCurrentStep('wallet')}
                    className="flex-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Back
                  </button>
                  <button 
                    onClick={disconnect}
                    className="flex-1 text-sm text-rose-500 hover:text-rose-700"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info Panel */}
        <div className="space-y-6">
          {/* Pricing Info */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white">
            <h3 className="text-xl font-semibold mb-4">Verification Pricing</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold">{VERIFICATION_FEE_XLM}</span>
              <span className="text-xl">XLM</span>
            </div>
            <p className="text-emerald-100 mb-4">
              One-time fee per contract verification. Covers unlimited re-verifications.
            </p>
            <ul className="space-y-2 text-sm text-emerald-100">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Verified badge on Argus
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Public source code listing
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                WASM hash verification
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Build environment record
              </li>
            </ul>
          </div>

          {/* CLI Instructions */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">After Payment</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Once you receive your verification code, run the CLI in your contract directory:
            </p>
            <div className="rounded-lg bg-zinc-950 p-4 font-mono text-sm">
              <code className="text-emerald-400">npx argus-stellar-cli verify YOUR_CODE</code>
            </div>
            <a
              href="https://www.npmjs.com/package/argus-stellar-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View CLI on npm
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Requirements */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-6 ring-1 ring-zinc-900/5 dark:ring-white/5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Requirements</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Freighter wallet with {VERIFICATION_FEE_XLM}+ XLM
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Deployed Soroban contract (testnet/mainnet)
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Built WASM file (soroban contract build)
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Public GitHub repository
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mt-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-8 ring-1 ring-zinc-900/5 dark:ring-white/5">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-6 text-center">
          How Verification Works
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold">1</div>
            <h3 className="font-medium text-zinc-900 dark:text-white mb-1">Enter Contract</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Provide your deployed contract ID, GitHub repo, and network</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold">2</div>
            <h3 className="font-medium text-zinc-900 dark:text-white mb-1">Pay Fee</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Connect wallet and pay {VERIFICATION_FEE_XLM} XLM verification fee</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold">3</div>
            <h3 className="font-medium text-zinc-900 dark:text-white mb-1">Add Code</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Add STELLARSENTINEL.md to your GitHub repo with the code</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold">4</div>
            <h3 className="font-medium text-zinc-900 dark:text-white mb-1">Run CLI</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Execute the CLI to complete verification</p>
          </div>
        </div>
      </div>
    </div>
  );
}

