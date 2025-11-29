import { StellarClient } from '../stellar/client';
import { AssetAnalyzer } from '../analyzer/asset-analyzer';
import { RiskLevel } from '../analyzer/types';

export interface PortfolioAsset {
  asset_code: string;
  asset_issuer: string;
  balance: string;
  limit?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  isVerified: boolean;
  isBlacklisted: boolean;
}

export interface PortfolioAnalysis {
  accountId: string;
  totalAssets: number;
  xlmBalance: string;
  assets: PortfolioAsset[];
  overallRisk: {
    level: RiskLevel;
    score: number;
    highRiskCount: number;
    safeCount: number;
  };
  warnings: string[];
  scannedAt: string;
}

/**
 * Portfolio Scanner Service
 * Scans a Stellar account and analyzes all holdings
 */
export class PortfolioScanner {
  private stellarClient: StellarClient;
  private assetAnalyzer: AssetAnalyzer;

  constructor() {
    this.stellarClient = new StellarClient();
    this.assetAnalyzer = new AssetAnalyzer();
  }

  /**
   * Scan an entire portfolio
   */
  async scanPortfolio(accountId: string): Promise<PortfolioAnalysis> {
    try {
      // Load account data
      const account = await this.stellarClient.loadAccount(accountId);
      
      // Get XLM balance
      const xlmBalance = account.balances.find(
        (b: any) => b.asset_type === 'native'
      )?.balance || '0';

      // Get all non-XLM assets
      const assetBalances = account.balances.filter(
        (b: any) => b.asset_type !== 'native'
      );

      // Analyze each asset
      const analyzedAssets: PortfolioAsset[] = [];
      const warnings: string[] = [];

      for (const balance of assetBalances) {
        // Type guard for asset balances
        if ('asset_code' in balance && 'asset_issuer' in balance) {
          try {
            const analysis = await this.assetAnalyzer.analyzeAsset(
              balance.asset_code,
              balance.asset_issuer
            );

            const portfolioAsset: PortfolioAsset = {
              asset_code: balance.asset_code,
              asset_issuer: balance.asset_issuer,
              balance: balance.balance,
              limit: 'limit' in balance ? balance.limit : undefined,
              riskLevel: analysis.riskLevel,
              riskScore: analysis.riskScore,
              isVerified: analysis.metadata.isVerified,
              isBlacklisted: analysis.threats.some(
                (t) => t.type === 'BLACKLISTED_ASSET'
              ),
            };

            analyzedAssets.push(portfolioAsset);

            // Add warnings for high-risk or blacklisted assets
            if (portfolioAsset.isBlacklisted) {
              warnings.push(
                `CRITICAL: ${balance.asset_code} is blacklisted! Consider removing immediately.`
              );
            } else if (analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH') {
              warnings.push(
                `${analysis.riskLevel}: ${balance.asset_code} has ${analysis.threats.length} threat(s).`
              );
            }
          } catch (error) {
            // If analysis fails, mark as unknown
            analyzedAssets.push({
              asset_code: balance.asset_code,
              asset_issuer: balance.asset_issuer,
              balance: balance.balance,
              limit: 'limit' in balance ? balance.limit : undefined,
              riskLevel: 'MEDIUM',
              riskScore: 50,
              isVerified: false,
              isBlacklisted: false,
            });
            
            warnings.push(
              `Could not analyze ${balance.asset_code} - treat with caution.`
            );
          }
        }
      }

      // Calculate overall risk
      const totalScore = analyzedAssets.reduce(
        (sum, asset) => sum + asset.riskScore,
        0
      );
      const avgScore = analyzedAssets.length > 0 
        ? totalScore / analyzedAssets.length 
        : 0;

      const highRiskCount = analyzedAssets.filter(
        (a) => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL'
      ).length;

      const safeCount = analyzedAssets.filter(
        (a) => a.riskLevel === 'SAFE' || a.riskLevel === 'LOW'
      ).length;

      let overallRiskLevel: RiskLevel = 'SAFE';
      if (avgScore >= 70) overallRiskLevel = 'CRITICAL';
      else if (avgScore >= 50) overallRiskLevel = 'HIGH';
      else if (avgScore >= 30) overallRiskLevel = 'MEDIUM';
      else if (avgScore >= 10) overallRiskLevel = 'LOW';

      return {
        accountId,
        totalAssets: analyzedAssets.length,
        xlmBalance,
        assets: analyzedAssets,
        overallRisk: {
          level: overallRiskLevel,
          score: Math.round(avgScore),
          highRiskCount,
          safeCount,
        },
        warnings,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Portfolio scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Quick risk check for an account (lighter operation)
   */
  async quickRiskCheck(accountId: string): Promise<{
    hasHighRiskAssets: boolean;
    riskCount: number;
    totalAssets: number;
  }> {
    try {
      const account = await this.stellarClient.loadAccount(accountId);
      const assetBalances = account.balances.filter(
        (b: any) => b.asset_type !== 'native'
      );

      let riskCount = 0;

      for (const balance of assetBalances) {
        if ('asset_code' in balance && 'asset_issuer' in balance) {
          try {
            const analysis = await this.assetAnalyzer.analyzeAsset(
              balance.asset_code,
              balance.asset_issuer
            );

            if (
              analysis.riskLevel === 'HIGH' ||
              analysis.riskLevel === 'CRITICAL'
            ) {
              riskCount++;
            }
          } catch {
            // Skip failed analyses
          }
        }
      }

      return {
        hasHighRiskAssets: riskCount > 0,
        riskCount,
        totalAssets: assetBalances.length,
      };
    } catch (error) {
      throw new Error(
        `Risk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton
export const portfolioScanner = new PortfolioScanner();
