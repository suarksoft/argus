import * as StellarSdk from '@stellar/stellar-sdk';
import { sorobanClient } from '@/lib/stellar/soroban-client';
import { stellarClient } from '@/lib/stellar/client';

export interface SimulationResult {
  success: boolean;
  balanceChanges: BalanceChange[];
  feeEstimate: FeeEstimate;
  warnings: string[];
  errors: string[];
  stateChanges: StateChange[];
  events: ContractEvent[];
}

export interface BalanceChange {
  asset: { code: string; issuer?: string };
  before: string;
  after: string;
  change: string;
  changeType: 'increase' | 'decrease';
  percentage?: number;
}

export interface FeeEstimate {
  baseFee: string;
  resourceFee: string;
  totalFee: string;
  feeInUSD?: string;
}

export interface StateChange {
  type: 'account' | 'trustline' | 'offer' | 'data' | 'claimable_balance';
  key: string;
  before: any;
  after: any;
}

export interface ContractEvent {
  type: string;
  contractId: string;
  data: any;
  topics: string[];
}

export class SimulationEngine {
  /**
   * Simulate transaction and calculate all effects
   */
  async simulateTransaction(
    transaction: StellarSdk.Transaction,
    sourceAccount: string
  ): Promise<SimulationResult> {
    try {
      // Get current account state
      const currentBalances = await stellarClient.getAccountBalances(sourceAccount);
      
      // Simulate with Soroban RPC
      const sorobanResult = await sorobanClient.simulateTransaction(transaction);
      
      // Calculate balance changes
      const balanceChanges = await this.calculateBalanceChanges(
        transaction,
        sourceAccount,
        currentBalances,
        sorobanResult
      );
      
      // Estimate fees
      const feeEstimate = await this.estimateFees(transaction, sorobanResult);
      
      // Generate warnings
      const warnings = this.generateWarnings(transaction, balanceChanges, sorobanResult);
      
      // Parse errors
      const errors = this.parseErrors(sorobanResult);
      
      return {
        success: sorobanResult.success && errors.length === 0,
        balanceChanges,
        feeEstimate,
        warnings,
        errors,
        stateChanges: (sorobanResult.stateChanges || []).map((change: any) => ({
          type: change.type as 'data' | 'account' | 'trustline' | 'offer' | 'claimable_balance',
          key: change.key,
          before: change.before,
          after: change.after
        })),
        events: this.parseContractEvents(sorobanResult.events || []),
      };
    } catch (error) {
      return {
        success: false,
        balanceChanges: [],
        feeEstimate: {
          baseFee: transaction.fee,
          resourceFee: '0',
          totalFee: transaction.fee,
        },
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Simulation failed'],
        stateChanges: [],
        events: [],
      };
    }
  }

  /**
   * Calculate balance changes for each operation
   */
  private async calculateBalanceChanges(
    transaction: StellarSdk.Transaction,
    sourceAccount: string,
    currentBalances: any[],
    sorobanResult: any
  ): Promise<BalanceChange[]> {
    const changes: BalanceChange[] = [];
    
    // Always include fee deduction
    const xlmBalance = currentBalances.find(b => b.asset.code === 'XLM');
    const currentXLM = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
    const feeAmount = parseFloat(transaction.fee) / 10000000; // Convert stroops to XLM
    
    changes.push({
      asset: { code: 'XLM' },
      before: currentXLM.toFixed(7),
      after: (currentXLM - feeAmount).toFixed(7),
      change: `-${feeAmount.toFixed(7)}`,
      changeType: 'decrease',
      percentage: (feeAmount / currentXLM) * 100,
    });

    // Analyze each operation
    for (const operation of transaction.operations) {
      const opChanges = await this.analyzeOperationEffects(
        operation,
        sourceAccount,
        currentBalances
      );
      changes.push(...opChanges);
    }

    return changes;
  }

  /**
   * Analyze effects of individual operations
   */
  private async analyzeOperationEffects(
    operation: any,
    sourceAccount: string,
    currentBalances: any[]
  ): Promise<BalanceChange[]> {
    const changes: BalanceChange[] = [];

    switch (operation.type) {
      case 'payment':
        if (operation.source === sourceAccount || !operation.source) {
          // Outgoing payment
          const asset = operation.asset?.code || 'XLM';
          const issuer = operation.asset?.issuer;
          const amount = parseFloat(operation.amount);
          
          const currentBalance = currentBalances.find(b => 
            b.asset.code === asset && b.asset.issuer === issuer
          );
          
          if (currentBalance) {
            const before = parseFloat(currentBalance.balance);
            const after = before - amount;
            
            changes.push({
              asset: { code: asset, issuer },
              before: before.toFixed(7),
              after: after.toFixed(7),
              change: `-${amount.toFixed(7)}`,
              changeType: 'decrease',
              percentage: (amount / before) * 100,
            });
          }
        }
        break;

      case 'changeTrust':
        // Trustline creation doesn't change balance but creates new line
        const asset = operation.asset;
        if (asset) {
          changes.push({
            asset: { code: asset.code, issuer: asset.issuer },
            before: '0.0000000',
            after: '0.0000000',
            change: 'Trustline created',
            changeType: 'increase',
          });
        }
        break;

      case 'accountMerge':
        // All balances go to destination
        for (const balance of currentBalances) {
          if (balance.asset.code !== 'XLM' || parseFloat(balance.balance) > 0) {
            changes.push({
              asset: balance.asset,
              before: balance.balance,
              after: '0.0000000',
              change: `-${balance.balance}`,
              changeType: 'decrease',
              percentage: 100,
            });
          }
        }
        break;

      case 'createClaimableBalance':
        // Asset is locked in claimable balance
        const claimAsset = operation.asset || { code: 'XLM' };
        const claimAmount = parseFloat(operation.amount);
        
        const claimBalance = currentBalances.find(b => 
          b.asset.code === claimAsset.code && b.asset.issuer === claimAsset.issuer
        );
        
        if (claimBalance) {
          const before = parseFloat(claimBalance.balance);
          const after = before - claimAmount;
          
          changes.push({
            asset: claimAsset,
            before: before.toFixed(7),
            after: after.toFixed(7),
            change: `-${claimAmount.toFixed(7)} (locked in claimable balance)`,
            changeType: 'decrease',
            percentage: (claimAmount / before) * 100,
          });
        }
        break;
    }

    return changes;
  }

