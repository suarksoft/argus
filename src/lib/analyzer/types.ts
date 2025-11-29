export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Threat {
  title?: string; // Optional title for display
  type?: string; // Legacy field
  severity: ThreatSeverity;
  message?: string; // Legacy field
  description: string;
  technical?: string; // Legacy field
  explanation?: string;
}

export interface AssetAnalysis {
  assetCode: string;
  issuerAddress: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  threats: Threat[];
  recommendations: string[];
  metadata: {
    homeDomain?: string;
    accountAge: number;
    flags: {
      auth_required: boolean;
      auth_revocable: boolean;
      auth_immutable: boolean;
      auth_clawback_enabled: boolean;
    };
    isVerified: boolean;
  };
  analyzedAt: string;
}

export interface TransactionAnalysis {
  source: string;
  fee: string;
  operations: any[];
  overallRisk: {
    level: RiskLevel;
    score: number;
  };
  threats: Threat[];
  recommendations: string[];
  simulationResult?: {
    success: boolean;
    balanceChanges: Array<{
      asset: { code: string; issuer?: string };
      before: string;
      after: string;
      change: string;
      changeType: 'increase' | 'decrease';
      percentage?: number;
    }>;
    feeEstimate: {
      baseFee: string;
      resourceFee: string;
      totalFee: string;
    };
    warnings: string[];
    errors: string[];
  };
  transactionHash?: string;
  metadata: {
    operationCount: number;
    hasMultipleAssets: boolean;
    hasDangerousOperations: boolean;
  };
  analyzedAt: string;
}
