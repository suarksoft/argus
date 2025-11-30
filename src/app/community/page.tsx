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
  downvotes: number;
  createdAt: string;
}

interface DashboardStats {
  activeThreats: number;
  verifiedReports: number;
  communityMembers: number;
  protectedValue: number;
  accuracyRate: number;
}

interface SeverityBreakdown {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

interface TopHunter {
  username: string;
  verifiedCount: number;
  points: number;
}

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

const SEVERITY_COLORS = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-sky-500',
};

export default function IntelligenceHubPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeThreats: 0,
    verifiedReports: 0,
    communityMembers: 0,
    protectedValue: 0,
    accuracyRate: 0,
  });
  const [threats, setThreats] = useState<Threat[]>([]);
  const [severityBreakdown, setSeverityBreakdown] = useState<SeverityBreakdown>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  });
  const [topHunters, setTopHunters] = useState<TopHunter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [votingThreats, setVotingThreats] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, threatsRes, severityRes, huntersRes] = await Promise.all([
        fetch('/api/community/dashboard/stats'),
        fetch('/api/community/threats?filter=all&sort=recent&limit=5'),
        fetch('/api/community/dashboard/severity'),
        fetch('/api/community/dashboard/hunters'),
      ]);

      // Stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      // Threats
      if (threatsRes.ok) {
        const threatsData = await threatsRes.json();
        if (threatsData.success) {
          setThreats(threatsData.threats || []);
        }
      }

      // Severity breakdown
      if (severityRes.ok) {
        const severityData = await severityRes.json();
        if (severityData.success) {
          setSeverityBreakdown(severityData.breakdown);
        }
      }

      // Top hunters
      if (huntersRes.ok) {
        const huntersData = await huntersRes.json();
        if (huntersData.success) {
          setTopHunters(huntersData.hunters || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handleVote = async (threatId: string, voteType: 'confirm' | 'reject') => {
    // Check authentication
    const token = localStorage.getItem('argus_auth_token');
    if (!token) {
      setToast({
        type: 'error',
        message: 'Please sign in to vote'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Set loading state
    setVotingThreats(prev => new Set(prev).add(threatId));

    try {
      const response = await fetch(`/api/community/threats/${threatId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ voteType }),
      });

      const data = await response.json();

      if (data.success) {
        // Update threat in local state
        setThreats(prev => prev.map(t => 
          t._id === threatId 
            ? { ...t, upvotes: data.threat.upvotes, downvotes: data.threat.downvotes }
            : t
        ));

        setToast({
          type: 'success',
          message: data.message || `Vote ${voteType === 'confirm' ? 'confirmed' : 'rejected'} successfully`
        });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({
          type: 'error',
          message: data.error || 'Failed to record vote'
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Vote error:', error);
      setToast({
        type: 'error',
        message: 'Failed to record vote. Please try again.'
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setVotingThreats(prev => {
        const next = new Set(prev);
        next.delete(threatId);
        return next;
      });
    }
  };

  const totalThreats = Object.values(severityBreakdown).reduce((sum, val) => sum + val, 0);
  const severityPercentages = {
    CRITICAL: totalThreats > 0 ? Math.round((severityBreakdown.CRITICAL / totalThreats) * 100) : 0,
    HIGH: totalThreats > 0 ? Math.round((severityBreakdown.HIGH / totalThreats) * 100) : 0,
    MEDIUM: totalThreats > 0 ? Math.round((severityBreakdown.MEDIUM / totalThreats) * 100) : 0,
    LOW: totalThreats > 0 ? Math.round((severityBreakdown.LOW / totalThreats) * 100) : 0,
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Argus Intelligence Hub</h1>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
            </div>
              <Link
                href="/community/report"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-semibold text-sm"
              >
                Report Threat
              </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, asset, transaction, or keyword..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white mb-1">{stats.activeThreats}</div>
            <div className="text-sm text-zinc-400">Active Threats</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white mb-1">{stats.verifiedReports}</div>
            <div className="text-sm text-zinc-400">Verified Reports</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white mb-1">
              {stats.communityMembers >= 1000 
                ? `${(stats.communityMembers / 1000).toFixed(1)}K`
                : stats.communityMembers}
            </div>
            <div className="text-sm text-zinc-400">Community</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white mb-1">
              ${(stats.protectedValue / 1000).toFixed(0)}K
            </div>
            <div className="text-sm text-zinc-400">Value</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-white mb-1">{stats.accuracyRate}%</div>
            <div className="text-sm text-zinc-400">Rate</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Threat Feed - Left (2 columns) */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Live Threat Feed</h2>
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              </div>
              <Link
                href="/community/threats"
                className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                  View All →
                </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : threats.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                No threats reported yet
              </div>
            ) : (
              <div className="space-y-4">
                {threats.map((threat) => (
                  <div
                    key={threat._id}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          threat.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                          threat.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          threat.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-sky-500/20 text-sky-400'
                        }`}>
                          {threat.severity}
                        </span>
                        <span className="text-xs text-zinc-500 uppercase font-medium">
                          {SCAM_TYPE_LABELS[threat.scamType] || threat.scamType}
                        </span>
                        <span className="text-xs text-zinc-500">{formatTimeAgo(threat.createdAt)}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-white mb-1">{threat.title}</h3>
                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{threat.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="font-mono">{threat.address.slice(0, 8)}...{threat.address.slice(-6)}</span>
                        <span>Reports: {threat.upvotes + threat.downvotes}</span>
                        <span>Votes: {threat.upvotes}/{threat.downvotes}</span>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/community/threats/${threat._id}`}
                          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleVote(threat._id, 'confirm')}
                          disabled={votingThreats.has(threat._id)}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          {votingThreats.has(threat._id) ? (
                            <>
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              ...
                            </>
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          onClick={() => handleVote(threat._id, 'reject')}
                          disabled={votingThreats.has(threat._id)}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-rose-400 text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          {votingThreats.has(threat._id) ? (
                            <>
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              ...
                            </>
                          ) : (
                            'Reject'
                          )}
                </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Threat Severity Map */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Threat Severity Map</h2>
              <div className="space-y-4">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => (
                  <div key={severity}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-300">{severity}</span>
                      <span className="text-sm text-zinc-500">{severityPercentages[severity]}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${SEVERITY_COLORS[severity]} transition-all duration-500`}
                        style={{ width: `${severityPercentages[severity]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Threat Hunters */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Top Threat Hunters</h2>
              {loading ? (
                <div className="text-center py-8 text-zinc-400 text-sm">Loading...</div>
              ) : topHunters.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-sm">No hunters yet</div>
              ) : (
              <div className="space-y-3">
                  {topHunters.map((hunter, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                          #{idx + 1}
                        </div>
                      <div>
                          <div className="font-semibold text-white text-sm">{hunter.username}</div>
                          <div className="text-xs text-zinc-500">{hunter.verifiedCount} verified</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-400">
                          {(hunter.points / 1000).toFixed(1)}K pts
                        </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
            </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-rose-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
