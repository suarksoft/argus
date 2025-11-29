import { RiskLevel, Threat } from '../analyzer/types';

/**
 * Stellar operation types
 */
export enum OperationType {
  CREATE_ACCOUNT = 'createAccount',
  PAYMENT = 'payment',
  PATH_PAYMENT_STRICT_RECEIVE = 'pathPaymentStrictReceive',
  PATH_PAYMENT_STRICT_SEND = 'pathPaymentStrictSend',
  MANAGE_SELL_OFFER = 'manageSellOffer',
  MANAGE_BUY_OFFER = 'manageBuyOffer',
  CREATE_PASSIVE_SELL_OFFER = 'createPassiveSellOffer',
  SET_OPTIONS = 'setOptions',
  CHANGE_TRUST = 'changeTrust',
  ALLOW_TRUST = 'allowTrust',
  ACCOUNT_MERGE = 'accountMerge',
  MANAGE_DATA = 'manageData',
  BUMP_SEQUENCE = 'bumpSequence',
  CREATE_CLAIMABLE_BALANCE = 'createClaimableBalance',
  CLAIM_CLAIMABLE_BALANCE = 'claimClaimableBalance',
  BEGIN_SPONSORING_FUTURE_RESERVES = 'beginSponsoringFutureReserves',
  END_SPONSORING_FUTURE_RESERVES = 'endSponsoringFutureReserves',
  REVOKE_SPONSORSHIP = 'revokeSponsorship',
  CLAWBACK = 'clawback',
  CLAWBACK_CLAIMABLE_BALANCE = 'clawbackClaimableBalance',
  SET_TRUST_LINE_FLAGS = 'setTrustLineFlags',
  LIQUIDITY_POOL_DEPOSIT = 'liquidityPoolDeposit',
  LIQUIDITY_POOL_WITHDRAW = 'liquidityPoolWithdraw',
  INVOKE_HOST_FUNCTION = 'invokeHostFunction',
  EXTEND_FOOTPRINT_TTL = 'extendFootprintTTL',
  RESTORE_FOOTPRINT = 'restoreFootprint',
}

/**
 * Parsed operation details
 */
export interface ParsedOperation {
  type: OperationType;
  sourceAccount?: string;
  destination?: string;
  asset?: {
    code: string;
    issuer: string;
    type: string;
  };
  amount?: string;
  riskLevel: RiskLevel;
  threats: Threat[];
  metadata: Record<string, any>;
}

/**
 * Transaction analysis result
 */
export interface TransactionAnalysis {
  transactionHash?: string;
  source: string;
  fee: string;
  operations: ParsedOperation[];
  overallRisk: {
    level: RiskLevel;
    score: number;
  };
  threats: Threat[];
  recommendations: string[];
  metadata: {
    operationCount: number;
    hasMultipleAssets: boolean;
    hasDangerousOperations: boolean;
    estimatedTimestamp?: string;
  };
}

/**
 * Transaction input formats
 */
export interface TransactionInput {
  xdr?: string; // Base64 XDR
  hash?: string; // Transaction hash to fetch from network
  envelope?: any; // Already parsed transaction envelope
}
