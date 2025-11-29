import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletConnect } from './useWalletConnect';
import { StellarClient } from '@/lib/stellar/client';
import * as StellarSdk from '@stellar/stellar-sdk';

export type AccountData = StellarSdk.Horizon.AccountResponse;

export interface EnhancedPortfolioData {
  // Temel hesap bilgileri
  account: AccountData;
  
  // İstatistikler
  stats: {
    totalTransactions: number;
    totalOperations: number;
    totalPayments: number;
    activeOffers: number;
    totalEffects: number;
    signersCount: number;
    hasMultiSig: boolean;
    accountAge: number; // gün cinsinden
  };
  
  // Güvenlik bilgileri
  security: {
    thresholds: {
      low_threshold: number;
      med_threshold: number;
      high_threshold: number;
    } | null;
    flags: {
      auth_required: boolean;
      auth_revocable: boolean;
      auth_immutable: boolean;
      auth_clawback_enabled: boolean;
    } | null;
    signers: Array<{
      key: string;
      weight: number;
      type: string;
    }>;
    sponsor: {
      sponsor: string | null;
      num_sponsored: number;
      num_sponsoring: number;
    } | null;
    securityScore: number; // 0-100
  };
  
  // Aktivite
  activity: {
    recentTransactions: any[];
    recentPayments: any[];
    recentEffects: any[];
    recentTrades: any[];
  };
  
  // Varlıklar ve değerler
  assets: {
    balances: Array<{
      asset: { code: string; issuer?: string };
      balance: string;
      limit: string | null;
      buyingLiabilities: string;
      sellingLiabilities: string;
    }>;
    totalValueUSD: number;
    offers: any[];
  };
  
  // Hesap yaşı ve oluşturulma tarihi
  accountInfo: {
    createdAt: Date | null;
    ageInDays: number;
    firstTransaction: any | null;
  };
}

export interface EnhancedPortfolioState {
  isLoading: boolean;
  error: string | null;
  data: EnhancedPortfolioData | null;
  lastUpdated: Date | null;
}

