'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DApp {
  _id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  category: string;
  websiteUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  ratingAverage: number;
  ratingCount: number;
  totalUsers: number;
  tvlUsd: number;
  launchDate?: string;
  createdAt: string;
}

const CATEGORIES = ['DeFi', 'Gaming', 'NFT', 'Social', 'Tools', 'Infrastructure', 'Bridges', 'Wallets', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
  DeFi: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  Gaming: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  NFT: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  Social: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  Tools: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  Infrastructure: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  Bridges: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  Wallets: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  Other: 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300',
};

export default function DAppsPage() {
  const [dapps, setDapps] = useState<DApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDApps();
  }, [search, category, sort, page]);

  const fetchDApps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        category,
        sort,
        page: page.toString(),
      });

      const response = await fetch(`/api/dapps?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDapps(data.dapps || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch dApps:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-zinc-300 dark:text-zinc-600 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
          {rating.toFixed(1)} ({dapps.find(d => d.ratingAverage === rating)?.ratingCount || 0})
        </span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
            dApp Directory
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Discover verified dApps built on Stellar
          </p>
        </div>
        <Link
          href="/dapps/submit"
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-semibold text-sm"
        >
          Submit dApp
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search dApps..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setCategory('all');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-end">
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="recent">Recently Added</option>
            <option value="rating">Highest Rated</option>
            <option value="users">Most Users</option>
            <option value="tvl">Highest TVL</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* dApps Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : dapps.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 ring-1 ring-zinc-900/10 dark:ring-white/10">
          <p className="text-zinc-600 dark:text-zinc-400">
            No dApps found
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {dapps.map((dapp) => (
              <Link
                key={dapp._id}
                href={`/dapps/${dapp.slug}`}
                className="rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden ring-1 ring-zinc-900/10 dark:ring-white/10 hover:ring-emerald-500/50 transition-all"
              >
                {dapp.bannerUrl && (
                  <div className="h-32 bg-zinc-200 dark:bg-zinc-800" style={{ backgroundImage: `url(${dapp.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                )}
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    {dapp.logoUrl ? (
                      <img src={dapp.logoUrl} alt={dapp.name} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {dapp.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                        {dapp.name}
                      </h3>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${CATEGORY_COLORS[dapp.category] || CATEGORY_COLORS.Other}`}>
                        {dapp.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                    {dapp.description}
                  </p>

                  <div className="space-y-2">
                    {dapp.ratingCount > 0 && (
                      <div>{renderStars(dapp.ratingAverage)}</div>
                    )}
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{dapp.totalUsers.toLocaleString()} users</span>
                      {dapp.tvlUsd > 0 && (
                        <span>${(dapp.tvlUsd / 1000).toFixed(0)}K TVL</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

