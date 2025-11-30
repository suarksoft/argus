'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

// Types
type ThreatType = 'PHISHING' | 'FAKE_TOKEN' | 'RUG_PULL' | 'HONEYPOT' | 'FROZEN_FUNDS' | 'OTHER';
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Vote {
  id: string;
  voterAddress: string;
  voterUsername?: string;
  voteType: 'CONFIRM' | 'REJECT';
  comment?: string;
  voterReputation: number;
  createdAt: Date;
}

interface Comment {
  id: string;
  authorAddress: string;
  authorUsername?: string;
  content: string;
  isOfficial: boolean;
  createdAt: Date;
}

interface ThreatDetail {
  id: string;
  type: ThreatType;
  severity: Severity;
  status: Status;
  title: string;
  description: string;
  targetAddress?: string;
  targetWebsite?: string;
  targetAsset?: string;
  targetAssetIssuer?: string;
  transactionHash?: string;
  votesConfirm: number;
  votesReject: number;
  reporterAddress: string;
  reporterUsername?: string;
  reporterReputation: number;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  estimatedLoss?: number;
  viewCount: number;
  shareCount: number;
  evidenceUrls: string[];
  evidenceFiles: string[];
  relatedAddresses: string[];
  votes: Vote[];
  comments: Comment[];
}

// Interface for API response
interface ThreatApiResponse {
  _id: string;
  address: string;
  scamType: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'pending' | 'verified' | 'rejected';
  reporterUsername: string;
  reporterEmail?: string;
  upvotes: number;
  downvotes: number;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  contactEmail?: string;
}

// Utility functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatUsd = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Components
const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const colors = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${colors[severity]}`}>
      {severity}
    </span>
  );
};

const StatusBadge = ({ status }: { status: Status }) => {
  const colors = {
    PENDING: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    VERIFIED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${colors[status]}`}>
      {status}
    </span>
  );
};

const TypeLabel = ({ type }: { type: ThreatType }) => {
  const labels: Record<ThreatType, string> = {
    PHISHING: 'Phishing',
    FAKE_TOKEN: 'Fake Token',
    RUG_PULL: 'Rug Pull',
    HONEYPOT: 'Honeypot',
    FROZEN_FUNDS: 'Frozen',
    OTHER: 'Other',
  };
  return <span className="text-sm text-zinc-400 uppercase font-medium">{labels[type]}</span>;
};

