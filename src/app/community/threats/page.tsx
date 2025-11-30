'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Threat {
  _id: string;
  address: string;
  scamType: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'pending' | 'verified' | 'rejected';
  reporterUsername: string;
  upvotes: number;
  evidenceUrls: string[];
  createdAt: string;
  verifiedAt?: string;
}

const SEVERITY_COLORS = {
  LOW: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700',
  MEDIUM: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  HIGH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  CRITICAL: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
};

const SCAM_TYPE_LABELS: Record<string, string> = {
    PHISHING: 'Phishing',
    FAKE_TOKEN: 'Fake Token',
    RUG_PULL: 'Rug Pull',
    HONEYPOT: 'Honeypot',
  PONZI: 'Ponzi Scheme',
  FAKE_EXCHANGE: 'Fake Exchange',
  IMPERSONATION: 'Impersonation',
    OTHER: 'Other',
};

export default function ThreatsPage() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('verified');
  const [sortBy, setSortBy] = useState<'recent' | 'upvotes'>('recent');
  const [addressFilter, setAddressFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('address') || '';
    }
    return '';
  });

  useEffect(() => {
    fetchThreats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchThreats, 30000);
    return () => clearInterval(interval);
  }, [filter, sortBy, addressFilter]);

  const fetchThreats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        filter,
        sort: sortBy,
      });
      if (addressFilter) {
        params.append('address', addressFilter);
      }
      
      console.log('Fetching threats from API...');
      const response = await fetch(`/api/community/threats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success && Array.isArray(data.threats)) {
        // GERÇEK VERİ - MongoDB'den gelen veriler
        setThreats(data.threats);
        console.log(`✅ Loaded ${data.threats.length} real threats from database`);
      } else {
        console.warn('API returned invalid data:', data);
        setThreats([]); // Boş array - mock data YOK
      }
    } catch (error) {
      console.error('Failed to fetch threats:', error);
      setThreats([]); // Hata durumunda boş - mock data YOK
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Live Threat Feed
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Real-time scam reports from the Argus community
            </p>
              </div>
              <Link
                href="/community/report"
            className="px-4 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition-colors font-semibold text-sm"
              >
            Report Scam
              </Link>
      </div>

        {/* Address Filter */}
        {addressFilter && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              placeholder="Filter by address (G...)"
              className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={() => setAddressFilter('')}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2">
                  <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              All Reports
                  </button>
                  <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'verified'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              Verified Only
                  </button>
                  <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              Under Review
                  </button>
            </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'recent'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Recent
            </button>
                <button
              onClick={() => setSortBy('upvotes')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'upvotes'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Most Voted
                </button>
              </div>
            </div>
          </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

        {/* Threats List */}
      {!loading && (
        <div className="space-y-4">
          {threats.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 ring-1 ring-zinc-900/10 dark:ring-white/10">
              <p className="text-zinc-600 dark:text-zinc-400">
                No threats reported yet
              </p>
            </div>
          ) : (
            threats.map((threat) => (
              <div
                key={threat._id}
                className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:ring-emerald-500/50 transition-all"
              >
                  <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                          {threat.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold border ${
                            SEVERITY_COLORS[threat.severity] || SEVERITY_COLORS.MEDIUM
                          }`}>
                            {threat.severity}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {SCAM_TYPE_LABELS[threat.scamType] || threat.scamType}
                          </span>
                          {threat.status === 'verified' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          <span className="font-semibold">{threat.upvotes}</span>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Address:</span>
                        <code className="flex-1 font-mono text-sm text-zinc-900 dark:text-white">
                          {threat.address}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(threat.address)}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                          title="Copy address"
                        >
                          <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                        </div>

                    {/* Description */}
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
                      {threat.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-4">
                        <span>Reported by {threat.reporterUsername}</span>
                        <span>•</span>
                        <span>{formatDate(threat.createdAt)}</span>
                        {threat.verifiedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Verified {formatDate(threat.verifiedAt)}
                            </span>
                          </>
                        )}
                      </div>
                      <Link
                        href={`/community/threats/${threat._id}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
            </div>
            ))
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-zinc-900 p-4 ring-1 ring-zinc-900/10 dark:ring-white/10 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {threats.filter(t => t.status === 'verified').length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Verified Threats
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-zinc-900 p-4 ring-1 ring-zinc-900/10 dark:ring-white/10 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {threats.filter(t => t.status === 'pending').length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Under Review
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-zinc-900 p-4 ring-1 ring-zinc-900/10 dark:ring-white/10 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {threats.reduce((sum, t) => sum + t.upvotes, 0)}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Community Votes
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
