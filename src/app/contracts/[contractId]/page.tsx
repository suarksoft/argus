'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ContractDetail {
  _id: string;
  contractId: string;
  network: string;
  name: string;
  description: string;
  githubRepo?: string;
  githubCommit?: string;
  compilerVersion: string;
  securityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  verifiedAt: string;
  verifiedBy: string;
  isAudited: boolean;
  auditUrl?: string;
  viewCount: number;
  trustCount: number;
  wasmHash?: string;
  wasmSize?: number;
  sourceHash?: string;
  sourceFiles: string[];
  verificationChecks: Record<string, boolean>;
  dappId?: string;
}

const RISK_COLORS = {
  LOW: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  MEDIUM: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  CRITICAL: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
};

export default function ContractDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contractId = params.contractId as string;
  const network = searchParams.get('network') || 'testnet';

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'source' | 'read' | 'write'>('overview');

  useEffect(() => {
    if (contractId) {
      fetchContract();
    }
  }, [contractId, network]);

  const fetchContract = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}?network=${network}`);
      const data = await response.json();

      if (data.success) {
        setContract(data.contract);
      } else {
        setError(data.error || 'Contract not found');
      }
    } catch (err) {
      setError('Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Contract not found'}</p>
        <Link href="/contracts" className="text-emerald-400 hover:underline">
          ← Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/contracts" className="text-emerald-400 hover:underline text-sm mb-4 inline-block">
          ← Back to Contracts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
              {contract.name}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mb-4">
              {contract.contractId}
            </p>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${RISK_COLORS[contract.riskLevel]}`}>
                {contract.riskLevel} Risk
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                ✓ Verified
              </span>
              {contract.isAudited && (
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  ✓ Audited
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
              {contract.securityScore}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Security Score</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4">
          {(['overview', 'source', 'read', 'write'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {contract.description && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Description</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{contract.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Network</div>
                <div className="font-semibold text-zinc-900 dark:text-white capitalize">{contract.network}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Compiler</div>
                <div className="font-semibold text-zinc-900 dark:text-white text-sm">{contract.compilerVersion}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Views</div>
                <div className="font-semibold text-zinc-900 dark:text-white">{contract.viewCount}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Verified</div>
                <div className="font-semibold text-zinc-900 dark:text-white text-sm">
                  {new Date(contract.verifiedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {contract.githubRepo && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Source Code</h3>
                <a
                  href={contract.githubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {contract.githubRepo}
                </a>
                {contract.githubCommit && (
                  <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                    Commit: {contract.githubCommit.slice(0, 8)}
                  </div>
                )}
              </div>
            )}

            {contract.verificationChecks && Object.keys(contract.verificationChecks).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-3">Verification Checks</h3>
                <div className="space-y-2">
                  {Object.entries(contract.verificationChecks).map(([check, passed]) => (
                    <div key={check} className="flex items-center gap-2">
                      {passed ? (
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {check.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'source' && (
          <div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Source code is available in the GitHub repository.
            </p>
            {contract.githubRepo ? (
              <a
                href={contract.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                View Source Code on GitHub
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">No GitHub repository linked</p>
            )}
          </div>
        )}

        {activeTab === 'read' && (
          <div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Read contract functions (view-only operations).
            </p>
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Read functions will be available after contract ABI parsing is implemented.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'write' && (
          <div>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Write contract functions (state-changing operations). Connect your wallet to interact.
            </p>
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Write functions will be available after contract ABI parsing and wallet integration.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

