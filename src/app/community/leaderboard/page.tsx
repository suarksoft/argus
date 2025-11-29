'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Types
interface Hunter {
  rank: number;
  address: string;
  username?: string;
  avatar?: string;
  points: number;
  reportsSubmitted: number;
  reportsVerified: number;
  reportsRejected: number;
  accuracyRate: number;
  votesCast: number;
  level: string;
  badges: string[];
  joinedAt: Date;
  lastActiveAt: Date;
}

type Period = 'week' | 'month' | 'all';
type Category = 'points' | 'reports' | 'accuracy' | 'votes';

// Mock data
const generateHunters = (): Hunter[] => {
  const levels = ['Newcomer', 'Contributor', 'Hunter', 'Expert', 'Guardian', 'Legend'];
  
  return [
    {
      rank: 1,
      address: 'GDKX...A1B2',
      username: 'StellarGuard',
      points: 2450,
      reportsSubmitted: 52,
      reportsVerified: 47,
      reportsRejected: 3,
      accuracyRate: 90.4,
      votesCast: 234,
      level: 'Legend',
      badges: ['Gold', 'Verified', 'Elite'],
      joinedAt: new Date('2024-01-15'),
      lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      rank: 2,
      address: 'GB2Y...C3D4',
      username: 'CryptoWatcher',
      points: 1890,
      reportsSubmitted: 41,
      reportsVerified: 38,
      reportsRejected: 2,
      accuracyRate: 92.7,
      votesCast: 189,
      level: 'Guardian',
      badges: ['Trophy', 'Star'],
      joinedAt: new Date('2024-02-20'),
      lastActiveAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      rank: 3,
      address: 'GC7X...E5F6',
      username: 'SafetyFirst',
      points: 1234,
      reportsSubmitted: 28,
      reportsVerified: 25,
      reportsRejected: 1,
      accuracyRate: 89.3,
      votesCast: 156,
      level: 'Expert',
      badges: ['Star', 'Hot'],
      joinedAt: new Date('2024-03-10'),
      lastActiveAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      rank: 4,
      address: 'GD8Y...G7H8',
      username: 'BlockchainBob',
      points: 987,
      reportsSubmitted: 22,
      reportsVerified: 19,
      reportsRejected: 2,
      accuracyRate: 86.4,
      votesCast: 134,
      level: 'Hunter',
      badges: ['Rising'],
      joinedAt: new Date('2024-04-05'),
      lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      rank: 5,
      address: 'GE9Z...I9J0',
      username: 'NewHunter',
      points: 654,
      reportsSubmitted: 15,
      reportsVerified: 12,
      reportsRejected: 1,
      accuracyRate: 80.0,
      votesCast: 89,
      level: 'Contributor',
      badges: [],
      joinedAt: new Date('2024-06-01'),
      lastActiveAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  ];
};

// Generate more hunters for pagination
const allHunters: Hunter[] = [
  ...generateHunters(),
  ...Array.from({ length: 45 }, (_, i) => ({
    rank: i + 6,
    address: `G${Math.random().toString(36).substring(2, 6).toUpperCase()}...${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    username: Math.random() > 0.3 ? `User${i + 6}` : undefined,
    points: Math.max(50, 600 - i * 10 + Math.floor(Math.random() * 50)),
    reportsSubmitted: Math.floor(Math.random() * 20) + 1,
    reportsVerified: Math.floor(Math.random() * 15),
    reportsRejected: Math.floor(Math.random() * 3),
    accuracyRate: 60 + Math.random() * 35,
    votesCast: Math.floor(Math.random() * 100),
    level: ['Newcomer', 'Contributor', 'Hunter'][Math.floor(Math.random() * 3)],
    badges: [],
    joinedAt: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000),
    lastActiveAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
  })),
];

// Utility functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatTimeAgo = (date: Date): string => {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

// Components
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <span className="text-xl font-bold text-yellow-400">#1</span>;
  if (rank === 2) return <span className="text-xl font-bold text-zinc-300">#2</span>;
  if (rank === 3) return <span className="text-xl font-bold text-orange-400">#3</span>;
  return <span className="text-lg text-zinc-500 font-bold w-8 text-center">#{rank}</span>;
};

const LevelBadge = ({ level }: { level: string }) => {
  const colors: Record<string, string> = {
    Newcomer: 'bg-zinc-500/20 text-zinc-400',
    Contributor: 'bg-blue-500/20 text-blue-400',
    Hunter: 'bg-purple-500/20 text-purple-400',
    Expert: 'bg-orange-500/20 text-orange-400',
    Guardian: 'bg-emerald-500/20 text-emerald-400',
    Legend: 'bg-yellow-500/20 text-yellow-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[level] || colors.Newcomer}`}>
      {level}
    </span>
  );
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('all');
  const [category, setCategory] = useState<Category>('points');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Sort hunters by category
  const sortedHunters = [...allHunters].sort((a, b) => {
    switch (category) {
      case 'points':
        return b.points - a.points;
      case 'reports':
        return b.reportsVerified - a.reportsVerified;
      case 'accuracy':
        return b.accuracyRate - a.accuracyRate;
      case 'votes':
        return b.votesCast - a.votesCast;
      default:
        return 0;
    }
  }).map((h, i) => ({ ...h, rank: i + 1 }));

  const paginatedHunters = sortedHunters.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const totalPages = Math.ceil(sortedHunters.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/community" className="text-zinc-400 hover:text-white transition-colors">
                ←
              </Link>
              <h1 className="text-xl font-bold text-white">Leaderboard</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="order-1 md:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center h-full"
            >
              <div className="text-3xl font-bold text-zinc-300 mb-2">#2</div>
              <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">
                {sortedHunters[1]?.username?.[0] || '?'}
              </div>
              <h3 className="font-semibold text-white truncate">
                {sortedHunters[1]?.username || sortedHunters[1]?.address}
              </h3>
              <LevelBadge level={sortedHunters[1]?.level || 'Newcomer'} />
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{sortedHunters[1]?.points.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">points</div>
              </div>
              <div className="flex justify-center gap-1 mt-2 text-xs text-zinc-400">
                {sortedHunters[1]?.badges.map((badge, i) => (
                  <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded">{badge}</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* 1st Place */}
          <div className="order-0 md:order-0 -mt-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-linear-to-b from-yellow-500/20 to-zinc-900 border border-yellow-500/30 rounded-2xl p-6 text-center"
            >
              <div className="text-4xl font-bold text-yellow-400 mb-2">#1</div>
              <div className="w-20 h-20 bg-yellow-500/20 border-2 border-yellow-500/50 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl">
                {sortedHunters[0]?.username?.[0] || '?'}
              </div>
              <h3 className="font-bold text-white text-lg truncate">
                {sortedHunters[0]?.username || sortedHunters[0]?.address}
              </h3>
              <LevelBadge level={sortedHunters[0]?.level || 'Legend'} />
              <div className="mt-4">
                <div className="text-3xl font-bold text-yellow-400">{sortedHunters[0]?.points.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">points</div>
              </div>
              <div className="flex justify-center gap-1 mt-3 text-xs text-zinc-400">
                {sortedHunters[0]?.badges.map((badge, i) => (
                  <span key={i} className="px-2 py-0.5 bg-yellow-500/20 rounded text-yellow-400">{badge}</span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* 3rd Place */}
          <div className="order-2 md:order-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center h-full"
            >
              <div className="text-3xl font-bold text-orange-400 mb-2">#3</div>
              <div className="w-16 h-16 bg-zinc-800 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">
                {sortedHunters[2]?.username?.[0] || '?'}
              </div>
              <h3 className="font-semibold text-white truncate">
                {sortedHunters[2]?.username || sortedHunters[2]?.address}
              </h3>
              <LevelBadge level={sortedHunters[2]?.level || 'Newcomer'} />
              <div className="mt-3">
                <div className="text-2xl font-bold text-white">{sortedHunters[2]?.points.toLocaleString()}</div>
                <div className="text-xs text-zinc-500">points</div>
              </div>
              <div className="flex justify-center gap-1 mt-2 text-xs text-zinc-400">
                {sortedHunters[2]?.badges.map((badge, i) => (
                  <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded">{badge}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            {/* Period Filter */}
            <div className="flex gap-2">
              {(['week', 'month', 'all'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors capitalize ${
                    period === p
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {p === 'all' ? 'All Time' : `This ${p}`}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              {([
                { key: 'points', label: 'Points' },
                { key: 'reports', label: 'Reports' },
                { key: 'accuracy', label: 'Accuracy' },
                { key: 'votes', label: 'Votes' },
              ] as const).map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    category === c.key
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 bg-zinc-800/30 text-sm text-zinc-400 font-medium">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">User</div>
            <div className="col-span-2 text-center">Points</div>
            <div className="col-span-2 text-center">Verified</div>
            <div className="col-span-1 text-center">Accuracy</div>
            <div className="col-span-2 text-center">Last Active</div>
          </div>

          {/* Table Body */}
          <div>
            {paginatedHunters.map((hunter, index) => (
              <motion.div
                key={hunter.address}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
              >
                <Link href={`/community/profile/${hunter.address}`}>
                  <div className={`grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors items-center ${
                    hunter.rank <= 3 ? 'bg-zinc-800/20' : ''
                  }`}>
                    <div className="col-span-1 flex justify-center">
                      <RankBadge rank={hunter.rank} />
                    </div>
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lg shrink-0">
                        {hunter.username?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">
                          {hunter.username || hunter.address}
                        </div>
                        <div className="flex items-center gap-1">
                          <LevelBadge level={hunter.level} />
                          {hunter.badges.slice(0, 2).map((badge, i) => (
                            <span key={i} className="text-sm">{badge}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="font-bold text-emerald-400">{hunter.points.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-white">{hunter.reportsVerified}</span>
                      <span className="text-zinc-500 text-sm"> / {hunter.reportsSubmitted}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`${
                        hunter.accuracyRate >= 85 ? 'text-emerald-400' :
                        hunter.accuracyRate >= 70 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {hunter.accuracyRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="col-span-2 text-center text-sm text-zinc-500">
                      {formatTimeAgo(hunter.lastActiveAt)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              Showing {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, sortedHunters.length)} of {sortedHunters.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg text-sm"
              >
                ← Prev
              </button>
              <span className="px-3 py-1 text-zinc-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 rounded-lg text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-sm text-zinc-400 mb-1">Hunters</div>
            <div className="text-2xl font-bold text-white">1,247</div>
            <div className="text-sm text-zinc-500">Total Hunters</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-sm text-zinc-400 mb-1">Reports</div>
            <div className="text-2xl font-bold text-white">3,892</div>
            <div className="text-sm text-zinc-500">Total Reports</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-sm text-zinc-400 mb-1">Verified</div>
            <div className="text-2xl font-bold text-white">2,341</div>
            <div className="text-sm text-zinc-500">Verified Threats</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-center">
            <div className="text-sm text-zinc-400 mb-1">Protected</div>
            <div className="text-2xl font-bold text-white">$4.2M</div>
            <div className="text-sm text-zinc-500">Value Protected</div>
          </div>
        </div>
      </div>
    </div>
  );
}
