'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletConnect, WalletType } from '@/hooks/useWalletConnect';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletConnectModal = ({ isOpen, onClose }: WalletConnectModalProps) => {
  const router = useRouter();
  const { connect, getAvailableWallets, isConnecting, error } = useWalletConnect();
  const [availableWallets, setAvailableWallets] = useState<Awaited<ReturnType<typeof getAvailableWallets>>>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setChecking(true);
      getAvailableWallets().then(wallets => {
        setAvailableWallets(wallets);
        setChecking(false);
      });
    }
  }, [isOpen, getAvailableWallets]);

  const handleConnectWallet = async (walletType: WalletType) => {
    try {
      const walletInfo = await connect(walletType);
      console.log('Wallet connected successfully:', walletInfo);
      console.log('Redirecting to defense-wallet...');
      
      // Close modal first
      onClose();
      
      // Then redirect after brief delay
      setTimeout(() => {
        console.log('Executing redirect to /defense-wallet');
        router.push('/defense-wallet');
        router.refresh(); // Force refresh to load wallet data
      }, 100);
    } catch (error) {
      console.error('Connection error:', error);
      // Error is already in state, modal will show it
    }
  };

  if (!isOpen) return null;

  const installedWallets = availableWallets.filter(w => w.installed);
  const notInstalledWallets = availableWallets.filter(w => !w.installed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ring-1 ring-zinc-950/10 dark:ring-white/10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
              Connect Wallet
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Error Display */}
            {error && (
              <div className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-rose-900 dark:text-rose-100">Connection Error</p>
                    <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">{error}</p>
                    
                    {error.includes('not detected') && (
                      <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-3">
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-2">
                          Quick Fix
                        </p>
                        <ol className="text-xs text-amber-800 dark:text-amber-200 space-y-1 ml-4">
                          <li>1. Right-click Freighter icon in Chrome toolbar</li>
                          <li>2. Select &quot;Manage Extension&quot;</li>
                          <li>3. Set &quot;Site access&quot; to &quot;On all sites&quot;</li>
                          <li>4. Refresh this page</li>
                        </ol>
                        <button
                          onClick={() => window.location.reload()}
                          className="mt-3 w-full px-3 py-2 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          Refresh Page
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {checking && (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}

            {/* Available Wallets */}
            {!checking && installedWallets.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Available Wallets</p>
                {installedWallets.map((wallet) => (
                  <button
                    key={wallet.type}
                    onClick={() => handleConnectWallet(wallet.type)}
                    disabled={isConnecting}
                    className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-900/20 dark:to-sky-900/20 p-4 ring-1 ring-zinc-900/10 dark:ring-white/10 hover:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                        
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {wallet.name}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {wallet.description}
                        </p>
                      </div>
                      {isConnecting ? (
                        <svg className="animate-spin h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Wallet Detected */}
            {!checking && installedWallets.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  No Wallet Detected
                </h3>
                
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
                  Freighter wallet extension is required to connect. Please install and configure it.
                </p>

                <div className="space-y-3">
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-4 text-left">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Setup Steps
                    </p>
                    <ol className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                      <li className="flex gap-2">
                        <span className="font-bold">1.</span>
                        <span>Install Freighter from <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">freighter.app</a></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">2.</span>
                        <span>Right-click extension icon → Manage Extension</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">3.</span>
                        <span>Set &quot;Site access&quot; to &quot;On all sites&quot;</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="font-bold">4.</span>
                        <span>Refresh this page</span>
                      </li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href="https://freighter.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      Download Freighter
                    </a>
                    <button
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center justify-center px-4 py-3 bg-zinc-600 text-white text-sm font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            {!checking && (
              <div className="mt-6 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-500/30 p-4">
                <p className="text-xs text-sky-900 dark:text-sky-100">
                  <strong>Secure Connection:</strong> Your private keys never leave your wallet. 
                  We only request permission to read your public address and sign transactions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
