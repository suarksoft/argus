import { useState, useCallback } from 'react';
import { useWalletConnect } from './useWalletConnect';

export interface AnalysisResult {
  success: boolean;
  overallRisk: {
    level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    score: number;
  };
  threats: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    explanation?: string;
  }>;
  operations: Array<{
    type: string;
    amount?: string;
    asset?: { code: string; issuer?: string };
    destination?: string;
  }>;
  recommendations: string[];
  simulationResult?: {
    success: boolean;
    balanceChanges: Array<{
      asset: { code: string; issuer?: string };
      before: string;
      after: string;
      change: string;
      changeType: 'increase' | 'decrease';
    }>;
    warnings: string[];
    errors: string[];
  };
}

export interface PreSignGuardState {
  isAnalyzing: boolean;
  showRiskModal: boolean;
  analysis: AnalysisResult | null;
  error: string | null;
}

export const usePreSignGuard = () => {
  const { wallet, signTransaction } = useWalletConnect();
  const [state, setState] = useState<PreSignGuardState>({
    isAnalyzing: false,
    showRiskModal: false,
    analysis: null,
    error: null,
  });

  const analyzeTransaction = useCallback(async (xdr: string): Promise<AnalysisResult> => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }

    const response = await fetch('/api/analyze/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        xdr,
        sourceAccount: wallet.publicKey,
        network: wallet.network,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    return data;
  }, [wallet]);

  const guardedSignTransaction = useCallback(async (xdr: string): Promise<string> => {
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Step 1: Analyze transaction
      const analysis = await analyzeTransaction(xdr);
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysis,
      }));

      // Step 2: Check risk level and show modal if needed
      const riskScore = analysis.overallRisk.score;
      const riskLevel = analysis.overallRisk.level;

      // Always show modal for MEDIUM and above, or if there are threats
      const shouldShowModal = riskScore >= 40 || analysis.threats.length > 0;

      if (shouldShowModal) {
        setState(prev => ({ ...prev, showRiskModal: true }));
        
        // Return a promise that resolves when user makes a decision
        return new Promise((resolve, reject) => {
          // Store resolve/reject in state or use a different mechanism
          // This will be resolved by modal actions
          (window as any).stellarSafeModalResolve = resolve;
          (window as any).stellarSafeModalReject = reject;
        });
      }

      // Step 3: If low risk, proceed directly
      return await signTransaction(xdr);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [analyzeTransaction, signTransaction]);

  const proceedWithSigning = useCallback(async () => {
    if (!state.analysis) {
      throw new Error('No analysis available');
    }

    setState(prev => ({ ...prev, showRiskModal: false }));

    try {
      // Get the XDR from somewhere (we'll need to store it)
      const xdr = (window as any).stellarSafePendingXDR;
      const signedXDR = await signTransaction(xdr);
      
      // Resolve the promise
      if ((window as any).stellarSafeModalResolve) {
        (window as any).stellarSafeModalResolve(signedXDR);
      }

      return signedXDR;
    } catch (error) {
      if ((window as any).stellarSafeModalReject) {
        (window as any).stellarSafeModalReject(error);
      }
      throw error;
    }
  }, [state.analysis, signTransaction]);

  const cancelTransaction = useCallback(() => {
    setState(prev => ({ ...prev, showRiskModal: false, analysis: null }));
    
    if ((window as any).stellarSafeModalReject) {
      (window as any).stellarSafeModalReject(new Error('Transaction cancelled by user'));
    }
  }, []);

  const dismissModal = useCallback(() => {
    setState(prev => ({ ...prev, showRiskModal: false }));
  }, []);

  // Helper function to determine if transaction should be blocked
  const shouldBlockTransaction = useCallback((analysis: AnalysisResult): boolean => {
    return (
      analysis.overallRisk.level === 'CRITICAL' ||
      analysis.threats.some(threat => threat.severity === 'CRITICAL')
    );
  }, []);

  return {
    ...state,
    analyzeTransaction,
    guardedSignTransaction,
    proceedWithSigning,
    cancelTransaction,
    dismissModal,
    shouldBlockTransaction,
  };
};
