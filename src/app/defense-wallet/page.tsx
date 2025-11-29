'use client';

import React, { useState } from 'react';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { useEnhancedPortfolio } from '@/hooks/useEnhancedPortfolio';
import { WalletConnectModal } from '@/components/WalletConnectModal';
import { SendAssetModal } from '@/components/wallet/SendAssetModal';
import { ReceiveAssetModal } from '@/components/wallet/ReceiveAssetModal';

export default function DefenseWallet() {
  const { wallet, isConnected, disconnect } = useWalletConnect();
  const { data, isLoading, error, refresh } = useEnhancedPortfolio();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Not connected state
  if (!isConnected) {
    return (
      <>
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
              <svg className="h-10 w-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Defense Wallet
            </h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Connect your Stellar wallet to monitor portfolio security and detect threats in real-time
            </p>
          </div>

          <button
            onClick={() => setShowConnectModal(true)}
            className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-emerald-500 transition-colors"
          >
            Connect Wallet
          </button>

          <div className="mt-8 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
              Features
            </h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Real-time portfolio monitoring</span>
              </li>
              <li className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Security score and threat detection</span>
              </li>
              <li className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Asset risk analysis</span>
              </li>
              <li className="flex gap-3">
                <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Transaction history and insights</span>
              </li>
            </ul>
          </div>
        </div>

        <WalletConnectModal 
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      </>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
            <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-2xl text-center py-24">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30">
          <svg className="h-10 w-10 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
          Error Loading Portfolio
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">{error}</p>
        <button
          onClick={refresh}
          className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Main dashboard
  return (
    <>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Defense Wallet
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Monitor your portfolio security and protect your assets
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="rounded-xl bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-white ring-1 ring-zinc-900/10 dark:ring-white/10 hover:ring-zinc-900/20 dark:hover:ring-white/20 transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              </button>
              <button
                onClick={disconnect}
                className="rounded-xl bg-rose-50 dark:bg-rose-900/20 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 ring-1 ring-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Connected Wallet Info */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-4 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-5 w-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Connected Account
                  </div>
                  <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                    {wallet?.publicKey.slice(0, 8)}...{wallet?.publicKey.slice(-8)}
                  </div>
                </div>
              </div>
              <div className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                wallet?.network === 'testnet'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              }`}>
                {wallet?.network === 'testnet' ? 'Testnet' : 'Mainnet'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Value</h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-5 w-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
              ${data?.assets.totalValueUSD.toFixed(2) || '0.00'}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {data?.assets.balances.length || 0} assets
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Security Score</h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-5 w-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
              {data?.security.securityScore || 0}/100
            </p>
            <div className="mt-3 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${data?.security.securityScore || 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Account Age</h3>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-5 w-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
              {data?.accountInfo.ageInDays || 0}d
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {data?.stats.totalTransactions || 0} transactions
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowSendModal(true)}
            className="group rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:ring-emerald-500/50 transition-all text-center"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
              <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div className="font-semibold text-zinc-900 dark:text-white">Send</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Transfer assets</div>
          </button>

          <button
            onClick={() => setShowReceiveModal(true)}
            className="group rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:ring-sky-500/50 transition-all text-center"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 group-hover:bg-sky-200 dark:group-hover:bg-sky-900/50 transition-colors">
              <svg className="h-7 w-7 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
              </svg>
            </div>
            <div className="font-semibold text-zinc-900 dark:text-white">Receive</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Get your address</div>
          </button>

          <button
            disabled
            className="group rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10 opacity-50 text-center cursor-not-allowed"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <svg className="h-7 w-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div className="font-semibold text-zinc-900 dark:text-white">Swap</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Coming soon</div>
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Assets</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data?.assets.balances.map((balance: any, index: number) => (
                <div key={index} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {balance.asset.code.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-white">{balance.asset.code}</h4>
                        {balance.asset.issuer && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                            {balance.asset.issuer.slice(0, 8)}...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-white">
                        {parseFloat(balance.balance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Stats */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Transactions</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{data?.stats.totalTransactions || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Payments</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{data?.stats.totalPayments || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Operations</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{data?.stats.totalOperations || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Active Offers</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{data?.stats.activeOffers || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 ring-1 ring-zinc-900/10 dark:ring-white/10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {data?.activity.recentTransactions.slice(0, 5).map((tx: any, index: number) => (
              <div key={index} className="flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3">
                <div>
                  <p className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                    {tx.hash.slice(0, 16)}...{tx.hash.slice(-8)}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {tx.operation_count} ops
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {tx.successful ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Success</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">Failed</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {data && (
        <>
          <SendAssetModal
            isOpen={showSendModal}
            onClose={() => setShowSendModal(false)}
            assets={data.assets.balances}
            onSuccess={refresh}
          />
          <ReceiveAssetModal
            isOpen={showReceiveModal}
            onClose={() => setShowReceiveModal(false)}
          />
        </>
      )}
    </>
  );
}
