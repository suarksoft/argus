import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Validate Stellar address
 */
export function isValidStellarAddress(address: string): boolean {
  try {
    return StellarSdk.StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

/**
 * Truncate Stellar address for display
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format balance amount
 */
export function formatBalance(balance: string, decimals: number = 2): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}

/**
 * Get network passphrase
 */
export function getNetworkPassphrase(network: 'testnet' | 'mainnet'): string {
  return network === 'testnet' ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;
}

/**
 * Format asset identifier
 */
export function formatAssetIdentifier(assetCode: string, issuerAddress: string): string {
  return `${assetCode}:${truncateAddress(issuerAddress)}`;
}