export const useEnhancedPortfolio = () => {
  const { wallet, isConnected } = useWalletConnect();
  const [state, setState] = useState<EnhancedPortfolioState>({
    isLoading: false,
    error: null,
    data: null,
    lastUpdated: null,
  });

  const stellarClient = useMemo(
    () => new StellarClient(wallet?.network === 'testnet'),
    [wallet?.network]
  );

  // Güvenlik skoru hesapla (0-100)
  const calculateSecurityScore = useCallback((data: {
    accountAge: number;
    signersCount: number;
    balances: any[];
    transactions: any[];
    flags: any;
  }): number => {
    let score = 0;

    // Hesap yaşı (max 25 puan)
    if (data.accountAge > 365) score += 25;
    else if (data.accountAge > 180) score += 20;
    else if (data.accountAge > 90) score += 15;
    else if (data.accountAge > 30) score += 10;
    else if (data.accountAge > 7) score += 5;

    // Multi-sig (max 25 puan)
    if (data.signersCount > 3) score += 25;
    else if (data.signersCount > 2) score += 20;
    else if (data.signersCount > 1) score += 15;
    else score += 10;

    // Asset çeşitliliği (max 20 puan)
    const assetCount = data.balances.length;
    if (assetCount > 5) score += 20;
    else if (assetCount > 3) score += 15;
    else if (assetCount > 1) score += 10;
    else score += 5;

    // Transaction geçmişi (max 20 puan)
    const txCount = data.transactions.length;
    if (txCount > 100) score += 20;
    else if (txCount > 50) score += 15;
    else if (txCount > 20) score += 10;
    else if (txCount > 5) score += 5;

    // Güvenlik bayrakları (max 10 puan)
    if (data.flags?.auth_required) score += 5;
    if (data.flags?.auth_immutable) score += 5;

    return Math.min(100, score);
  }, []);

  const loadEnhancedPortfolio = useCallback(async () => {
    if (!wallet || !isConnected) {
      setState(prev => ({
        ...prev,
        error: 'No wallet connected',
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('📊 Loading enhanced portfolio for:', wallet.publicKey);

      // Tüm verileri paralel olarak çek
      const [
        accountStats,
        accountAge,
        balances,
        trades,
        accountData
      ] = await Promise.all([
        stellarClient.getAccountStats(wallet.publicKey),
        stellarClient.getAccountAge(wallet.publicKey),
        stellarClient.getAccountBalances(wallet.publicKey),
        stellarClient.getAccountTrades(wallet.publicKey, 50).catch(() => []),
        stellarClient.getAccountData(wallet.publicKey).catch(() => ({})),
      ]);

      // İlk transaction'ı bul (hesap oluşturma zamanı)
      const firstTransaction = accountStats.activity.recentTransactions.length > 0
        ? accountStats.activity.recentTransactions[accountStats.activity.recentTransactions.length - 1]
        : null;

      const createdAt = firstTransaction ? new Date(firstTransaction.created_at) : null;

      // Güvenlik skoru hesapla
      const securityScore = calculateSecurityScore({
        accountAge,
        signersCount: accountStats.security.signers.length,
        balances,
        transactions: accountStats.activity.recentTransactions,
        flags: accountStats.security.flags,
      });

      // USD değerini hesapla (gerçek uygulamada CoinGecko/CMC'den fiyat çek)
      let totalValueUSD = 0;
      balances.forEach(balance => {
        if (balance.asset.code === 'XLM') {
          totalValueUSD += parseFloat(balance.balance) * 0.12; // ~$0.12 per XLM
        }
        // Diğer asset'ler için fiyat API'si entegre edilebilir
      });

      const enhancedData: EnhancedPortfolioData = {
        account: accountStats.account,
        stats: {
          ...accountStats.stats,
          accountAge,
        },
        security: {
          ...accountStats.security,
          securityScore,
        },
        activity: {
          ...accountStats.activity,
          recentTrades: trades,
        },
        assets: {
          balances,
          totalValueUSD,
          offers: [], // accountStats'dan offers eklenebilir
        },
        accountInfo: {
          createdAt,
          ageInDays: accountAge,
          firstTransaction,
        },
      };

      console.log('✅ Enhanced portfolio loaded:', {
        transactions: accountStats.stats.totalTransactions,
        payments: accountStats.stats.totalPayments,
        accountAge: accountAge + ' days',
        securityScore: securityScore + '/100',
        totalValue: '$' + totalValueUSD.toFixed(2),
      });

      setState({
        isLoading: false,
        error: null,
        data: enhancedData,
        lastUpdated: new Date(),
      });

    } catch (error: any) {
      console.error('❌ Enhanced portfolio loading error:', error);

      // Hesap bulunamazsa ve testnet'te ise Friendbot'tan fon iste
      if (
        (error?.isNotFound || 
         error?.message?.includes('not found') || 
         error?.message?.includes('Not Found')) &&
        wallet.network === 'testnet'
      ) {
        console.warn("⚠️ Testnet hesabı bulunamadı, Friendbot'tan fon isteniyor...");

        setState(prev => ({
          ...prev,
          isLoading: true,
          error: 'Activating testnet account with Friendbot...',
        }));

        try {
          const response = await fetch(
            `https://friendbot.stellar.org?addr=${wallet.publicKey}`
          );
          const result = await response.json();
          console.log("Friendbot response:", result);

          if (response.ok) {
            console.log("✅ Friendbot'tan XLM alındı! Portfolio yenileniyor...");
            setTimeout(() => {
              console.log("🔄 Portfolio yeniden yükleniyor...");
              loadEnhancedPortfolio();
            }, 3000);
            return;
          } else {
            console.error("❌ Friendbot hatası:", result);
          }
        } catch (friendbotError) {
          console.error("❌ Friendbot fetch hatası:", friendbotError);
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load enhanced portfolio',
      }));
    }
  }, [wallet, isConnected, stellarClient, calculateSecurityScore]);

  // Auto-load when wallet connects
  useEffect(() => {
    if (isConnected && wallet) {
      loadEnhancedPortfolio();
    } else {
      setState({
        isLoading: false,
        error: null,
        data: null,
        lastUpdated: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, wallet?.publicKey, wallet?.network]);

  return {
    ...state,
    refresh: loadEnhancedPortfolio,
  };
};
