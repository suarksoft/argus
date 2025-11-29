import { ParsedOperation, OperationType, TransactionAnalysis } from './types';
import { RiskLevel, Threat } from '../analyzer/types';
import { calculateRiskScore, getRiskLevel, generateRecommendations } from '../analyzer/risk-scorer';
import { AssetAnalyzer } from '../analyzer/asset-analyzer';
import { simulationEngine, SimulationResult } from '../analyzer/simulation-engine';

/**
 * Transaction risk analyzer
 */
export class TransactionAnalyzer {
  private assetAnalyzer: AssetAnalyzer;

  constructor(assetAnalyzer: AssetAnalyzer) {
    this.assetAnalyzer = assetAnalyzer;
  }

  /**
   * Analyze operation for risks
   */
  async analyzeOperation(operation: Partial<ParsedOperation>): Promise<ParsedOperation> {
    const threats: Threat[] = [];
    let riskLevel: RiskLevel = 'SAFE';

    // Check for dangerous operation types
    if (operation.type === OperationType.ACCOUNT_MERGE) {
      threats.push({
        severity: 'CRITICAL',
        title: 'Account Merge Operation',
        description: 'This operation will merge your account and transfer all funds to another address.',
        explanation:
          'Account merge is irreversible and will close your account permanently. Ensure you trust the destination address.',
      });
    }

    if (operation.type === OperationType.CLAWBACK) {
      threats.push({
        severity: 'HIGH',
        title: 'Clawback Operation',
        description: 'An issuer is attempting to clawback assets from an account.',
        explanation:
          'Clawback allows issuers to forcefully retrieve assets. This is legitimate for regulated assets but should be carefully reviewed.',
      });
    }

    if (operation.type === OperationType.SET_OPTIONS) {
      const metadata = operation.metadata || {};
      
      // Check for master key removal
      if (metadata.masterWeight === 0) {
        threats.push({
          severity: 'CRITICAL',
          title: 'Master Key Removal',
          description: 'This operation will remove your master key, potentially locking you out.',
          explanation:
            'Setting master weight to 0 means you can no longer control your account with the master key. Ensure you have other signers configured.',
        });
      }

      // Check for low threshold changes
      if (metadata.lowThreshold !== undefined || metadata.medThreshold !== undefined || metadata.highThreshold !== undefined) {
        threats.push({
          severity: 'MEDIUM',
          title: 'Threshold Modification',
          description: 'This operation modifies account signature thresholds.',
          explanation:
            'Changing thresholds affects how many signatures are required for operations. Verify these changes are intentional.',
        });
      }

      // Check for adding unknown signers
      if (metadata.signer) {
        threats.push({
          severity: 'MEDIUM',
          title: 'Adding New Signer',
          description: 'A new signer is being added to your account.',
          explanation:
            'New signers can control your account based on threshold settings. Only add signers you fully trust.',
        });
      }
    }

    // Analyze asset if present
    if (operation.asset && operation.asset.issuer !== 'native') {
      try {
        const assetAnalysis = await this.assetAnalyzer.analyzeAsset(
          operation.asset.code,
          operation.asset.issuer
        );
        
        // Add asset-level threats to operation
        threats.push(...assetAnalysis.threats);
      } catch (error) {
        threats.push({
          severity: 'MEDIUM',
          title: 'Asset Verification Failed',
          description: `Could not verify asset ${operation.asset.code}`,
          explanation: 'Unable to fetch asset information from the network. Proceed with caution.',
        });
      }
    }

    // Check for large amounts
    if (operation.amount && parseFloat(operation.amount) > 10000) {
      threats.push({
        severity: 'MEDIUM',
        title: 'Large Transaction Amount',
        description: `Transaction involves ${operation.amount} ${operation.asset?.code || 'XLM'}`,
        explanation: 'Large transactions warrant extra verification. Double-check the destination address.',
      });
    }

    // Check for path payments (can be used for arbitrage attacks)
    if (operation.type === OperationType.PATH_PAYMENT_STRICT_RECEIVE || 
        operation.type === OperationType.PATH_PAYMENT_STRICT_SEND) {
      threats.push({
        severity: 'LOW',
        title: 'Path Payment',
        description: 'Transaction uses path payment which converts assets through multiple hops.',
        explanation:
          'Path payments can result in unexpected conversion rates. Verify the receive amount is acceptable.',
      });
    }

    // Smart contract operations
    if (operation.metadata?.isSmartContract) {
      threats.push({
        severity: 'HIGH',
        title: 'Smart Contract Invocation',
        description: 'This transaction invokes a Soroban smart contract.',
        explanation:
          'Smart contracts can perform complex operations. Ensure you understand what the contract does and trust its code.',
      });
    }

    // Calculate risk level based on threats
    const threatScores = threats.map((t) => {
      const weights = { CRITICAL: 50, HIGH: 35, MEDIUM: 20, LOW: 10 };
      return weights[t.severity];
    });
    const totalScore = threatScores.reduce((sum, score) => sum + score, 0);
    riskLevel = getRiskLevel(totalScore);

    return {
      ...operation,
      riskLevel,
      threats,
      metadata: operation.metadata || {},
    } as ParsedOperation;
  }

