import * as StellarSdk from '@stellar/stellar-sdk';

export class StellarClient {
  private server: StellarSdk.Horizon.Server;
  public network: string;
  public networkPassphrase: string;

  constructor(isTestnet: boolean = true) {
    const horizonUrl = isTestnet
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';
    
    this.server = new StellarSdk.Horizon.Server(horizonUrl);
    this.network = isTestnet ? 'testnet' : 'mainnet';
    this.networkPassphrase = isTestnet ? StellarSdk.Networks.TESTNET : StellarSdk.Networks.PUBLIC;
  }

  /**
   * Load account from Stellar network
   */
  async loadAccount(accountId: string) {
    try {
      const account = await this.server.loadAccount(accountId);
      return account;
    } catch (error: any) {
      // Hesap bulunamadıysa özel bir hata fırlat
      if (error?.response?.status === 404) {
        const notFoundError = new Error(`Account not found: ${accountId}`);
        (notFoundError as any).isNotFound = true;
        (notFoundError as any).accountId = accountId;
        (notFoundError as any).network = this.network;
        throw notFoundError;
      }
      
      if (error instanceof Error) {
        throw new Error(`Failed to load account ${accountId}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get asset information
   */
  async getAssetInfo(assetCode: string, issuerAddress: string) {
    try {
      const assets = await this.server
        .assets()
        .forCode(assetCode)
        .forIssuer(issuerAddress)
        .limit(1)
        .call();

      if (assets.records.length === 0) {
        throw new Error('Asset not found');
      }

      return assets.records[0];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get asset: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get account transactions
   */
  async getTransactions(accountId: string, limit: number = 10) {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(accountId)
        .limit(limit)
        .order('desc')
        .call();

      return transactions.records;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get transactions: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get account operations
   */
  async getOperations(accountId: string, limit: number = 50) {
    try {
      const operations = await this.server
        .operations()
        .forAccount(accountId)
        .limit(limit)
        .order('desc')
        .call();

      return operations.records;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get operations: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Verify TOML file from home domain
   */
  async verifyToml(homeDomain: string, issuerAddress: string): Promise<boolean> {
    try {
      const tomlUrl = `https://${homeDomain}/.well-known/stellar.toml`;
      const response = await fetch(tomlUrl);
      
      if (!response.ok) {
        return false;
      }

      const tomlContent = await response.text();
      
      // Simple check: does TOML contain the issuer address?
      return tomlContent.includes(issuerAddress);
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate account age in days
   */
  async getAccountAge(accountId: string): Promise<number> {
    try {
      const transactions = await this.server
        .transactions()
        .forAccount(accountId)
        .order('asc')
        .limit(1)
        .call();

      if (transactions.records.length === 0) {
        return 0;
      }

      const createdAt = new Date(transactions.records[0].created_at);
      const now = new Date();
      const ageInMs = now.getTime() - createdAt.getTime();
      const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

      return ageInDays;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get account payment history
   */
  async getPaymentHistory(accountId: string, limit: number = 20) {
    try {
      const payments = await this.server
        .payments()
        .forAccount(accountId)
        .limit(limit)
        .order('desc')
        .call();

      return payments.records;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get payment history: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string) {
    try {
      const transaction = await this.server.transactions().transaction(hash).call();
      return transaction;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get transaction: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get account balances
   */
  async getAccountBalances(accountId: string) {
    try {
      const account = await this.loadAccount(accountId);
      return account.balances.map((balance: any) => ({
        asset: balance.asset_type === 'native' 
          ? { code: 'XLM' }
          : { code: balance.asset_code, issuer: balance.asset_issuer },
        balance: balance.balance,
        limit: balance.limit || null,
        buyingLiabilities: balance.buying_liabilities || '0',
        sellingLiabilities: balance.selling_liabilities || '0',
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get balances: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if account has trustline for asset
   */
  async hasTrustline(accountId: string, assetCode: string, issuerAddress: string) {
    try {
      const balances = await this.getAccountBalances(accountId);
      return balances.some(balance => 
        balance.asset.code === assetCode && 
        balance.asset.issuer === issuerAddress
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get asset holders count
   */
  async getAssetHoldersCount(assetCode: string, issuerAddress: string) {
    try {
      const asset = await this.getAssetInfo(assetCode, issuerAddress);
      return parseInt((asset as any).num_accounts || (asset as any).accounts?.authorized || '0');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get account offers (open orders)
   */
  async getAccountOffers(accountId: string, limit: number = 100) {
    try {
      const offers = await this.server
        .offers()
        .forAccount(accountId)
        .limit(limit)
        .call();

      return offers.records;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get offers: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get account effects (detailed history)
   */
  async getAccountEffects(accountId: string, limit: number = 100) {
    try {
      const effects = await this.server
        .effects()
        .forAccount(accountId)
        .limit(limit)
        .order('desc')
        .call();

      return effects.records;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get effects: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get account data entries (custom data)
   */
  async getAccountData(accountId: string) {
    try {
      const account = await this.loadAccount(accountId);
      return account.data_attr || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Get account signers (multi-sig info)
   */
  async getAccountSigners(accountId: string) {
    try {
      const account = await this.loadAccount(accountId);
      return account.signers || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get account thresholds
   */
  async getAccountThresholds(accountId: string) {
    try {
      const account = await this.loadAccount(accountId);
      return {
        low_threshold: account.thresholds.low_threshold,
        med_threshold: account.thresholds.med_threshold,
        high_threshold: account.thresholds.high_threshold,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get account flags
   */
  async getAccountFlags(accountId: string) {
    try {
      const account = await this.loadAccount(accountId);
      return {
        auth_required: account.flags.auth_required,
        auth_revocable: account.flags.auth_revocable,
        auth_immutable: account.flags.auth_immutable,
        auth_clawback_enabled: account.flags.auth_clawback_enabled || false,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get recent trades for account
   */
  async getAccountTrades(accountId: string, limit: number = 50) {
    try {
      const trades = await this.server
        .trades()
        .forAccount(accountId)
        .limit(limit)
        .order('desc')
        .call();

      return trades.records;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get trades: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get account sequence number
   */
  async getAccountSequence(accountId: string): Promise<string> {
    try {
      const account = await this.loadAccount(accountId);
      return account.sequence;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get account sponsor info
   */
  async getAccountSponsor(accountId: string) {
    try {
      const account = await this.loadAccount(accountId);
      return {
        sponsor: (account as any).sponsor || null,
        num_sponsored: (account as any).num_sponsored || 0,
        num_sponsoring: (account as any).num_sponsoring || 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get approximate transaction count for an account
   * Note: Horizon API doesn't provide exact count, so we estimate from operations
   */
  async getTransactionCount(accountId: string): Promise<number> {
    try {
      // Get operations count as proxy for transaction activity
      const operations = await this.getOperations(accountId, 200);
      // If we got 200 operations, there are likely more
      // This is an approximation - real count would require pagination
      return operations.length >= 200 ? 200 : operations.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get comprehensive account stats
   */
  async getAccountStats(accountId: string) {
    try {
      const [
        account,
        transactions,
        operations,
        payments,
        offers,
        effects,
        signers,
        thresholds,
        flags,
        sponsor
      ] = await Promise.all([
        this.loadAccount(accountId),
        this.getTransactions(accountId, 100).catch(() => []),
        this.getOperations(accountId, 100).catch(() => []),
        this.getPaymentHistory(accountId, 100).catch(() => []),
        this.getAccountOffers(accountId).catch(() => []),
        this.getAccountEffects(accountId, 100).catch(() => []),
        this.getAccountSigners(accountId).catch(() => []),
        this.getAccountThresholds(accountId).catch(() => null),
        this.getAccountFlags(accountId).catch(() => null),
        this.getAccountSponsor(accountId).catch(() => null),
      ]);

      return {
        account,
        stats: {
          totalTransactions: transactions.length,
          totalOperations: operations.length,
          totalPayments: payments.length,
          activeOffers: offers.length,
          totalEffects: effects.length,
          signersCount: signers.length,
          hasMultiSig: signers.length > 1,
        },
        security: {
          thresholds,
          flags,
          signers,
          sponsor,
        },
        activity: {
          recentTransactions: transactions.slice(0, 10),
          recentPayments: payments.slice(0, 10),
          recentEffects: effects.slice(0, 20),
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const stellarClient = new StellarClient(
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'testnet'
);
