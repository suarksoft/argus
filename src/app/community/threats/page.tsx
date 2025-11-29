'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Types
type ThreatType = 'PHISHING' | 'FAKE_TOKEN' | 'RUG_PULL' | 'HONEYPOT' | 'FROZEN_FUNDS' | 'OTHER';
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Threat {
  id: string;
  type: ThreatType;
  severity: Severity;
  status: Status;
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
  viewCount: number;
}

// Mock data - expanded
const generateMockThreats = (): Threat[] => {
  const types: ThreatType[] = ['PHISHING', 'FAKE_TOKEN', 'RUG_PULL', 'HONEYPOT', 'FROZEN_FUNDS', 'OTHER'];
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statuses: Status[] = ['PENDING', 'VERIFIED', 'REJECTED'];
  
  const threats: Threat[] = [
    {
      id: '1',
      type: 'PHISHING',
      severity: 'CRITICAL',
      status: 'VERIFIED',
      title: 'Phishing Site - stellar-airdrop-free.com',
      description: 'Fake airdrop website stealing wallet credentials through social engineering',
      targetWebsite: 'stellar-airdrop-free.com',
      votesConfirm: 145,
      votesReject: 3,
      reporterAddress: 'GDKX...9F2A',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      estimatedLoss: 45000,
      viewCount: 1234,
    },
    {
      id: '2',
      type: 'FAKE_TOKEN',
      severity: 'HIGH',
      status: 'VERIFIED',
      title: 'Fake USDC Token - AUTH_REVOCABLE enabled',
      description: 'This token impersonates USDC but has AUTH_REVOCABLE enabled allowing issuer to freeze funds',
      targetAddress: 'GA7XY...K3M2',
      targetAsset: 'USDC',
      votesConfirm: 89,
      votesReject: 2,
      reporterAddress: 'GB2Y...4K3L',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      estimatedLoss: 127000,
      viewCount: 892,
    },
    {
      id: '3',
      type: 'RUG_PULL',
      severity: 'CRITICAL',
      status: 'VERIFIED',
      title: 'MoonToken Exit Scam - All liquidity removed',
      description: 'Project team removed all liquidity and deleted social media accounts',
      targetAddress: 'GC8X...M4K2',
      targetAsset: 'MOON',
      votesConfirm: 234,
      votesReject: 5,
      reporterAddress: 'GD9Z...7K3L',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      estimatedLoss: 890000,
      viewCount: 3421,
    },
    {
      id: '4',
      type: 'HONEYPOT',
      severity: 'HIGH',
      status: 'PENDING',
      title: 'SafeYield Token - Unable to sell',
      description: 'Users report being unable to sell tokens after purchase',
      targetAddress: 'GB3K...9F4M',
      targetAsset: 'SAFE',
      votesConfirm: 34,
      votesReject: 8,
      reporterAddress: 'GE5X...2K4L',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      viewCount: 456,
    },
    {
      id: '5',
      type: 'FROZEN_FUNDS',
      severity: 'MEDIUM',
      status: 'VERIFIED',
      title: 'GoldCoin issuer froze user funds',
      description: 'Issuer used AUTH_REVOCABLE to freeze multiple user accounts without warning',
      targetAddress: 'GF7Y...K8M3',
      targetAsset: 'GOLD',
      votesConfirm: 67,
      votesReject: 12,
      reporterAddress: 'GH9X...4K2L',
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      estimatedLoss: 23000,
      viewCount: 678,
    },
  ];

  // Generate more random threats
  for (let i = 6; i <= 20; i++) {
    threats.push({
      id: String(i),
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      title: `Suspicious Activity Report #${i}`,
      description: 'Automated detection flagged this address for unusual behavior patterns',
      targetAddress: `G${Math.random().toString(36).substring(2, 8).toUpperCase()}...${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      votesConfirm: Math.floor(Math.random() * 100),
      votesReject: Math.floor(Math.random() * 20),
      reporterAddress: `G${Math.random().toString(36).substring(2, 6).toUpperCase()}...${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      estimatedLoss: Math.random() > 0.5 ? Math.floor(Math.random() * 100000) : undefined,
      viewCount: Math.floor(Math.random() * 1000),
    });
  }

  return threats;
};

const mockThreats = generateMockThreats();

// Utility functions
const formatDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
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
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[severity]}`}>
      {severity}
    </span>
  );
};

const StatusBadge = ({ status }: { status: Status }) => {
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

const TypeLabel = ({ type }: { type: ThreatType }) => {
  const labels: Record<ThreatType, string> = {
    PHISHING: 'Phishing',
    FAKE_TOKEN: 'Fake Token',
    RUG_PULL: 'Rug Pull',
    HONEYPOT: 'Honeypot',
    FROZEN_FUNDS: 'Frozen',
    OTHER: 'Other',
  };
  return <span className="text-xs text-zinc-500 uppercase">{labels[type]}</span>;
};

export default function ThreatsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ThreatType[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Status[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'votes' | 'severity' | 'loss'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const threatTypes: ThreatType[] = ['PHISHING', 'FAKE_TOKEN', 'RUG_PULL', 'HONEYPOT', 'FROZEN_FUNDS', 'OTHER'];
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statuses: Status[] = ['PENDING', 'VERIFIED', 'REJECTED'];

  const filteredThreats = useMemo(() => {
    let result = [...mockThreats];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.targetAddress?.toLowerCase().includes(query) ||
        t.targetWebsite?.toLowerCase().includes(query) ||
        t.targetAsset?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      result = result.filter(t => selectedTypes.includes(t.type));
    }

    // Severity filter
    if (selectedSeverities.length > 0) {
      result = result.filter(t => selectedSeverities.includes(t.severity));
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      result = result.filter(t => selectedStatuses.includes(t.status));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'votes':
          comparison = (a.votesConfirm - a.votesReject) - (b.votesConfirm - b.votesReject);
          break;
        case 'severity':
          const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'loss':
          comparison = (a.estimatedLoss || 0) - (b.estimatedLoss || 0);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [searchQuery, selectedTypes, selectedSeverities, selectedStatuses, sortBy, sortOrder]);

  const toggleFilter = <T,>(array: T[], setArray: React.Dispatch<React.SetStateAction<T[]>>, value: T) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const exportData = (format: 'csv' | 'json') => {
    const data = filteredThreats.map(t => ({
      id: t.id,
      type: t.type,
      severity: t.severity,
      status: t.status,
      title: t.title,
      targetAddress: t.targetAddress || '',
      targetWebsite: t.targetWebsite || '',
      votesConfirm: t.votesConfirm,
      votesReject: t.votesReject,
      estimatedLoss: t.estimatedLoss || 0,
      createdAt: t.createdAt.toISOString(),
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'threats.json';
      a.click();
    } else {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(d => Object.values(d).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'threats.csv';
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/community" className="text-zinc-400 hover:text-white transition-colors">
                ←
              </Link>
              <span className="text-2xl"></span>
              <h1 className="text-xl font-bold text-white">Threat Database</h1>
              <span className="text-sm text-zinc-500">({filteredThreats.length} threats)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-2">
                   Export
                </button>
                <div className="absolute right-0 mt-2 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl hidden group-hover:block">
                  <button
                    onClick={() => exportData('csv')}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => exportData('json')}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
              <Link
                href="/community/report"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
              >
                 Report Threat
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filters */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by address, asset, website, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"></span>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {threatTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleFilter(selectedTypes, setSelectedTypes, type)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      selectedTypes.includes(type)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Severity</p>
              <div className="flex flex-wrap gap-2">
                {severities.map(sev => (
                  <button
                    key={sev}
                    onClick={() => toggleFilter(selectedSeverities, setSelectedSeverities, sev)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      selectedSeverities.includes(sev)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleFilter(selectedStatuses, setSelectedStatuses, status)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      selectedStatuses.includes(status)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="ml-auto">
              <p className="text-xs text-zinc-500 mb-2">Sort by</p>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300"
                >
                  <option value="date">Date</option>
                  <option value="votes">Votes</option>
                  <option value="severity">Severity</option>
                  <option value="loss">Est. Loss</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-zinc-300"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedTypes.length > 0 || selectedSeverities.length > 0 || selectedStatuses.length > 0) && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2">
              <span className="text-xs text-zinc-500">Active filters:</span>
              <button
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedSeverities([]);
                  setSelectedStatuses([]);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Threats List */}
        <div className="space-y-4">
          {filteredThreats.map((threat, index) => (
            <motion.div
              key={threat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/community/threats/${threat.id}`}>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div>
                      <TypeLabel type={threat.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <SeverityBadge severity={threat.severity} />
                        <StatusBadge status={threat.status} />
                        <span className="text-xs text-zinc-500">{formatDate(threat.createdAt)}</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{threat.title}</h3>
                      <p className="text-sm text-zinc-400 line-clamp-2">{threat.description}</p>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                        {threat.targetAddress && (
                          <span className="font-mono">{threat.targetAddress}</span>
                        )}
                        {threat.targetWebsite && (
                          <span className="text-red-400"> {threat.targetWebsite}</span>
                        )}
                        {threat.targetAsset && (
                          <span className="text-yellow-400"> {threat.targetAsset}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <span className="text-emerald-400"> {threat.votesConfirm}</span>
                        <span className="text-red-400"> {threat.votesReject}</span>
                      </div>
                      {threat.estimatedLoss && (
                        <div className="text-sm text-orange-400">
                           {formatUsd(threat.estimatedLoss)}
                        </div>
                      )}
                      <div className="text-xs text-zinc-500 mt-1">
                         {threat.viewCount}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {filteredThreats.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block"></span>
              <h3 className="text-lg font-semibold text-white mb-2">No threats found</h3>
              <p className="text-zinc-400">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
