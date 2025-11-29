'use client';

import { useState } from 'react';
import * as React from 'react';
import { Button } from '@/components/Button';

interface VerificationRequest {
  code: string;
  contractId: string;
  network: string;
  expiresAt: string;
}

export default function DeveloperPage() {
  const [contractId, setContractId] = useState('');
  const [network, setNetwork] = useState('testnet');
  const [loading, setLoading] = useState(false);
  const [verificationRequest, setVerificationRequest] = useState<VerificationRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCode = async () => {
    if (!contractId.trim()) {
      setError('Please enter a contract ID');
      return;
    }

    const trimmedId = contractId.trim();
    if (!trimmedId.startsWith('C') || trimmedId.length !== 56) {
      setError('Invalid contract ID format. Must start with "C" and be 56 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verify/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractId: trimmedId,
          network,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationRequest({
          code: data.code,
          contractId: trimmedId,
          network,
          expiresAt: new Date(Date.now() + data.expiresIn * 1000).toISOString(),
        });
      } else {
        setError(data.error || 'Failed to generate verification code');
      }
    } catch (err) {
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVerificationRequest(null);
    setContractId('');
    setError(null);
  };

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
              Verification Code Generated
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
            <div className="text-sm text-zinc-500 mt-2">Expires in 30 minutes</div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Run this command in your contract directory:</p>
              <div className="rounded-lg bg-zinc-900 p-4">
                <code className="text-sm text-emerald-400">
                  npx @devrunnel/argus-cli verify {verificationRequest.code}
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

  return (
    <div className="mx-auto max-w-2xl">
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
          Verify your Soroban smart contracts
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-8 ring-1 ring-zinc-900/10 dark:ring-white/10">
        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4">
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}

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
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-3">
              Network
            </label>
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="testnet"
                  checked={network === 'testnet'}
                  onChange={(e) => setNetwork(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Testnet</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="mainnet"
                  checked={network === 'mainnet'}
                  onChange={(e) => setNetwork(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Mainnet</span>
              </label>
            </div>
          </div>

          <Button
            onClick={handleGenerateCode}
            disabled={!contractId.trim() || loading}
            className="w-full justify-center"
          >
            {loading ? 'Generating...' : 'Generate Verification Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}

