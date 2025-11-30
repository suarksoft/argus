'use client';

import { useState, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { useWalletConnect } from './useWalletConnect';

// Verification fee in XLM
export const VERIFICATION_FEE_XLM = '50';

// Argus wallet addresses for receiving verification fees
// Should match STELLARSENTINEL_WALLET env variable
// Testnet: Use your actual testnet wallet address
export const ARGUS_WALLET = {
  testnet: process.env.NEXT_PUBLIC_STELLARSENTINEL_WALLET_TESTNET || 'GAELIPRPRLJFET6FWVU4KN3R32Z7WH3KCHPTVIJOIYLYIWFUWT2NXJFE', // Your testnet wallet
  mainnet: process.env.NEXT_PUBLIC_STELLARSENTINEL_WALLET || 'GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX',
};

export interface PaymentState {
  isPaying: boolean;
  isPaid: boolean;
  paymentTxHash: string | null;
  error: string | null;
}

export const useVerificationPayment = () => {
  const { wallet, signTransaction } = useWalletConnect();
  const [state, setState] = useState<PaymentState>({
    isPaying: false,
    isPaid: false,
    paymentTxHash: null,
    error: null,
  });

  const resetPayment = useCallback(() => {
    setState({
      isPaying: false,
      isPaid: false,
      paymentTxHash: null,
      error: null,
    });
  }, []);

  const payVerificationFee = useCallback(async (
    network: 'testnet' | 'mainnet',
    contractId?: string
  ) => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, isPaying: true, error: null }));

    try {
      console.log('=== PAYMENT START ===');
      console.log('Network:', network);
      console.log('Contract ID:', contractId);
      console.log('From wallet:', wallet.publicKey);

      // Setup Stellar SDK
      const isTestnet = network === 'testnet';
      const horizonUrl = isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';
      const networkPassphrase = isTestnet
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

      const server = new StellarSdk.Horizon.Server(horizonUrl);

      // Get destination wallet
      const destinationWallet = ARGUS_WALLET[network];
      console.log('To wallet:', destinationWallet);

      // Validate destination account exists
      try {
        await server.loadAccount(destinationWallet);
      } catch (destError) {
        console.error('Destination account not found:', destError);
        throw new Error('Verification wallet not found on network. Please contact support.');
      }

      // Load source account
      console.log('Loading source account...');
      const sourceAccount = await server.loadAccount(wallet.publicKey);

      // Build memo: VERIFY:CONTRACT_ID_ILK_10_KARAKTER
      const memoText = contractId 
        ? `VERIFY:${contractId.slice(0, 10)}`
        : 'VERIFY:CONTRACT';
      
      console.log('Building transaction with memo:', memoText);

      // Build payment transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destinationWallet,
            asset: StellarSdk.Asset.native(),
            amount: VERIFICATION_FEE_XLM,
          })
        )
        .addMemo(StellarSdk.Memo.text(memoText))
        .setTimeout(180) // 3 minutes timeout
        .build();

      console.log('Transaction built, requesting signature...');

      // Convert to XDR for signing
      const xdr = transaction.toXDR();

      // Sign with wallet (Freighter)
      const signedXdr = await signTransaction(xdr);

      if (!signedXdr) {
        throw new Error('Transaction signing failed or was cancelled');
      }

      console.log('Transaction signed, submitting to network...');

      // Submit to network
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXdr,
        networkPassphrase
      );

      const result = await server.submitTransaction(signedTransaction);

      console.log('✅ Payment successful!');
      console.log('TX Hash:', result.hash);

      setState({
        isPaying: false,
        isPaid: true,
        paymentTxHash: result.hash,
        error: null,
      });

      return {
        success: true,
        txHash: result.hash,
      };
    } catch (error: any) {
      console.error('Payment failed:', error);
      
      let errorMessage = 'Payment failed';
      
      if (error.response?.data?.extras?.result_codes) {
        const codes = error.response.data.extras.result_codes;
        if (codes.operations?.includes('op_underfunded')) {
          errorMessage = 'Insufficient XLM balance';
        } else if (codes.operations?.includes('op_no_destination')) {
          errorMessage = 'Destination account not found';
        } else {
          errorMessage = `Transaction failed: ${JSON.stringify(codes)}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        isPaying: false,
        error: errorMessage,
      }));

      throw new Error(errorMessage);
    }
  }, [wallet, signTransaction]);

  const verifyPayment = useCallback(async (
    txHash: string,
    network: 'testnet' | 'mainnet',
    expectedPayer: string
  ): Promise<boolean> => {
    try {
      const isTestnet = network === 'testnet';
      const horizonUrl = isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org';

      const server = new StellarSdk.Horizon.Server(horizonUrl);
      const transaction = await server.transactions().transaction(txHash).call();

      // Get operations
      const operations = await server.operations().forTransaction(txHash).call();

      // Find payment operation to Argus wallet
      const paymentOp = operations.records.find((op: any) => {
        if (op.type !== 'payment') return false;
        if (op.asset_type !== 'native') return false;
        if (op.to !== ARGUS_WALLET[network]) return false;
        if (parseFloat(op.amount) < parseFloat(VERIFICATION_FEE_XLM)) return false;
        if (op.from !== expectedPayer) return false;
        return true;
      });

      return !!paymentOp;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    payVerificationFee,
    verifyPayment,
    resetPayment,
    feeAmount: VERIFICATION_FEE_XLM,
    wallet,
  };
};
