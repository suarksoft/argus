import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarClient } from '../stellar/client';

/**
 * Transaction Preview Service
 * 
 * Transaction'ı göndermeden önce simüle eder ve sonuçları gösterir.
 * Potansiyel hataları, ücretleri ve sonuçları önceden görebilirsiniz.
 */

export interface TransactionPreview {
  success: boolean;
  fee: string; // XLM
  operations: Array<{
    type: string;
    details: any;
  }>;
  errors?: string[];
  warnings?: string[];
  estimatedTime: string; // ~5 seconds
  resultXDR?: string;
}

/**
 * Transaction Preview Service
 */
export class TransactionPreviewService {
  private stellarClient: StellarClient;
  private server: StellarSdk.Horizon.Server;

  constructor(isTestnet: boolean = false) {
    this.stellarClient = new StellarClient(isTestnet);
    this.server = new StellarSdk.Horizon.Server(
      isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );
  }

  /**
   * Transaction'ı simüle et (göndermeden önce)
   */
  async previewTransaction(
    sourceAddress: string,
    destinationAddress: string,
    asset: StellarSdk.Asset,
    amount: string,
    memo?: string
  ): Promise<TransactionPreview> {
    try {
      console.log('🔍 Previewing transaction...');

      // Source account'u yükle
      const sourceAccount = await this.stellarClient.loadAccount(sourceAddress);

      // Transaction builder
      let transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.stellarClient.networkPassphrase,
      });

      // Payment operation
      transaction = transaction.addOperation(
        StellarSdk.Operation.payment({
          destination: destinationAddress,
          asset,
          amount: amount.toString(),
        })
      );

      // Memo varsa ekle
      if (memo) {
        transaction = transaction.addMemo(StellarSdk.Memo.text(memo));
      }

      // Timeout
      transaction = transaction.setTimeout(180);

      // Transaction'ı build et
      const builtTransaction = transaction.build();

      // Fee hesapla
      const fee = (parseInt(builtTransaction.fee) / 10000000).toFixed(7);

      // Operations çıkar
      const operations = builtTransaction.operations.map((op: any) => ({
        type: op.type,
        details: this.formatOperationDetails(op),
      }));

      // Uyarılar ve hatalar
      const warnings: string[] = [];
      const errors: string[] = [];

      // Destination account kontrolü
      try {
        await this.stellarClient.loadAccount(destinationAddress);
      } catch (error: any) {
        if (error?.isNotFound) {
          warnings.push(
            '⚠️ Alıcı hesap henüz aktif değil. İlk gönderimde minimum 1 XLM gereklidir.'
          );
        }
      }

      // Miktar kontrolü
      if (asset.isNative()) {
        const sourceBalance = await this.stellarClient.getAccountBalances(sourceAddress);
        const xlmBalance = sourceBalance.find((b) => b.asset.code === 'XLM' && !b.asset.issuer);
        
        if (xlmBalance) {
          const balance = parseFloat(xlmBalance.balance);
          const sendAmount = parseFloat(amount);
          const totalCost = sendAmount + parseFloat(fee) + 1; // +1 minimum balance

          if (totalCost > balance) {
            errors.push(
              `❌ Yetersiz bakiye. Gerekli: ${totalCost.toFixed(2)} XLM, Mevcut: ${balance.toFixed(2)} XLM`
            );
          } else if (balance - totalCost < 2) {
            warnings.push(
              '⚠️ Bu gönderimden sonra bakiyeniz çok düşük olacak. Minimum 1-2 XLM tutmanız önerilir.'
            );
          }
        }
      }

      return {
        success: errors.length === 0,
        fee,
        operations,
        errors,
        warnings,
        estimatedTime: '~5 saniye',
      };
    } catch (error: any) {
      console.error('Transaction preview error:', error);
      
      return {
        success: false,
        fee: '0.00001',
        operations: [],
        errors: [error?.message || 'Transaction preview başarısız'],
        warnings: [],
        estimatedTime: '~5 saniye',
      };
    }
  }

  /**
   * Operation detaylarını formatla
   */
  private formatOperationDetails(operation: any): any {
    switch (operation.type) {
      case 'payment':
        return {
          destination: operation.destination,
          asset: operation.asset.isNative() ? 'XLM' : operation.asset.code,
          amount: operation.amount,
        };
      
      case 'createAccount':
        return {
          destination: operation.destination,
          startingBalance: operation.startingBalance,
        };
      
      default:
        return operation;
    }
  }

  /**
   * Helper: Check if destination needs activation
   */
  async needsActivation(address: string): Promise<boolean> {
    try {
      await this.stellarClient.loadAccount(address);
      return false; // Hesap zaten aktif
    } catch (error: any) {
      if (error?.isNotFound) {
        return true; // Hesap aktif değil
      }
      throw error;
    }
  }

  /**
   * Helper: Calculate minimum send amount
   */
  getMinimumSendAmount(destinationActive: boolean): string {
    return destinationActive ? '0.0000001' : '1'; // Aktif değilse min 1 XLM
  }
}

/**
 * Helper: Format preview warnings for UI
 */
export function formatPreviewWarnings(preview: TransactionPreview): string[] {
  const messages: string[] = [];

  if (preview.warnings) {
    messages.push(...preview.warnings);
  }

  if (preview.errors) {
    messages.push(...preview.errors);
  }

  return messages;
}

/**
 * Helper: Get preview status color
 */
export function getPreviewStatusColor(preview: TransactionPreview): string {
  if (preview.errors && preview.errors.length > 0) {
    return 'text-red-700';
  }
  if (preview.warnings && preview.warnings.length > 0) {
    return 'text-orange-700';
  }
  return 'text-green-700';
}