  /**
   * Estimate transaction fees
   */
  private async estimateFees(
    transaction: StellarSdk.Transaction,
    sorobanResult: any
  ): Promise<FeeEstimate> {
    const baseFee = transaction.fee;
    const resourceFee = sorobanResult.cost?.cpuInsns || '0';
    const totalFee = (parseInt(baseFee) + parseInt(resourceFee)).toString();

    return {
      baseFee,
      resourceFee,
      totalFee,
      // Could add USD conversion here if needed
    };
  }

  /**
   * Generate warnings based on simulation
   */
  private generateWarnings(
    transaction: StellarSdk.Transaction,
    balanceChanges: BalanceChange[],
    sorobanResult: any
  ): string[] {
    const warnings: string[] = [];

    // Check for large balance changes
    for (const change of balanceChanges) {
      if (change.percentage && change.percentage > 50) {
        warnings.push(
          `Large ${change.asset.code} transfer: ${change.percentage.toFixed(1)}% of your balance`
        );
      }
    }

    // Check for high fees
    const totalFee = parseInt(sorobanResult.cost?.cpuInsns || '0') + parseInt(transaction.fee);
    if (totalFee > 1000000) { // 0.1 XLM
      warnings.push('High transaction fee detected');
    }

    // Check for account merge
    const hasAccountMerge = transaction.operations.some((op: any) => op.type === 'accountMerge');
    if (hasAccountMerge) {
      warnings.push('CRITICAL: Account merge will permanently close your account');
    }

    // Check for multiple trustlines
    const trustlineOps = transaction.operations.filter((op: any) => op.type === 'changeTrust');
    if (trustlineOps.length > 3) {
      warnings.push(`Creating ${trustlineOps.length} trustlines at once - verify each asset`);
    }

    // Check for insufficient balance
    const xlmChange = balanceChanges.find(c => c.asset.code === 'XLM');
    if (xlmChange && parseFloat(xlmChange.after) < 1) {
      warnings.push('Low XLM balance after transaction - ensure you can pay future fees');
    }

    return warnings;
  }

  /**
   * Parse errors from simulation result
   */
  private parseErrors(sorobanResult: any): string[] {
    const errors: string[] = [];

    if (sorobanResult.error) {
      errors.push(this.translateError(sorobanResult.error));
    }

    if (!sorobanResult.success && sorobanResult.results) {
      for (const result of sorobanResult.results) {
        if (result.error) {
          errors.push(this.translateError(result.error));
        }
      }
    }

    return errors;
  }

  /**
   * Translate Stellar error codes to user-friendly messages
   */
  private translateError(error: string): string {
    const errorMap: Record<string, string> = {
      'op_underfunded': 'Insufficient balance for this operation',
      'op_no_trust': 'You need to add a trustline for this asset first',
      'op_not_authorized': 'You are not authorized to hold this asset',
      'op_line_full': 'Your trustline limit would be exceeded',
      'op_no_issuer': 'Asset issuer account does not exist',
      'op_malformed': 'Transaction is malformed',
      'tx_bad_seq': 'Invalid sequence number',
      'tx_insufficient_fee': 'Transaction fee is too low',
    };

    return errorMap[error] || `Transaction error: ${error}`;
  }

  /**
   * Parse contract events from simulation
   */
  private parseContractEvents(events: any[]): ContractEvent[] {
    return events.map(event => ({
      type: event.type || 'unknown',
      contractId: event.contractId || '',
      data: event.body || {},
      topics: event.topics || [],
    }));
  }

  /**
   * Quick validation without full simulation
   */
  async quickValidate(transaction: StellarSdk.Transaction, sourceAccount: string) {
    try {
      const account = await stellarClient.loadAccount(sourceAccount);
      const balances = await stellarClient.getAccountBalances(sourceAccount);
      
      const issues: string[] = [];
      
      // Check sequence number
      if (parseInt(transaction.sequence) !== parseInt(account.sequence) + 1) {
        issues.push('Invalid sequence number');
      }
      
      // Check basic balance requirements
      const xlmBalance = balances.find(b => b.asset.code === 'XLM');
      const feeAmount = parseFloat(transaction.fee) / 10000000;
      
      if (!xlmBalance || parseFloat(xlmBalance.balance) < feeAmount) {
        issues.push('Insufficient XLM for transaction fee');
      }
      
      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: ['Failed to validate transaction'],
      };
    }
  }
}

// Export singleton
export const simulationEngine = new SimulationEngine();
