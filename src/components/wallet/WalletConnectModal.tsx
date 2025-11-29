'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletConnect, WalletType } from '@/hooks/useWalletConnect';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletOption {
  type: WalletType;
  name: string;
  installed: boolean;
  description: string;
}

const walletIcons: Record<WalletType, string> = {
  freighter: '',
  albedo: '',
  rabet: '',
};

const walletColors: Record<WalletType, string> = {
  freighter: 'from-purple-500 to-blue-500',
  albedo: 'from-yellow-400 to-orange-500',
  rabet: 'from-orange-500 to-red-500',
};

export const WalletConnectModal = ({ isOpen, onClose }: WalletConnectModalProps) => {
  const router = useRouter();
  const { connect, getAvailableWallets, isConnecting, error } = useWalletConnect();
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      const updateWallets = async () => {
        try {
          const wallets = await getAvailableWallets();
          console.log('Available wallets:', wallets);
          setAvailableWallets(wallets);
        } catch (err) {
          console.error('Error getting wallets:', err);
        }
      };

      updateWallets();

      const timers = [
        setTimeout(updateWallets, 500),
        setTimeout(updateWallets, 1000),
        setTimeout(updateWallets, 2000),
      ];
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [isOpen, getAvailableWallets]);

  const handleConnectWallet = async (walletType: WalletType) => {
    try {
      const walletInfo = await connect(walletType);
      console.log('Wallet connected successfully:', walletInfo);
      
      setTimeout(() => {
        onClose();
        router.push('/defense-wallet');
      }, 300);
    } catch (err) {
      console.error(`${walletType} connection error:`, err);
    }
  };

  if (!isOpen) return null;

  const installedWallets = availableWallets.filter((w: WalletOption) => w.installed);
  const notInstalledWallets = availableWallets.filter((w: WalletOption) => !w.installed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full mx-4 shadow-2xl ring-1 ring-zinc-950/5 dark:ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Installed Wallets */}
          {installedWallets.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Available Wallets</h3>
              <div className="space-y-3">
                {installedWallets.map((wallet) => (
                  <button
                    key={wallet.type}
                    onClick={() => handleConnectWallet(wallet.type)}
                    disabled={isConnecting}
                    className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-linear-to-r ${walletColors[wallet.type]} rounded-full flex items-center justify-center`}>
                        <span className="text-xl">{walletIcons[wallet.type]}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-zinc-900 dark:text-white flex items-center">
                          {wallet.name}
                          {isConnecting && (
                            <span className="ml-2 px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
                              Connecting...
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {wallet.description}
                        </div>
                      </div>
                      <div className="text-zinc-400">
                        →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Not Installed Wallets */}
          {notInstalledWallets.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Install a Wallet</h3>
              <div className="space-y-3">
                {notInstalledWallets.map((wallet) => (
                  <div
                    key={wallet.type}
                    className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-75"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 bg-linear-to-r ${walletColors[wallet.type]} rounded-full flex items-center justify-center opacity-50`}>
                        <span className="text-xl">{walletIcons[wallet.type]}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-zinc-600 dark:text-zinc-400">
                          {wallet.name}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {wallet.description}
                        </div>
                      </div>
                      <div className="text-zinc-400 text-xs">
                        Not Installed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Wallets Available */}
          {installedWallets.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl"></span>
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">No Wallet Detected</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Install Freighter wallet to connect to Argus
              </p>
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                 Install Freighter
              </a>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              <strong>Secure Connection:</strong> Your wallet credentials never leave your device. 
              We only request permission to read your public key and sign transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
