import { WalletAnalysisResult } from './walletRiskAnalyzer';

/**
 * Analytics & Logging Service
 * 
 * Risk analizlerini log'lar ve istatistik tutar.
 * Opsiyonel olarak backend'e veya analytics service'e gönderilebilir.
 */

export interface AnalysisLog {
  timestamp: Date;
  userAddress: string;
  targetAddress: string;
  analysis: WalletAnalysisResult;
  action: 'analyzed' | 'sent' | 'cancelled';
  amount?: string;
  asset?: string;
  network: 'testnet' | 'mainnet';
}

/**
 * Log Storage (Local Storage)
 */
class AnalysisLogger {
  private static STORAGE_KEY = 'argus_analysis_logs';
  private static MAX_LOGS = 100; // Son 100 analizi tut

  /**
   * Analizi log'la
   */
  static log(log: AnalysisLog): void {
    try {
      const logs = this.getLogs();
      logs.unshift(log);

      // Max log sayısını aş diye sınırla
      if (logs.length > this.MAX_LOGS) {
        logs.splice(this.MAX_LOGS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      console.log('📝 Analysis logged:', log);

      // Opsiyonel: Backend'e gönder
      this.sendToBackend(log);
    } catch (error) {
      console.error('Failed to log analysis:', error);
    }
  }

  /**
   * Tüm log'ları getir
   */
  static getLogs(): AnalysisLog[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      return JSON.parse(stored).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
        analysis: {
          ...log.analysis,
          timestamp: new Date(log.analysis.timestamp),
        },
      }));
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Son N analizi getir
   */
  static getRecentLogs(count: number = 10): AnalysisLog[] {
    return this.getLogs().slice(0, count);
  }

  /**
   * Belirli bir kullanıcının log'larını getir
   */
  static getUserLogs(userAddress: string): AnalysisLog[] {
    return this.getLogs().filter((log) => log.userAddress === userAddress);
  }

  /**
   * İstatistikleri hesapla
   */
  static getStatistics(): {
    totalAnalyses: number;
    sentTransactions: number;
    cancelledTransactions: number;
    riskDistribution: Record<string, number>;
    averageRiskScore: number;
    highRiskBlocked: number;
  } {
    const logs = this.getLogs();

    const stats = {
      totalAnalyses: logs.length,
      sentTransactions: logs.filter((l) => l.action === 'sent').length,
      cancelledTransactions: logs.filter((l) => l.action === 'cancelled').length,
      riskDistribution: {} as Record<string, number>,
      averageRiskScore: 0,
      highRiskBlocked: logs.filter(
        (l) =>
          l.action === 'cancelled' &&
          (l.analysis.riskLevel === 'high' || l.analysis.riskLevel === 'critical')
      ).length,
    };

    // Risk dağılımı
    logs.forEach((log) => {
      const level = log.analysis.riskLevel;
      stats.riskDistribution[level] = (stats.riskDistribution[level] || 0) + 1;
    });

    // Ortalama risk skoru
    if (logs.length > 0) {
      const totalRisk = logs.reduce((sum, log) => sum + log.analysis.riskScore, 0);
      stats.averageRiskScore = Math.round(totalRisk / logs.length);
    }

    return stats;
  }

  /**
   * Log'ları temizle
   */
  static clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Analysis logs cleared');
  }

  /**
   * Backend'e gönder (opsiyonel)
   */
  private static async sendToBackend(log: AnalysisLog): Promise<void> {
    // Backend URL'i environment variable'dan al
    const backendUrl = process.env.NEXT_PUBLIC_ANALYTICS_API_URL;

    if (!backendUrl) {
      // Backend URL yoksa sadece local'de tut
      return;
    }

    try {
      await fetch(`${backendUrl}/api/analysis-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });
    } catch (error) {
      console.error('Failed to send log to backend:', error);
      // Backend'e gönderilemezse sessizce devam et
    }
  }

  /**
   * Export CSV
   */
  static exportToCSV(): string {
    const logs = this.getLogs();
    const headers = [
      'Timestamp',
      'User Address',
      'Target Address',
      'Risk Level',
      'Risk Score',
      'Action',
      'Amount',
      'Asset',
      'Network',
    ];

    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.userAddress,
      log.targetAddress,
      log.analysis.riskLevel,
      log.analysis.riskScore,
      log.action,
      log.amount || '',
      log.asset || '',
      log.network,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    return csv;
  }

  /**
   * Download CSV
   */
  static downloadCSV(): void {
    const csv = this.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `argus-analysis-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('📥 CSV downloaded');
  }
}

/**
 * Analytics Hook (React)
 */
export function useAnalyticsLogger() {
  const logAnalysis = (
    userAddress: string,
    targetAddress: string,
    analysis: WalletAnalysisResult,
    network: 'testnet' | 'mainnet'
  ) => {
    AnalysisLogger.log({
      timestamp: new Date(),
      userAddress,
      targetAddress,
      analysis,
      action: 'analyzed',
      network,
    });
  };

  const logTransaction = (
    userAddress: string,
    targetAddress: string,
    analysis: WalletAnalysisResult,
    action: 'sent' | 'cancelled',
    amount?: string,
    asset?: string,
    network: 'testnet' | 'mainnet' = 'testnet'
  ) => {
    AnalysisLogger.log({
      timestamp: new Date(),
      userAddress,
      targetAddress,
      analysis,
      action,
      amount,
      asset,
      network,
    });
  };

  const getStats = () => AnalysisLogger.getStatistics();
  const getLogs = () => AnalysisLogger.getLogs();
  const clearLogs = () => AnalysisLogger.clearLogs();
  const downloadCSV = () => AnalysisLogger.downloadCSV();

  return {
    logAnalysis,
    logTransaction,
    getStats,
    getLogs,
    clearLogs,
    downloadCSV,
  };
}

/**
 * Example Usage:
 * 
 * // SendAssetModal.tsx içinde
 * const { logAnalysis, logTransaction } = useAnalyticsLogger();
 * 
 * // Analiz yapıldığında
 * logAnalysis(wallet.publicKey, destination, analysis, wallet.network);
 * 
 * // Transaction gönderildiğinde
 * logTransaction(
 *   wallet.publicKey,
 *   destination,
 *   analysis,
 *   'sent',
 *   amount,
 *   selectedAsset.asset.code,
 *   wallet.network
 * );
 * 
 * // Transaction iptal edildiğinde
 * logTransaction(
 *   wallet.publicKey,
 *   destination,
 *   analysis,
 *   'cancelled',
 *   undefined,
 *   undefined,
 *   wallet.network
 * );
 * 
 * // İstatistikleri göster
 * const stats = getStats();
 * console.log('📊 Stats:', stats);
 */

export default AnalysisLogger;
