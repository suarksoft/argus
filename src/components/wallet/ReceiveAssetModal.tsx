'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useWalletConnect } from '@/hooks/useWalletConnect';

interface ReceiveAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveAssetModal: React.FC<ReceiveAssetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { wallet } = useWalletConnect();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !wallet) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.publicKey}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Receive Crypto</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white border-2 border-zinc-200 dark:border-zinc-700 rounded-xl">
              <Image
                src={qrCodeUrl}
                alt="Wallet QR Code"
                width={192}
                height={192}
                className="w-48 h-48"
              />
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
              Your Wallet Address ({wallet.network})
            </label>
            <div className="relative">
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-sm break-all text-zinc-900 dark:text-white">
                {wallet.publicKey}
              </div>
              <button
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-2xl"></span>
              <div className="flex-1">
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1">Important Information</h4>
                <ul className="text-sm text-emerald-800 dark:text-emerald-400 space-y-1">
                  <li>• Only send Stellar ({wallet.network}) assets</li>
                  <li>• You can use the QR code or copy the address</li>
                  <li>• Some exchanges may require a memo</li>
                  <li>• Transactions will appear automatically once confirmed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Network Badge */}
          <div className="flex items-center justify-center space-x-2">
            <div className={`px-4 py-2 rounded-full ${
              wallet.network === 'testnet' 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' 
                : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            }`}>
              <span className="font-semibold">
                {wallet.network === 'testnet' ? ' Testnet' : ' Mainnet'}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
