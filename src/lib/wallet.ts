/**
 * Wallet utility functions
 * 
 * DEPRECATED: This file is kept for backwards compatibility only.
 * New code should use useWalletConnect hook from @/hooks/useWalletConnect
 */

import { StellarClient } from './stellar/client';

declare global {
  interface Window {
    freighterApi?: any;
  }
}

export async function connectWallet(): Promise<string> {
  throw new Error('DEPRECATED: Use useWalletConnect hook instead');
}

export async function getNetwork(): Promise<{ network: string; networkPassphrase: string }> {
  throw new Error('DEPRECATED: Use useWalletConnect hook instead');
}

export async function getBalance(address: string, isTestnet: boolean = true): Promise<number> {
  try {
    const stellarClient = new StellarClient(isTestnet);
    const account = await stellarClient.loadAccount(address);
    
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    return xlmBalance ? parseFloat(xlmBalance.balance) : 0;
  } catch (error) {
    console.error('Balance fetch error:', error);
    throw error;
  }
}

export async function signTransaction(xdr: string, networkPassphrase?: string): Promise<string> {
  throw new Error('DEPRECATED: Use useWalletConnect hook instead');
}
