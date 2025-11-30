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

interface AIAnalysis {
  contractId: string;
  network: string;
  githubRepo: string;
  analysis: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    summary: string;
    securityIssues: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      location?: string;
      recommendation: string;
    }[];
    bestPractices: {
      followed: boolean;
      practice: string;
      details: string;
    }[];
    recommendations: string[];
    gasOptimizations: string[];
    codeQuality: {
      score: number;
      notes: string[];
    };
  };
  analyzedAt: string;
  aiModel: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-analysis' | 'source' | 'read' | 'write'>('overview');
  
  // AI Analysis state
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  useEffect(() => {
    if (contractId) {
      fetchContract();
    }
  }, [contractId, network]);

  // Fetch AI analysis when tab is clicked
  const fetchAIAnalysis = async (forceRefresh = false) => {
    if (!contract?.githubRepo) {
      setAIError('No GitHub repository linked to this contract');
      return;
    }

    setAILoading(true);
    setAIError(null);

    try {
      const response = await fetch('/api/contract/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          network,
          githubRepo: contract.githubRepo,
          forceRefresh,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setAIAnalysis(data.analysis);
      } else {
        setAIError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setAIError('Failed to analyze contract');
    } finally {
      setAILoading(false);
    }
  };

  // Auto-fetch AI analysis when switching to that tab
  useEffect(() => {
    if (activeTab === 'ai-analysis' && !aiAnalysis && !aiLoading && contract?.githubRepo) {
      fetchAIAnalysis();
    }
  }, [activeTab, contract]);

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
          {(['overview', 'ai-analysis', 'source', 'read', 'write'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              {tab === 'ai-analysis' ? '🤖 AI Analysis' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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

        {activeTab === 'ai-analysis' && (
          <div className="space-y-6">
            {/* Header with refresh button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">AI Security Analysis</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Powered by GPT-4o - Automated smart contract security review
                </p>
              </div>
              <button
                onClick={() => fetchAIAnalysis(true)}
                disabled={aiLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>🔄 Re-analyze</>
                )}
              </button>
            </div>

            {/* Loading state */}
            {aiLoading && !aiAnalysis && (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="animate-spin h-12 w-12 text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-zinc-600 dark:text-zinc-400">Analyzing contract with AI...</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">This may take 30-60 seconds</p>
              </div>
            )}

            {/* Error state */}
            {aiError && (
              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p className="text-rose-700 dark:text-rose-300">{aiError}</p>
              </div>
            )}

            {/* Analysis results */}
            {aiAnalysis && (
              <div className="space-y-6">
                {/* Risk Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${
                    aiAnalysis.analysis.overallRisk === 'low' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                    aiAnalysis.analysis.overallRisk === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                    aiAnalysis.analysis.overallRisk === 'high' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                    'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                  }`}>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Overall Risk</div>
                    <div className={`text-2xl font-bold uppercase ${
                      aiAnalysis.analysis.overallRisk === 'low' ? 'text-emerald-600 dark:text-emerald-400' :
                      aiAnalysis.analysis.overallRisk === 'medium' ? 'text-amber-600 dark:text-amber-400' :
                      aiAnalysis.analysis.overallRisk === 'high' ? 'text-orange-600 dark:text-orange-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {aiAnalysis.analysis.overallRisk}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Risk Score</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {aiAnalysis.analysis.riskScore}/100
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Code Quality</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {aiAnalysis.analysis.codeQuality.score}/100
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">📝 Summary</h4>
                  <p className="text-blue-700 dark:text-blue-400">{aiAnalysis.analysis.summary}</p>
                </div>

                {/* Security Issues */}
                {aiAnalysis.analysis.securityIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">🔒 Security Issues ({aiAnalysis.analysis.securityIssues.length})</h4>
                    <div className="space-y-3">
                      {aiAnalysis.analysis.securityIssues.map((issue, i) => (
                        <div key={i} className={`p-4 rounded-lg border ${
                          issue.severity === 'critical' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' :
                          issue.severity === 'high' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                          issue.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                          'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              issue.severity === 'critical' ? 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-200' :
                              issue.severity === 'high' ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200' :
                              issue.severity === 'medium' ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' :
                              'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-white">{issue.title}</span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{issue.description}</p>
                          {issue.location && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 font-mono mb-2">📍 {issue.location}</p>
                          )}
                          <div className="mt-2 p-2 rounded bg-white/50 dark:bg-black/20">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              <strong>💡 Fix:</strong> {issue.recommendation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best Practices */}
                {aiAnalysis.analysis.bestPractices.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">✅ Best Practices</h4>
                    <div className="space-y-2">
                      {aiAnalysis.analysis.bestPractices.map((bp, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                          {bp.followed ? (
                            <span className="text-emerald-500">✓</span>
                          ) : (
                            <span className="text-rose-500">✗</span>
                          )}
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-white">{bp.practice}</div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">{bp.details}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {aiAnalysis.analysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">💡 Recommendations</h4>
                    <ul className="space-y-2">
                      {aiAnalysis.analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-emerald-500">→</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gas Optimizations */}
                {aiAnalysis.analysis.gasOptimizations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-3">⚡ Gas Optimizations</h4>
                    <ul className="space-y-2">
                      {aiAnalysis.analysis.gasOptimizations.map((opt, i) => (
                        <li key={i} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                          <span className="text-amber-500">⚡</span>
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Analysis metadata */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
                  <p>Analyzed: {new Date(aiAnalysis.analyzedAt).toLocaleString()}</p>
                  <p>Model: {aiAnalysis.aiModel}</p>
                </div>
              </div>
            )}

            {/* No GitHub repo message */}
            {!contract?.githubRepo && !aiLoading && (
              <div className="text-center py-8">
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                  No GitHub repository linked to this contract.
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  AI analysis requires access to the contract source code.
                </p>
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

