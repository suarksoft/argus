import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletConnect } from './useWalletConnect';
import { StellarClient } from '@/lib/stellar/client';
import * as StellarSdk from '@stellar/stellar-sdk';

// Use Stellar SDK types directly
export type AccountData = StellarSdk.Horizon.AccountResponse;

export interface SecurityScore {
  overall: number;
  factors: {
    accountAge: number;
    signerComplexity: number;
    assetDiversity: number;
    transactionHistory: number;
    domainVerification: number;
  };
  threats: Array<{
    type: 'warning' | 'danger' | 'info';
    message: string;
    severity: number;
  }>;
}

export interface PortfolioState {
  isLoading: boolean;
  error: string | null;
  accountData: AccountData | null;
  securityScore: SecurityScore | null;
  totalValueUSD: number;
  lastUpdated: Date | null;
}

export const usePortfolio = () => {
  const { wallet, isConnected } = useWalletConnect();
  const [state, setState] = useState<PortfolioState>({
    isLoading: false,
    error: null,
    accountData: null,
    securityScore: null,
    totalValueUSD: 0,
    lastUpdated: null,
  });

  // Memoize stellar client to prevent recreation on every render
  const stellarClient = useMemo(
    () => new StellarClient(wallet?.network === 'testnet'),
    [wallet?.network]
  );

  const calculateSecurityScore = useCallback((accountData: AccountData): SecurityScore => {
    const factors = {
      accountAge: 0,
      signerComplexity: 0,
      assetDiversity: 0,
      transactionHistory: 0,
      domainVerification: 0,
    };

    const threats: SecurityScore['threats'] = [];

    // Account Age (0-25 points)
    const accountAgeHours = (Date.now() - new Date(accountData.last_modified_time || Date.now()).getTime()) / (1000 * 60 * 60);
    if (accountAgeHours > 24 * 30) { // 30+ days
      factors.accountAge = 25;
    } else if (accountAgeHours > 24 * 7) { // 7+ days
      factors.accountAge = 15;
    } else if (accountAgeHours > 24) { // 1+ day
      factors.accountAge = 10;
      threats.push({
        type: 'warning',
        message: 'Account is relatively new (less than 7 days old)',
        severity: 2,
      });
    } else {
      factors.accountAge = 0;
      threats.push({
        type: 'danger',
        message: 'Account is very new (less than 24 hours old)',
        severity: 4,
      });
    }

    // Signer Complexity (0-20 points)
    const signerCount = accountData.signers.length;
    const hasMultiSig = signerCount > 1;
    if (hasMultiSig) {
      factors.signerComplexity = 20;
    } else {
      factors.signerComplexity = 10;
      threats.push({
        type: 'info',
        message: 'Consider enabling multi-signature for enhanced security',
        severity: 1,
      });
    }

    // Asset Diversity (0-20 points)
    const assetCount = accountData.balances.length;
    if (assetCount > 5) {
      factors.assetDiversity = 20;
    } else if (assetCount > 2) {
      factors.assetDiversity = 15;
    } else {
      factors.assetDiversity = 10;
    }

    // Transaction History (0-20 points) - Based on subentry count as proxy
    if (accountData.subentry_count > 10) {
      factors.transactionHistory = 20;
    } else if (accountData.subentry_count > 5) {
      factors.transactionHistory = 15;
    } else {
      factors.transactionHistory = 10;
    }

    // Domain Verification (0-15 points)
    if (accountData.home_domain) {
      factors.domainVerification = 15;
    } else {
      factors.domainVerification = 0;
      threats.push({
        type: 'info',
        message: 'No home domain set for account verification',
        severity: 1,
      });
    }

    // Check for security flags
    if (accountData.flags.auth_required) {
      threats.push({
        type: 'info',
        message: 'Authorization required flag is enabled',
        severity: 1,
      });
    }

    if (accountData.flags.auth_clawback_enabled) {
      threats.push({
        type: 'warning',
        message: 'Clawback enabled - issuer can reclaim assets',
        severity: 3,
      });
    }

    const overall = Object.values(factors).reduce((sum, score) => sum + score, 0);

    return {
      overall,
      factors,
      threats,
    };
  }, []);

  const loadPortfolio = useCallback(async () => {
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
      console.log('Loading portfolio for:', wallet.publicKey);

      // Load account data from Stellar
      const accountData = await stellarClient.loadAccount(wallet.publicKey);
      
      if (!accountData) {
        throw new Error('Account not found on Stellar network');
      }

      // Calculate security score
      const securityScore = calculateSecurityScore(accountData);

      // Calculate total value (simplified - in real app, fetch prices from external API)
      let totalValueUSD = 0;
      accountData.balances.forEach(balance => {
        if (balance.asset_type === 'native') {
          // XLM price estimation (in real app, fetch from CoinGecko/CMC)
          totalValueUSD += parseFloat(balance.balance) * 0.12; // ~$0.12 per XLM
        }
        // Add other asset valuations here
      });

      setState({
        isLoading: false,
        error: null,
        accountData,
        securityScore,
        totalValueUSD,
        lastUpdated: new Date(),
      });

    } catch (error: any) {
      console.error('Portfolio loading error:', error);
      
      // Hesap bulunamazsa ve testnet'te ise Friendbot'tan fon iste
      if ((error?.isNotFound || error?.message?.includes('not found') || error?.message?.includes('Not Found')) 
          && wallet.network === 'testnet') {
        console.warn("⚠️ Testnet hesabı bulunamadı, Friendbot'tan fon isteniyor...");
        
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: 'Activating testnet account with Friendbot...',
        }));
        
        try {
          const response = await fetch(`https://friendbot.stellar.org?addr=${wallet.publicKey}`);
          const result = await response.json();
          console.log("Friendbot response:", result);
          
          if (response.ok) {
            console.log("✅ Friendbot'tan XLM alındı! Portfolio yenileniyor...");
            // 3 saniye bekle ve tekrar dene
            setTimeout(() => {
              console.log("🔄 Portfolio yeniden yükleniyor...")
              loadPortfolio()
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
        error: error instanceof Error ? error.message : 'Failed to load portfolio',
      }));
    }
  }, [wallet, isConnected, stellarClient, calculateSecurityScore]);

  // Auto-load portfolio when wallet connects
  useEffect(() => {
    if (isConnected && wallet) {
      loadPortfolio();
    } else {
      setState({
        isLoading: false,
        error: null,
        accountData: null,
        securityScore: null,
        totalValueUSD: 0,
        lastUpdated: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, wallet?.publicKey, wallet?.network]);

  const refresh = useCallback(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  return {
    ...state,
    refresh,
  };
};
