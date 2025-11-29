import { stellarClient } from '@/lib/stellar/client';
import { AssetAnalysis, Threat } from './types';
import { calculateRiskScore, getRiskLevel, generateRecommendations } from './risk-scorer';
import { assetDatabase } from '@/lib/database/asset-service';

export class AssetAnalyzer {
  /**
   * Main analysis function
   */
  async analyzeAsset(assetCode: string, issuerAddress: string): Promise<AssetAnalysis> {
    const threats: Threat[] = [];
    
    try {
      // 0. Check database first
      const blacklisted = await assetDatabase.isBlacklisted(assetCode, issuerAddress);
      if (blacklisted) {
        threats.push({
          type: 'BLACKLISTED_ASSET',
          severity: 'CRITICAL',
          description: 'Asset is blacklisted',
          technical: blacklisted.reason,
          explanation: 'This asset has been identified as potentially fraudulent or dangerous. Do not trade or hold this asset.',
        });
      }

      const isVerified = await assetDatabase.isVerified(assetCode, issuerAddress);
      
      // Load issuer account
      const issuerAccount = await stellarClient.loadAccount(issuerAddress);
      
      // 1. Flag Analysis
      const flagThreats = this.analyzeFlags(issuerAccount);
      threats.push(...flagThreats);
      
      // 2. Home Domain Check
      const domainThreats = await this.analyzeHomeDomain(issuerAccount, issuerAddress);
      threats.push(...domainThreats);
      
      // 3. Account Age Check
      const ageThreats = await this.analyzeAccountAge(issuerAddress);
      threats.push(...ageThreats);
      
      // Gather context for risk calculation (to avoid false positives)
      const accountAge = await stellarClient.getAccountAge(issuerAddress);
      const tomlValid = issuerAccount.home_domain 
        ? await stellarClient.verifyToml(issuerAccount.home_domain, issuerAddress)
        : false;
      
      // Check if whitelisted
      const isWhitelisted = await assetDatabase.isWhitelisted(assetCode, issuerAddress);
      
      // Get transaction count (approximate from account operations)
      const transactionCount = await stellarClient.getTransactionCount(issuerAddress);
      
      // Calculate final risk with context (reduces false positives for new legit projects)
      const riskScore = calculateRiskScore(threats, {
        accountAge,
        isVerified,
        hasValidToml: tomlValid,
        isWhitelisted,
        transactionCount,
        hasMultiSig: false, // TODO: Check for multi-sig
      });
      const riskLevel = getRiskLevel(riskScore);
      const recommendations = generateRecommendations(threats);
      
      const analysis: AssetAnalysis = {
        assetCode,
        issuerAddress,
        riskScore,
        riskLevel,
        threats,
        recommendations,
        metadata: {
          homeDomain: issuerAccount.home_domain,
          accountAge,
          flags: {
            auth_required: issuerAccount.flags.auth_required || false,
            auth_revocable: issuerAccount.flags.auth_revocable || false,
            auth_immutable: issuerAccount.flags.auth_immutable || false,
            auth_clawback_enabled: issuerAccount.flags.auth_clawback_enabled || false,
          },
          isVerified,
        },
        analyzedAt: new Date().toISOString(),
      };

      // Save to history (async, don't wait)
      // assetDatabase.saveAnalysisHistory('asset', analysis).catch(console.error);

      return analysis;
    } catch (error) {
      // If account doesn't exist or network error
      throw new Error(
        error instanceof Error 
          ? `Analysis failed: ${error.message}` 
          : 'Unknown analysis error'
      );
    }
  }

  /**
   * Analyze asset flags
   */
  private analyzeFlags(account: any): Threat[] {
    const threats: Threat[] = [];

    if (account.flags.auth_revocable) {
      threats.push({
        type: 'FREEZABLE_ASSET',
        severity: 'HIGH',
        description: 'Issuer can freeze your balance',
        technical: 'AUTH_REVOCABLE flag is enabled',
        explanation: 'The issuer has the ability to freeze your assets at any time, making them untradeable. This gives the issuer significant control over your holdings.',
      });
    }

    if (account.flags.auth_required) {
      threats.push({
        type: 'AUTHORIZATION_REQUIRED',
        severity: 'MEDIUM',
        description: 'Issuer must approve all holders',
        technical: 'AUTH_REQUIRED flag is enabled',
        explanation: 'You need explicit authorization from the issuer to hold this asset. The issuer controls who can own their tokens.',
      });
    }

    if (account.flags.auth_clawback_enabled) {
      threats.push({
        type: 'CLAWBACK_ENABLED',
        severity: 'MEDIUM',
        description: 'Issuer can take back tokens',
        technical: 'AUTH_CLAWBACK_ENABLED flag is set',
        explanation: 'The issuer can reclaim tokens from your account at any time. This is sometimes used for regulatory compliance but poses a risk.',
      });
    }

    return threats;
  }

  /**
   * Analyze home domain and TOML
   */
  private async analyzeHomeDomain(account: any, issuerAddress: string): Promise<Threat[]> {
    const threats: Threat[] = [];

    if (!account.home_domain) {
      threats.push({
        type: 'UNVERIFIED_ISSUER',
        severity: 'HIGH',
        description: 'No home domain found',
        technical: 'Missing home_domain field',
        explanation: 'Legitimate issuers typically have a verified website with a stellar.toml file. The absence of a home domain is a red flag.',
      });
      return threats;
    }

    // Verify TOML
    const tomlValid = await stellarClient.verifyToml(account.home_domain, issuerAddress);
    
    if (!tomlValid) {
      threats.push({
        type: 'INVALID_TOML',
        severity: 'HIGH',
        description: 'Invalid or missing stellar.toml file',
        technical: `Could not verify TOML at ${account.home_domain}`,
        explanation: 'The stellar.toml file could not be verified. This might indicate the domain is not properly configured or is impersonating another project.',
      });
    }

    return threats;
  }

  /**
   * Analyze account age
   */
  private async analyzeAccountAge(issuerAddress: string): Promise<Threat[]> {
    const threats: Threat[] = [];
    const age = await stellarClient.getAccountAge(issuerAddress);

    if (age < 7) {
      threats.push({
        type: 'NEW_ISSUER',
        severity: 'MEDIUM',
        description: `Account created ${age} day${age === 1 ? '' : 's'} ago`,
        technical: 'Recently created issuer account',
        explanation: 'New accounts have less established reputation and higher risk. Scammers often use newly created accounts.',
      });
    }

    return threats;
  }
}

// Export singleton
export const assetAnalyzer = new AssetAnalyzer();
