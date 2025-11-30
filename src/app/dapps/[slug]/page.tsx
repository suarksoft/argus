'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Contract {
  _id: string;
  contractId: string;
  name: string;
  network: string;
  securityScore: number;
  riskLevel: string;
}

interface Review {
  _id: string;
  reviewerAddress: string;
  rating: number;
  title: string;
  content: string;
  createdAt: string;
}

interface DAppDetail {
  _id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  category: string;
  screenshots: string[];
  ownerAddress: string;
  isVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
  totalUsers: number;
  tvlUsd: number;
  launchDate?: string;
  createdAt: string;
  contracts: Contract[];
  reviews: Review[];
}

export default function DAppDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [dapp, setDapp] = useState<DAppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchDApp();
    }
  }, [slug]);

  const fetchDApp = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dapps/${slug}`);
      const data = await response.json();

      if (data.success) {
        setDapp(data.dapp);
      } else {
        setError(data.error || 'dApp not found');
      }
    } catch (err) {
      setError('Failed to load dApp');
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
          <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        {hasHalfStar && (
          <svg className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
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
          <svg key={i} className="w-5 h-5 text-zinc-300 dark:text-zinc-600 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
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

  if (error || !dapp) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'dApp not found'}</p>
        <Link href="/dapps" className="text-emerald-400 hover:underline">
          ← Back to dApps
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <Link href="/dapps" className="text-emerald-400 hover:underline text-sm mb-4 inline-block">
        ← Back to dApps
      </Link>

      {/* Banner */}
      {dapp.bannerUrl && (
        <div className="mb-6 rounded-2xl overflow-hidden h-64 bg-zinc-200 dark:bg-zinc-800">
          <img src={dapp.bannerUrl} alt={dapp.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Main Info */}
      <div className="mb-8">
        <div className="flex items-start gap-6 mb-6">
          {dapp.logoUrl ? (
            <img src={dapp.logoUrl} alt={dapp.name} className="w-24 h-24 rounded-2xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                {dapp.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
              {dapp.name}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">{dapp.description}</p>
            <div className="flex items-center gap-4 flex-wrap">
              {dapp.ratingCount > 0 && (
                <div className="flex items-center gap-2">
                  {renderStars(dapp.ratingAverage)}
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {dapp.ratingAverage.toFixed(1)} ({dapp.ratingCount} reviews)
                  </span>
                </div>
              )}
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                {dapp.category}
              </span>
              {dapp.isVerified && (
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 flex-wrap">
          {dapp.websiteUrl && (
            <a
              href={dapp.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Website
            </a>
          )}
          {dapp.githubUrl && (
            <a
              href={dapp.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23 1.957-.538 4.064-.538 6.061 0 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          )}
          {dapp.twitterUrl && (
            <a
              href={dapp.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
              </svg>
              Twitter
            </a>
          )}
          {dapp.discordUrl && (
            <a
              href={dapp.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discord
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{dapp.ratingAverage.toFixed(1)}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Rating</div>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{dapp.ratingCount}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Reviews</div>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{dapp.totalUsers.toLocaleString()}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Users</div>
        </div>
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            ${dapp.tvlUsd > 0 ? (dapp.tvlUsd / 1000).toFixed(0) + 'K' : '0'}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">TVL</div>
        </div>
      </div>

      {/* Verified Contracts */}
      {dapp.contracts.length > 0 && (
        <div className="mb-8 rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">Verified Contracts</h2>
          <div className="space-y-3">
            {dapp.contracts.map((contract) => (
              <Link
                key={contract._id}
                href={`/contracts/${contract.contractId}?network=${contract.network}`}
                className="block p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-white">{contract.name}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {contract.contractId.slice(0, 12)}...{contract.contractId.slice(-8)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {contract.securityScore}/100
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                      {contract.network}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
          Reviews ({dapp.reviews.length})
        </h2>
        {dapp.reviews.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {dapp.reviews.map((review) => (
              <div key={review._id} className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-white mb-1">
                      {review.title}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {review.reviewerAddress.slice(0, 8)}...{review.reviewerAddress.slice(-6)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{review.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

