'use client';

import React, { useState, useEffect } from 'react';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { RiskAnalysisCard } from '@/components/security/RiskAnalysisCard';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarClient } from '@/lib/stellar/client';

interface SendAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Array<{
    asset: { code: string; issuer?: string };
    balance: string;
  }>;
  onSuccess?: () => void;
}

interface AddressAnalysis {
  riskScore: number;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  aiExplanation: string;
  threats: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  }>;
  recommendations: string[];
  metadata: any;
  communityInfo?: {
    reportCount: number;
    verifiedReports: number;
    lastReported?: string;
  };
}

export const SendAssetModal: React.FC<SendAssetModalProps> = ({
  isOpen,
  onClose,
  assets,
  onSuccess,
}) => {
  const { wallet, signTransaction } = useWalletConnect();
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  
  // Security analysis
  const [analysis, setAnalysis] = useState<AddressAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  // Real-time address analysis (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (destination && destination.startsWith('G') && destination.length === 56) {
        analyzeRecipient(destination);
      } else {
        setAnalysis(null);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [destination]);

  const analyzeRecipient = async (address: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Analyzing recipient address:', address);
      
      // Call Next.js API Route (comprehensive analysis)
      const response = await fetch('/api/analytics/comprehensive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          context: {
            senderAddress: wallet?.publicKey,
            amount,
            asset: selectedAsset.asset.code,
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Analysis result:', data.data);
        setAnalysis(data.data);
      } else {
        console.error('Analysis failed:', data.error);
        setError('Failed to analyze address');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      // Don't block the user, just log the error
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!wallet || !destination || !amount) {
      setError('Please fill in all fields');
      return;
    }

    // Address validation
    if (!destination.startsWith('G') || destination.length !== 56) {
      setError('Invalid Stellar address format');
      return;
    }

    // Amount validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount');
      return;
    }

    // Balance check
    const balance = parseFloat(selectedAsset.balance);
    if (amountNum > balance) {
      setError('Insufficient balance');
      return;
    }

    // Risk check - block if CRITICAL
    if (analysis?.riskLevel === 'CRITICAL') {
      setError(' BLOCKED: This address is flagged as critical risk. Transaction cannot proceed.');
      return;
    }

    // Show warning for HIGH risk
    if (analysis?.riskLevel === 'HIGH' && !showRiskWarning) {
      setShowRiskWarning(true);
      return;
    }

    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!wallet) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const stellarClient = new StellarClient(wallet.network === 'testnet');
      const server = new StellarSdk.Horizon.Server(
        wallet.network === 'testnet'
          ? 'https://horizon-testnet.stellar.org'
          : 'https://horizon.stellar.org'
      );

      const sourceAccount = await stellarClient.loadAccount(wallet.publicKey);

      let transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase:
          wallet.network === 'testnet'
            ? StellarSdk.Networks.TESTNET
            : StellarSdk.Networks.PUBLIC,
      });

      let asset: StellarSdk.Asset;
      if (selectedAsset.asset.code === 'XLM') {
        asset = StellarSdk.Asset.native();
      } else {
        asset = new StellarSdk.Asset(
          selectedAsset.asset.code,
          selectedAsset.asset.issuer!
        );
      }

      transaction = transaction.addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset,
          amount: amount.toString(),
        })
      );

      if (memo) {
        transaction = transaction.addMemo(StellarSdk.Memo.text(memo));
      }

      transaction = transaction.setTimeout(180);
      const builtTransaction = transaction.build();
      const xdr = builtTransaction.toXDR();

      const signedXdr = await signTransaction(xdr);

      const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        stellarClient.networkPassphrase
      );

      await server.submitTransaction(transactionToSubmit as any);

      setSuccess(true);
      setAmount('');
      setDestination('');
      setMemo('');
      setStep('form');
      setAnalysis(null);
      setShowRiskWarning(false);

      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err?.message || 'Transaction failed');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {step === 'form' ? 'Send Assets' : 'Confirm Transaction'}
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
          {success ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                Transaction Successful
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your assets have been sent successfully
              </p>
            </div>
          ) : step === 'form' ? (
            <div className="space-y-6">
              {/* Error */}
              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/30 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                  </div>
                </div>
              )}

              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  Select Asset
                </label>
                <select
                  value={`${selectedAsset.asset.code}-${selectedAsset.asset.issuer || 'native'}`}
                  onChange={(e) => {
                    const [code, issuer] = e.target.value.split('-');
                    const asset = assets.find(
                      (a) => a.asset.code === code && (a.asset.issuer || 'native') === issuer
                    );
                    if (asset) setSelectedAsset(asset);
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {assets.map((asset) => (
                    <option
                      key={`${asset.asset.code}-${asset.asset.issuer || 'native'}`}
                      value={`${asset.asset.code}-${asset.asset.issuer || 'native'}`}
                    >
                      {asset.asset.code} - {parseFloat(asset.balance).toLocaleString()} available
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Address */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  Recipient Address
                  {isAnalyzing && (
                    <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                      Analyzing security...
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.trim())}
                  placeholder="GABC..."
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Real-time security analysis enabled
                </p>
              </div>

              {/* Risk Analysis Card */}
              {analysis && (
                <RiskAnalysisCard
                  riskScore={analysis.riskScore}
                  riskLevel={analysis.riskLevel}
                  aiExplanation={analysis.aiExplanation}
                  threats={analysis.threats}
                  isAnalyzing={isAnalyzing}
                  address={destination}
                  communityInfo={analysis.communityInfo}
                />
              )}

              {/* High Risk Warning Modal */}
              {showRiskWarning && analysis?.riskLevel === 'HIGH' && (
                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-500/50 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <svg className="w-8 h-8 text-orange-600 dark:text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-orange-900 dark:text-orange-100 text-lg mb-2">
                        High Risk Transaction
                      </h4>
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        Are you absolutely sure you want to proceed? This address has been flagged as high risk.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRiskWarning(false);
                        setDestination('');
                      }}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    >
                      Cancel (Recommended)
                    </button>
                    <button
                      onClick={() => {
                        setShowRiskWarning(false);
                        setStep('confirm');
                      }}
                      className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors font-semibold"
                    >
                      Proceed Anyway
                    </button>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.0000001"
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(selectedAsset.balance)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Available: {parseFloat(selectedAsset.balance).toLocaleString()} {selectedAsset.asset.code}
                </p>
              </div>

              {/* Memo (Optional) */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  Memo (Optional)
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Optional transaction memo"
                  maxLength={28}
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={
                  !destination || 
                  !amount || 
                  isAnalyzing || 
                  analysis?.riskLevel === 'CRITICAL'
                }
                className={`w-full px-6 py-4 rounded-xl font-semibold text-white transition-all ${
                  analysis?.riskLevel === 'CRITICAL'
                    ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {analysis?.riskLevel === 'CRITICAL' 
                  ? ' Transaction Blocked (Critical Risk)' 
                  : 'Review Transaction'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Confirmation Details */}
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-6 space-y-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                  Transaction Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Sending</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {amount} {selectedAsset.asset.code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">To</span>
                    <span className="font-mono text-sm text-zinc-900 dark:text-white">
                      {destination.slice(0, 12)}...{destination.slice(-12)}
                    </span>
                  </div>
                  {memo && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Memo</span>
                      <span className="text-zinc-900 dark:text-white">{memo}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Network</span>
                    <span className="text-zinc-900 dark:text-white">
                      {wallet?.network === 'testnet' ? 'Testnet' : 'Mainnet'}
                    </span>
                  </div>
                  {analysis && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Risk Level</span>
                      <span className={`font-semibold ${
                        analysis.riskLevel === 'SAFE' ? 'text-emerald-600' :
                        analysis.riskLevel === 'LOW' ? 'text-sky-600' :
                        analysis.riskLevel === 'MEDIUM' ? 'text-amber-600' :
                        'text-orange-600'
                      }`}>
                        {analysis.riskLevel} ({analysis.riskScore}/100)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Warning */}
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Transactions on Stellar are irreversible. Verify all details carefully.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors font-semibold disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Confirm & Send'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
