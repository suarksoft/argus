import * as StellarSdk from '@stellar/stellar-sdk';

export class StellarService {
  private server: StellarSdk.Horizon.Server;
  private network: 'testnet' | 'mainnet';

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    this.network = network;
    this.server = new StellarSdk.Horizon.Server(
      network === 'testnet'
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );
  }

  async getAccountData(address: string) {
    try {
      const account = await this.server.loadAccount(address);
      return account;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Account not found');
      }
      throw error;
    }
  }

  async getAccountAge(address: string): Promise<number> {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(address)
        .order('asc')
        .limit(1)
        .call();

      if (transactions.records.length === 0) {
        return 0;
      }

      const firstTx = transactions.records[0];
      const createdDate = new Date(firstTx.created_at);
      const now = new Date();
      const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      return ageInDays;
    } catch (error) {
      return 0;
    }
  }

  async getTransactionCount(address: string): Promise<number> {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(address)
        .limit(1)
        .call();

      // Horizon doesn't return total count directly, this is an approximation
      return transactions.records.length > 0 ? 100 : 0; // Placeholder
    } catch (error) {
      return 0;
    }
  }
}

// Singleton instance
let stellarServiceTestnet: StellarService;
let stellarServiceMainnet: StellarService;

export function getStellarService(network: 'testnet' | 'mainnet' = 'testnet'): StellarService {
  if (network === 'testnet') {
    if (!stellarServiceTestnet) {
      stellarServiceTestnet = new StellarService('testnet');
    }
    return stellarServiceTestnet;
  } else {
    if (!stellarServiceMainnet) {
      stellarServiceMainnet = new StellarService('mainnet');
    }
    return stellarServiceMainnet;
  }
}

