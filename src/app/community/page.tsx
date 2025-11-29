'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Threat {
  id: string;
  type: 'PHISHING' | 'FAKE_TOKEN' | 'RUG_PULL' | 'HONEYPOT' | 'FROZEN_FUNDS' | 'OTHER';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  title: string;
  description: string;
  targetAddress?: string;
  targetWebsite?: string;
  targetAsset?: string;
  votesConfirm: number;
  votesReject: number;
  reporterAddress: string;
  createdAt: Date;
  estimatedLoss?: number;
}

interface WhaleAlert {
  id: string;
  type: 'LARGE_TRANSFER' | 'EXCHANGE_DEPOSIT' | 'EXCHANGE_WITHDRAWAL';
  fromAddress: string;
  toAddress: string;
  amount: number;
  assetCode: string;
  amountUsd: number;
  fromLabel?: string;
  toLabel?: string;
  createdAt: Date;
}

interface TopHunter {
  rank: number;
  address: string;
  username?: string;
  points: number;
  reportsVerified: number;
  badge: string;
}

// Mock Data
const mockThreats: Threat[] = [
  {
    id: '1',
    type: 'PHISHING',
    severity: 'CRITICAL',
    status: 'PENDING',
    title: 'Phishing Site - stellar-airdrop-free.com',
    description: 'Fake airdrop website stealing wallet credentials',
    targetWebsite: 'stellar-airdrop-free.com',
    votesConfirm: 45,
    votesReject: 2,
    reporterAddress: 'GDKX...9F2A',
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    estimatedLoss: 15000,
  },
  {
    id: '2',
    type: 'FAKE_TOKEN',
    severity: 'HIGH',
    status: 'PENDING',
    title: 'Fake USDC Token - AUTH_REVOCABLE',
    description: 'This token impersonates USDC but has AUTH_REVOCABLE enabled',
    targetAddress: 'GA7XY...K3M2',
    targetAsset: 'USDC',
    votesConfirm: 23,
    votesReject: 1,
    reporterAddress: 'GB2Y...4K3L',
    createdAt: new Date(Date.now() - 8 * 60 * 1000),
  },
  {
    id: '3',
    type: 'RUG_PULL',
    severity: 'MEDIUM',
    status: 'VERIFIED',
    title: 'Suspicious Address - Large Withdrawal Pattern',
    description: 'First-time wallet with unusual large withdrawal activity',
    targetAddress: 'GDKX...9F2A',
    votesConfirm: 67,
    votesReject: 5,
    reporterAddress: 'GC7X...4M2N',
    createdAt: new Date(Date.now() - 23 * 60 * 1000),
    estimatedLoss: 45000,
  },
];

