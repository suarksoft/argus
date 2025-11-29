import { ThreatSeverity, RiskLevel, Threat } from './types';

/**
 * Risk scoring weights
 */
export const RISK_WEIGHTS = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 35,
  CRITICAL: 50,
};

/**
 * Positive indicators that reduce risk score
 */
export const POSITIVE_INDICATORS = {
  VERIFIED_BY_STELLAR_EXPERT: -15, // Stellar Expert verification significantly reduces risk
  VALID_TOML: -10, // Valid TOML shows legitimacy
  OLD_ACCOUNT: -5, // Account age > 1 year
  HIGH_TRANSACTION_VOLUME: -8, // Active trading history
  WHITELISTED: -20, // Whitelisted assets are trusted
  MULTI_SIG: -5, // Multi-signature shows security consciousness
};

/**
 * Edge case handling for new legit projects
 * If a project has positive indicators, we reduce the penalty for being new
 */
interface RiskCalculationContext {
  accountAge?: number; // in days
  isVerified?: boolean;
  hasValidToml?: boolean;
  isWhitelisted?: boolean;
  transactionCount?: number;
  hasMultiSig?: boolean;
}

/**
 * Calculate total risk score from threats with context-aware adjustments
 */
export function calculateRiskScore(
  threats: Array<{ severity: ThreatSeverity }>,
  context?: RiskCalculationContext
): number {
  let score = 0;

  // Base score from threats
  for (const threat of threats) {
    score += RISK_WEIGHTS[threat.severity];
  }

  // Apply positive indicators to reduce false positives
  if (context) {
    // New account but has verification - reduce NEW_ISSUER penalty
    if (context.accountAge && context.accountAge < 7) {
      if (context.isVerified) {
        score += POSITIVE_INDICATORS.VERIFIED_BY_STELLAR_EXPERT;
      }
      if (context.hasValidToml) {
        score += POSITIVE_INDICATORS.VALID_TOML;
      }
      if (context.isWhitelisted) {
        score += POSITIVE_INDICATORS.WHITELISTED;
      }
    }

    // Whitelisted assets get significant risk reduction
    if (context.isWhitelisted) {
      score += POSITIVE_INDICATORS.WHITELISTED;
    }

    // Valid TOML reduces risk
    if (context.hasValidToml) {
      score += POSITIVE_INDICATORS.VALID_TOML;
    }

    // Stellar Expert verification is a strong positive signal
    if (context.isVerified) {
      score += POSITIVE_INDICATORS.VERIFIED_BY_STELLAR_EXPERT;
    }

    // High transaction volume indicates active, legitimate use
    if (context.transactionCount && context.transactionCount > 100) {
      score += POSITIVE_INDICATORS.HIGH_TRANSACTION_VOLUME;
    }

    // Multi-sig shows security consciousness
    if (context.hasMultiSig) {
      score += POSITIVE_INDICATORS.MULTI_SIG;
    }
  }

  // Ensure score stays within bounds (0-100)
  return Math.max(0, Math.min(score, 100));
}

/**
 * Determine risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'SAFE';
}

/**
 * Generate recommendations based on threats
 */
export function generateRecommendations(threats: Threat[]): string[] {
  const recommendations: string[] = [];

  const threatTypes = threats.map(t => t.type);

  if (threatTypes.includes('FREEZABLE_ASSET')) {
    recommendations.push('Consider removing this trustline if you already have it');
    recommendations.push('Look for alternative assets without AUTH_REVOCABLE flag');
  }

  if (threatTypes.includes('NAME_IMPERSONATION')) {
    recommendations.push('Verify the issuer address matches the official source');
    recommendations.push('Use the verified asset from trusted issuers');
  }

  if (threatTypes.includes('UNVERIFIED_ISSUER')) {
    recommendations.push('Wait for issuer to establish a verified home domain');
    recommendations.push('Research the project before trusting assets');
  }

  if (threatTypes.includes('NEW_ISSUER')) {
    recommendations.push('Exercise caution with newly created accounts');
    recommendations.push('Wait for the issuer to build a track record');
  }

  if (threatTypes.includes('BLACKLISTED')) {
    recommendations.push('DO NOT PROCEED - This address is known for scams');
    recommendations.push('Report this to the community if you encountered it');
  }

  if (threatTypes.includes('AUTHORIZATION_REQUIRED')) {
    recommendations.push('You need issuer approval to hold this asset');
    recommendations.push('Contact the issuer for authorization');
  }

  if (threatTypes.includes('CLAWBACK_ENABLED')) {
    recommendations.push('Be aware that tokens can be reclaimed by the issuer');
    recommendations.push('Only use if you trust the issuer completely');
  }

  if (recommendations.length === 0) {
    recommendations.push('This asset appears safe to use');
    recommendations.push('Always verify issuer details before trusting large amounts');
  }

  return recommendations;
}

/**
 * Get color for risk level
 */
export function getRiskColor(level: RiskLevel): string {
  const colors = {
    SAFE: 'green',
    LOW: 'blue',
    MEDIUM: 'yellow',
    HIGH: 'orange',
    CRITICAL: 'red',
  };
  return colors[level];
}