export default function ThreatDetailPage() {
  const params = useParams();
  const [userVote, setUserVote] = useState<'CONFIRM' | 'REJECT' | null>(null);
  const [voteComment, setVoteComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'votes' | 'comments'>('details');
  const [threat, setThreat] = useState<ThreatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch threat from API (GERÇEK VERİ)
  useEffect(() => {
    const fetchThreat = async () => {
      try {
        setLoading(true);
        const id = params.id as string;
        
        console.log('Fetching threat:', id);
        const response = await fetch(`/api/community/threats/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success && data.threat) {
          // Map API response to ThreatDetail format (GERÇEK VERİ)
          const apiThreat: ThreatApiResponse = data.threat;
          
          const mappedThreat: ThreatDetail = {
            id: apiThreat._id,
            type: (apiThreat.scamType as ThreatType) || 'OTHER',
            severity: apiThreat.severity || 'MEDIUM',
            status: apiThreat.status === 'verified' ? 'VERIFIED' : apiThreat.status === 'rejected' ? 'REJECTED' : 'PENDING',
            title: apiThreat.title,
            description: apiThreat.description,
            targetAddress: apiThreat.address,
            votesConfirm: apiThreat.upvotes || 0,
            votesReject: apiThreat.downvotes || 0,
            reporterAddress: apiThreat.address,
            reporterUsername: apiThreat.reporterUsername,
            reporterReputation: 0, // TODO: Get from user profile
            createdAt: new Date(apiThreat.createdAt),
            updatedAt: new Date(apiThreat.updatedAt),
            verifiedAt: apiThreat.verifiedAt ? new Date(apiThreat.verifiedAt) : undefined,
            verifiedBy: apiThreat.verifiedBy,
            estimatedLoss: undefined, // Not stored yet
            viewCount: 0, // TODO: Track views
            shareCount: 0, // TODO: Track shares
            evidenceUrls: apiThreat.evidenceUrls || [],
            evidenceFiles: [], // Not stored separately
            relatedAddresses: [], // TODO: Find related addresses
            votes: [], // TODO: Fetch votes separately
            comments: [], // TODO: Fetch comments separately
          };
          
          setThreat(mappedThreat);
          console.log('✅ Loaded real threat from database');
        } else {
          throw new Error(data.error || 'Failed to load threat');
        }
      } catch (err: any) {
        console.error('Failed to fetch threat:', err);
        setError(err.message || 'Failed to load threat');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchThreat();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-emerald-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-zinc-400">Loading threat details...</p>
        </div>
      </div>
    );
  }

  if (error || !threat) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Threat not found'}</p>
          <Link href="/community/threats" className="text-emerald-400 hover:underline">
            ← Back to Threats
          </Link>
        </div>
      </div>
    );
  }

  const handleVote = (type: 'CONFIRM' | 'REJECT') => {
    setUserVote(type);
    // API call would go here
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    // API call would go here
    setNewComment('');
  };

  const voteScore = threat.votesConfirm - threat.votesReject;
  const votePercentage = Math.round((threat.votesConfirm / (threat.votesConfirm + threat.votesReject)) * 100);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/community/threats" className="text-zinc-400 hover:text-white transition-colors">
                ← Back
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm flex items-center gap-1">
                 Share
              </button>
              <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm flex items-center gap-1">
                 Watch
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Header Section */}
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <SeverityBadge severity={threat.severity} />
                  <StatusBadge status={threat.status} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{threat.title}</h1>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>Reported by <span className="text-emerald-400">{threat.reporterUsername || threat.reporterAddress}</span></span>
                  <span>•</span>
                  <span>{formatDate(threat.createdAt)}</span>
                  <span>•</span>
                  <span> {threat.viewCount} views</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-zinc-800 bg-zinc-800/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{threat.votesConfirm}</div>
              <div className="text-xs text-zinc-500">Confirmations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{threat.votesReject}</div>
              <div className="text-xs text-zinc-500">Rejections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{votePercentage}%</div>
              <div className="text-xs text-zinc-500">Confidence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{threat.estimatedLoss ? formatUsd(threat.estimatedLoss) : '-'}</div>
              <div className="text-xs text-zinc-500">Est. Loss</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            {['details', 'votes', 'comments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'text-emerald-400 border-b-2 border-emerald-400 -mb-px'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
                {tab === 'votes' && ` (${threat.votes.length})`}
                {tab === 'comments' && ` (${threat.comments.length})`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <div className="prose prose-invert max-w-none">
                    <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {threat.description}
                    </div>
                  </div>
                </div>

                {/* Target Info */}
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Target Information</h3>
                  <div className="space-y-2">
                    {threat.targetWebsite && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-sm w-24">Website:</span>
                        <span className="text-red-400 font-mono text-sm"> {threat.targetWebsite}</span>
                      </div>
                    )}
                    {threat.targetAddress && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-sm w-24">Address:</span>
                        <span className="text-zinc-300 font-mono text-sm break-all">{threat.targetAddress}</span>
                      </div>
                    )}
                    {threat.targetAsset && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-sm w-24">Asset:</span>
                        <span className="text-yellow-400 font-mono text-sm">{threat.targetAsset}</span>
                      </div>
                    )}
                    {threat.transactionHash && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-sm w-24">TX Hash:</span>
                        <span className="text-zinc-300 font-mono text-sm break-all">{threat.transactionHash}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence */}
                {(threat.evidenceUrls.length > 0 || threat.evidenceFiles.length > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Evidence</h3>
                    <div className="space-y-2">
                      {threat.evidenceUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors text-sm"
                        >
                          <span></span>
                          <span className="text-blue-400 truncate">{url}</span>
                        </a>
                      ))}
                      {threat.evidenceFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg text-sm">
                          <span></span>
                          <span className="text-zinc-300">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Addresses */}
                {threat.relatedAddresses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Related Addresses</h3>
                    <div className="space-y-2">
                      {threat.relatedAddresses.map((addr, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
                          <span className="text-zinc-300 font-mono text-sm">{addr}</span>
                          <Link href={`/community/threats?target=${addr}`} className="text-emerald-400 text-xs hover:underline ml-auto">
                            View reports →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification Info */}
                {threat.status === 'VERIFIED' && threat.verifiedAt && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span></span>
                      <h3 className="font-semibold text-emerald-400">Verified Threat</h3>
                    </div>
                    <p className="text-sm text-zinc-300">
                      This threat was verified by <span className="text-emerald-400">{threat.verifiedBy}</span> on {formatDate(threat.verifiedAt)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'votes' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Vote Buttons */}
                {!userVote && (
                  <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-white mb-3">Cast Your Vote</h3>
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={() => handleVote('CONFIRM')}
                        className="flex-1 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors font-medium"
                      >
                        ✓ Confirm Threat
                      </button>
                      <button
                        onClick={() => handleVote('REJECT')}
                        className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors font-medium"
                      >
                        ✕ Reject Report
                      </button>
                    </div>
                    <textarea
                      value={voteComment}
                      onChange={(e) => setVoteComment(e.target.value)}
                      placeholder="Add a comment to your vote (optional)..."
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                      rows={2}
                    />
                  </div>
                )}

                {userVote && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                    <p className="text-emerald-400">
                      ✓ You voted to {userVote.toLowerCase()} this report
                    </p>
                  </div>
                )}

                {/* Votes List */}
                <div className="space-y-3">
                  {threat.votes.map(vote => (
                    <div key={vote.id} className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        vote.voteType === 'CONFIRM' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {vote.voteType === 'CONFIRM' ? '✓' : '✕'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">
                            {vote.voterUsername || vote.voterAddress}
                          </span>
                          <span className="text-xs text-zinc-500"> {vote.voterReputation}</span>
                          <span className="text-xs text-zinc-500">{formatTimeAgo(vote.createdAt)}</span>
                        </div>
                        {vote.comment && (
                          <p className="text-sm text-zinc-400 mt-1">{vote.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'comments' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Add Comment */}
                <div className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {threat.comments.map(comment => (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-xl ${
                        comment.isOfficial
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {comment.isOfficial && <span className="text-emerald-400">✓</span>}
                        <span className={`font-medium text-sm ${comment.isOfficial ? 'text-emerald-400' : 'text-white'}`}>
                          {comment.authorUsername || comment.authorAddress}
                        </span>
                        {comment.isOfficial && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                            Official
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 ml-auto">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="text-zinc-300 text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
