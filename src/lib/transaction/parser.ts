import * as StellarSdk from '@stellar/stellar-sdk';
import { OperationType, ParsedOperation } from './types';
import { RiskLevel } from '../analyzer/types';

/**
 * Transaction parser to extract operations from XDR or envelope
 */
export class TransactionParser {
  /**
   * Parse XDR string to transaction
   */
  static parseXDR(xdr: string, networkPassphrase: string): StellarSdk.Transaction {
    try {
      const transaction = StellarSdk.TransactionBuilder.fromXDR(
        xdr,
        networkPassphrase
      ) as StellarSdk.Transaction;
      return transaction;
    } catch (error) {
      throw new Error(`Failed to parse XDR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract operation type from Stellar SDK operation
   */
  static getOperationType(operation: any): OperationType {
    const typeMap: Record<string, OperationType> = {
      createAccount: OperationType.CREATE_ACCOUNT,
      payment: OperationType.PAYMENT,
      pathPaymentStrictReceive: OperationType.PATH_PAYMENT_STRICT_RECEIVE,
      pathPaymentStrictSend: OperationType.PATH_PAYMENT_STRICT_SEND,
      manageSellOffer: OperationType.MANAGE_SELL_OFFER,
      manageBuyOffer: OperationType.MANAGE_BUY_OFFER,
      createPassiveSellOffer: OperationType.CREATE_PASSIVE_SELL_OFFER,
      setOptions: OperationType.SET_OPTIONS,
      changeTrust: OperationType.CHANGE_TRUST,
      allowTrust: OperationType.ALLOW_TRUST,
      accountMerge: OperationType.ACCOUNT_MERGE,
      manageData: OperationType.MANAGE_DATA,
      bumpSequence: OperationType.BUMP_SEQUENCE,
      createClaimableBalance: OperationType.CREATE_CLAIMABLE_BALANCE,
      claimClaimableBalance: OperationType.CLAIM_CLAIMABLE_BALANCE,
      beginSponsoringFutureReserves: OperationType.BEGIN_SPONSORING_FUTURE_RESERVES,
      endSponsoringFutureReserves: OperationType.END_SPONSORING_FUTURE_RESERVES,
      revokeSponsorship: OperationType.REVOKE_SPONSORSHIP,
      clawback: OperationType.CLAWBACK,
      clawbackClaimableBalance: OperationType.CLAWBACK_CLAIMABLE_BALANCE,
      setTrustLineFlags: OperationType.SET_TRUST_LINE_FLAGS,
      liquidityPoolDeposit: OperationType.LIQUIDITY_POOL_DEPOSIT,
      liquidityPoolWithdraw: OperationType.LIQUIDITY_POOL_WITHDRAW,
      invokeHostFunction: OperationType.INVOKE_HOST_FUNCTION,
      extendFootprintTTL: OperationType.EXTEND_FOOTPRINT_TTL,
      restoreFootprint: OperationType.RESTORE_FOOTPRINT,
    };

    return typeMap[operation.type] || OperationType.PAYMENT;
  }

  /**
   * Extract basic operation info
   */
  static extractOperationInfo(operation: any): Partial<ParsedOperation> {
    const metadata: Record<string, any> = {};
    const info: Partial<ParsedOperation> = {
      type: this.getOperationType(operation),
      sourceAccount: operation.source,
      metadata,
    };

    // Payment operation
    if (operation.type === 'payment') {
      info.destination = operation.destination;
      info.amount = operation.amount;
      info.asset = this.extractAssetInfo(operation.asset);
    }

    // Path payment operations
    if (operation.type === 'pathPaymentStrictReceive' || operation.type === 'pathPaymentStrictSend') {
      info.destination = operation.destination;
      info.amount = operation.type === 'pathPaymentStrictReceive' ? operation.destAmount : operation.sendAmount;
      info.asset = this.extractAssetInfo(
        operation.type === 'pathPaymentStrictReceive' ? operation.destAsset : operation.sendAsset
      );
      metadata.path = operation.path?.map((asset: any) => this.extractAssetInfo(asset));
    }

    // Change trust operation
    if (operation.type === 'changeTrust') {
      info.asset = this.extractAssetInfo(operation.line);
      info.amount = operation.limit;
      metadata.trustAction = operation.limit === '0' ? 'remove' : 'add';
    }

    // Set options operation
    if (operation.type === 'setOptions') {
      metadata.setFlags = operation.setFlags;
      metadata.clearFlags = operation.clearFlags;
      metadata.masterWeight = operation.masterWeight;
      metadata.lowThreshold = operation.lowThreshold;
      metadata.medThreshold = operation.medThreshold;
      metadata.highThreshold = operation.highThreshold;
      metadata.signer = operation.signer;
      metadata.homeDomain = operation.homeDomain;
    }

    // Account merge operation
    if (operation.type === 'accountMerge') {
      info.destination = operation.destination;
      metadata.isMerge = true;
    }

    // Clawback operation
    if (operation.type === 'clawback') {
      info.destination = operation.from;
      info.amount = operation.amount;
      info.asset = this.extractAssetInfo(operation.asset);
      metadata.isClawback = true;
    }

    // Smart contract invocation
    if (operation.type === 'invokeHostFunction') {
      metadata.isSmartContract = true;
      metadata.function = operation.func?.switch()?.name || 'unknown';
    }

    return info;
  }

  /**
   * Extract asset information
   */
  static extractAssetInfo(asset: any): { code: string; issuer: string; type: string } | undefined {
    if (!asset) return undefined;

    if (asset.isNative && asset.isNative()) {
      return {
        code: 'XLM',
        issuer: 'native',
        type: 'native',
      };
    }

    return {
      code: asset.code || asset.getCode?.(),
      issuer: asset.issuer || asset.getIssuer?.(),
      type: asset.getAssetType?.() || 'unknown',
    };
  }

  /**
   * Parse all operations from transaction
   */
  static parseOperations(transaction: StellarSdk.Transaction): Partial<ParsedOperation>[] {
    return transaction.operations.map((operation) => this.extractOperationInfo(operation));
  }
}