const mockWhaleAlerts: WhaleAlert[] = [
  {
    id: 'w1',
    type: 'EXCHANGE_DEPOSIT',
    fromAddress: 'GDKX...WHALE',
    toAddress: 'GBINANCE...HOT',
    amount: 2500000,
    assetCode: 'XLM',
    amountUsd: 275000,
    fromLabel: 'Unknown Whale',
    toLabel: 'Binance',
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
];

const mockTopHunters: TopHunter[] = [
  { rank: 1, address: 'GDKX...A1B2', username: 'StellarGuard', points: 2450, reportsVerified: 47, badge: '#1' },
  { rank: 2, address: 'GB2Y...C3D4', username: 'CryptoWatcher', points: 1890, reportsVerified: 38, badge: '#2' },
  { rank: 3, address: 'GC7X...E5F6', username: 'SafetyFirst', points: 1234, reportsVerified: 25, badge: '#3' },
  { rank: 4, address: 'GD8Y...G7H8', username: 'BlockchainBob', points: 987, reportsVerified: 19, badge: '#4' },
  { rank: 5, address: 'GE9Z...I9J0', username: 'NewHunter', points: 654, reportsVerified: 12, badge: '#5' },
];

const mockStats = {
  activeThreats: 47,
  verifiedThreats: 234,
  totalMembers: 1200,
  protectedValueUsd: 2300000,
  accuracyRate: 98.5,
};

// Utility functions
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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
const SeverityBadge = ({ severity }: { severity: Threat['severity'] }) => {
  const colors = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[severity]}`}>
      {severity}
    </span>
  );
};

const StatusBadge = ({ status }: { status: Threat['status'] }) => {
  const colors = {
    PENDING: 'bg-zinc-500/20 text-zinc-400',
    VERIFIED: 'bg-emerald-500/20 text-emerald-400',
    REJECTED: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
};

const ThreatTypeLabel = ({ type }: { type: Threat['type'] }) => {
  const labels = {
    PHISHING: 'Phishing',
    FAKE_TOKEN: 'Fake Token',
    RUG_PULL: 'Rug Pull',
    HONEYPOT: 'Honeypot',
    FROZEN_FUNDS: 'Frozen',
    OTHER: 'Other',
  };
  return <span className="text-xs text-zinc-500 uppercase">{labels[type]}</span>;
};

const StatCard = ({ label, value, sublabel, trend }: { label: string; value: string | number; sublabel: string; trend?: string }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-zinc-400">{label}</span>
      {trend && <span className="text-xs text-emerald-400">{trend}</span>}
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-sm text-zinc-400">{sublabel}</div>
  </div>
);

const ThreatCard = ({ threat, isNew }: { threat: Threat; isNew?: boolean }) => (
  <motion.div
    initial={isNew ? { opacity: 0, y: -20 } : false}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
  >
    <div className="flex items-start gap-3">
      <div className="mt-1">
        <ThreatTypeLabel type={threat.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <SeverityBadge severity={threat.severity} />
          <span className="text-xs text-zinc-500">{formatTimeAgo(threat.createdAt)}</span>
        </div>
        <h4 className="font-medium text-white truncate">{threat.title}</h4>
        <p className="text-sm text-zinc-400 truncate">{threat.description}</p>
        {threat.targetAddress && (
          <p className="text-xs text-zinc-500 font-mono mt-1">{threat.targetAddress}</p>
        )}
        {threat.targetWebsite && (
          <p className="text-xs text-red-400 mt-1">{threat.targetWebsite}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs text-zinc-500">
            Reports: {threat.votesConfirm + threat.votesReject}
          </span>
          <span className="text-xs text-zinc-500">
            Votes: <span className="text-emerald-400">{threat.votesConfirm}</span>/<span className="text-red-400">{threat.votesReject}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Link
            href={`/community/threats/${threat.id}`}
            className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
          >
            View
          </Link>
          <button className="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors">
            Confirm
          </button>
          <button className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
            Reject
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

const WhaleAlertCard = ({ alert }: { alert: WhaleAlert }) => (
  <div className="p-4 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
    <div className="flex items-start gap-3">
      <span className="text-sm font-bold text-blue-400">WHALE</span>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-zinc-500">{formatTimeAgo(alert.createdAt)}</span>
          <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
            WHALE ALERT
          </span>
        </div>
        <div className="font-medium text-white">
          {formatNumber(alert.amount)} {alert.assetCode} → {alert.toLabel || 'Unknown'}
        </div>
        <div className="text-sm text-zinc-400">
          From: {alert.fromLabel || alert.fromAddress}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          ≈ {formatUsd(alert.amountUsd)}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            Track
          </button>
          <button className="px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            Watch Address
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Main Component
export default function IntelligenceHub() {
  const [threats, setThreats] = useState<Threat[]>(mockThreats);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simulated real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new threat coming in
      const shouldAddNew = Math.random() > 0.7;
      if (shouldAddNew && threats.length < 10) {
        const newThreat: Threat = {
          id: `new-${Date.now()}`,
          type: ['PHISHING', 'FAKE_TOKEN', 'RUG_PULL', 'HONEYPOT'][Math.floor(Math.random() * 4)] as Threat['type'],
          severity: ['CRITICAL', 'HIGH', 'MEDIUM'][Math.floor(Math.random() * 3)] as Threat['severity'],
          status: 'PENDING',
          title: 'New suspicious activity detected',
          description: 'Automated detection flagged this address',
          targetAddress: `G${Math.random().toString(36).substring(2, 8).toUpperCase()}...${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          votesConfirm: Math.floor(Math.random() * 10),
          votesReject: Math.floor(Math.random() * 3),
          reporterAddress: 'SYSTEM',
          createdAt: new Date(),
        };
        setThreats(prev => [newThreat, ...prev.slice(0, 9)]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [threats.length]);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Argus Intelligence Hub</h1>
              <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">LIVE</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/community/report"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                Report Threat
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search address, asset, transaction, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Active" value={mockStats.activeThreats} sublabel="Active Threats" />
          <StatCard label="Verified" value={mockStats.verifiedThreats} sublabel="Verified Reports" />
          <StatCard label="Members" value={formatNumber(mockStats.totalMembers)} sublabel="Community" />
          <StatCard label="Protected" value={formatUsd(mockStats.protectedValueUsd)} sublabel="Value" />
          <StatCard label="Accuracy" value={`${mockStats.accuracyRate}%`} sublabel="Rate" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Threat Feed */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  Live Threat Feed
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </h2>
                <Link href="/community/threats" className="text-sm text-emerald-400 hover:text-emerald-300">
                  View All →
                </Link>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                <AnimatePresence>
                  {threats.map((threat, index) => (
                    <ThreatCard key={threat.id} threat={threat} isNew={index === 0} />
                  ))}
                </AnimatePresence>
                {mockWhaleAlerts.map(alert => (
                  <WhaleAlertCard key={alert.id} alert={alert} />
                ))}
              </div>
              <div className="p-4 border-t border-zinc-800">
                <button className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                  Load More...
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Threat Severity Distribution */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-4">
                Threat Severity Map
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'CRITICAL', percent: 23, color: 'bg-red-500' },
                  { label: 'HIGH', percent: 31, color: 'bg-orange-500' },
                  { label: 'MEDIUM', percent: 28, color: 'bg-yellow-500' },
                  { label: 'LOW', percent: 18, color: 'bg-blue-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="text-zinc-500">{item.percent}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Threat Hunters */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-4">
                Top Threat Hunters
              </h3>
              <div className="space-y-3">
                {mockTopHunters.map(hunter => (
                  <div key={hunter.address} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-400">{hunter.badge}</span>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {hunter.username || hunter.address}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {hunter.reportsVerified} verified
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {formatNumber(hunter.points)} pts
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/community/leaderboard"
                className="block mt-4 text-center py-2 text-sm text-emerald-400 hover:text-emerald-300 border-t border-zinc-800 pt-4"
              >
                View Full Leaderboard →
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href="/community/report"
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <span className="text-sm text-zinc-300">Report New Threat</span>
                  <span className="text-zinc-500">→</span>
                </Link>
                <Link
                  href="/community/alerts"
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <span className="text-sm text-zinc-300">Manage Alerts</span>
                  <span className="text-zinc-500">→</span>
                </Link>
                <Link
                  href="/community/profile"
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <span className="text-sm text-zinc-300">My Profile</span>
                  <span className="text-zinc-500">→</span>
                </Link>
              </div>
            </div>

            {/* Subscribe Alert */}
            <div className="bg-gradient-to-br from-emerald-900/30 to-zinc-900 border border-emerald-800/30 rounded-2xl p-4">
              <h3 className="font-semibold text-white mb-2">
                Subscribe to Alerts
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Get notified about new threats and whale movements
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
                  Email
                </button>
                <button className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
                  Telegram
                </button>
                <button className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
                  Discord
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recently Verified Threats */}
        <div className="mt-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                Recently Verified Threats
              </h3>
              <Link href="/community/threats?status=verified" className="text-sm text-emerald-400 hover:text-emerald-300">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { severity: 'CRITICAL', type: 'Rug Pull', address: 'GA8X...2K4M', detail: '$45K stolen', time: '2 days ago' },
                { severity: 'HIGH', type: 'Fake Airdrop', address: 'stellar-free.com', detail: '127 victims', time: '5 days ago' },
                { severity: 'HIGH', type: 'Phishing', address: 'GB2Y...9K3L', detail: 'Active site', time: '1 week ago' },
                { severity: 'MEDIUM', type: 'Suspicious', address: 'GC7X...4M2N', detail: 'Unusual flow', time: '2 weeks ago' },
              ].map((item, i) => (
                <div key={i} className="bg-zinc-800/50 rounded-xl p-4 hover:bg-zinc-800 transition-colors cursor-pointer">
                  <SeverityBadge severity={item.severity as Threat['severity']} />
                  <h4 className="font-medium text-white mt-2">{item.type}</h4>
                  <p className="text-xs text-zinc-500 font-mono truncate">{item.address}</p>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-zinc-400">{item.detail}</span>
                    <span className="text-zinc-500">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