  /**
   * Analyze full transaction
   */
  async analyzeTransaction(
    sourceAccount: string,
    fee: string,
    operations: Partial<ParsedOperation>[],
    transaction?: any
  ): Promise<TransactionAnalysis> {
    // Analyze each operation
    const analyzedOperations = await Promise.all(
      operations.map((op) => this.analyzeOperation(op))
    );

    // Collect all threats
    const allThreats: Threat[] = [];
    analyzedOperations.forEach((op) => {
      allThreats.push(...op.threats);
    });

    // Deduplicate threats by title
    const uniqueThreats = Array.from(
      new Map(allThreats.map((t) => [t.title, t])).values()
    );

    // Calculate overall risk
    const totalScore = calculateRiskScore(uniqueThreats);
    const overallRisk = {
      level: getRiskLevel(totalScore),
      score: totalScore,
    };

    // Generate recommendations
    const recommendations = generateRecommendations(uniqueThreats);

    // Run simulation if transaction object provided
    let simulationResult: SimulationResult | undefined;
    if (transaction) {
      try {
        simulationResult = await simulationEngine.simulateTransaction(transaction, sourceAccount);
        
        // Add simulation-based threats
        if (!simulationResult.success) {
          uniqueThreats.push({
            type: 'SIMULATION_FAILED',
            severity: 'HIGH',
            description: 'Transaction simulation failed',
            technical: simulationResult.errors.join(', '),
            explanation: 'This transaction may fail when submitted to the network. Review the errors and try again.',
          });
        }

        // Add warnings as low-severity threats
        for (const warning of simulationResult.warnings) {
          uniqueThreats.push({
            type: 'SIMULATION_WARNING',
            severity: 'LOW',
            description: warning,
            technical: 'Detected during transaction simulation',
            explanation: 'This is a warning based on transaction simulation. Review carefully.',
          });
        }
      } catch (error) {
        console.warn('Simulation failed:', error);
      }
    }

    // Recalculate risk with simulation threats
    const finalScore = calculateRiskScore(uniqueThreats);
    const finalRisk = {
      level: getRiskLevel(finalScore),
      score: finalScore,
    };

    // Check for dangerous patterns
    const hasDangerousOperations = analyzedOperations.some(
      (op) => op.type === OperationType.ACCOUNT_MERGE || op.type === OperationType.CLAWBACK
    );

    const uniqueAssets = new Set(
      analyzedOperations
        .filter((op) => op.asset)
        .map((op) => `${op.asset!.code}:${op.asset!.issuer}`)
    );

    return {
      source: sourceAccount,
      fee,
      operations: analyzedOperations,
      overallRisk: finalRisk,
      threats: uniqueThreats,
      recommendations,
      metadata: {
        operationCount: operations.length,
        hasMultipleAssets: uniqueAssets.size > 1,
        hasDangerousOperations,
      },
    };
  }
}
