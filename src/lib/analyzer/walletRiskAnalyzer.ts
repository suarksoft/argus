import { StellarClient } from '../stellar/client';

/**
 * Risk Seviyeleri
 */
export enum RiskLevel {
  SAFE = 'safe',           // Güvenli (0-30 risk)
  LOW = 'low',             // Düşük risk (31-50)
  MEDIUM = 'medium',       // Orta risk (51-70)
  HIGH = 'high',           // Yüksek risk (71-85)
  CRITICAL = 'critical'    // Kritik risk (86-100)
}

/**
 * Risk Faktörleri
 */
export interface RiskFactors {
  accountAge: {
    score: number;
    risk: number;
    description: string;
  };
  transactionHistory: {
    score: number;
    risk: number;
    description: string;
  };
  accountActivity: {
    score: number;
    risk: number;
    description: string;
  };
  knownScammer: {
    score: number;
    risk: number;
    description: string;
  };
  multiSig: {
    score: number;
    risk: number;
    description: string;
  };
}

/**
 * Analiz Sonucu
 */
export interface WalletAnalysisResult {
  address: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  factors: RiskFactors;
  recommendation: string;
  warnings: string[];
  greenFlags: string[];
  timestamp: Date;
}

/**
 * Bilinen Scam Adresleri (gerçek uygulamada database'den çekilir)
 */
const KNOWN_SCAM_ADDRESSES = new Set([
  // Örnek scam adresleri (gerçek adresler değil)
  'GASCAMMERADDRESSEXAMPLE1234567890ABCDEFGH',
]);

/**
 * Bilinen Güvenilir Adresler (exchange'ler, vs.)
 */
const KNOWN_SAFE_ADDRESSES = new Set([
  // Örnek güvenilir adresler
  'GBINANCE1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'GKRAKEN1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
]);

/**
 * Wallet Risk Analyzer
 */
export class WalletRiskAnalyzer {
  private stellarClient: StellarClient;

  constructor(isTestnet: boolean = true) {
    this.stellarClient = new StellarClient(isTestnet);
  }

  /**
   * Ana analiz fonksiyonu
   */
  async analyzeWallet(address: string): Promise<WalletAnalysisResult> {
    console.log('🔍 Analyzing wallet:', address);

    try {
      // 1. On-chain data çek
      const accountData = await this.stellarClient.loadAccount(address);
      const transactions = await this.stellarClient.getTransactions(address, 100).catch(() => []);
      const payments = await this.stellarClient.getPaymentHistory(address, 100).catch(() => []);
      const accountAge = await this.stellarClient.getAccountAge(address).catch(() => 0);

      // 2. Risk faktörlerini hesapla
      const factors = this.calculateRiskFactors({
        address,
        accountData,
        transactions,
        payments,
        accountAge,
      });

      // 3. Toplam risk skorunu hesapla
      const riskScore = this.calculateTotalRiskScore(factors);

      // 4. Risk seviyesini belirle
      const riskLevel = this.determineRiskLevel(riskScore);

      // 5. Recommendation oluştur
      const recommendation = this.generateRecommendation(riskLevel, factors);

      // 6. Uyarıları topla
      const warnings = this.collectWarnings(factors);

      // 7. Pozitif işaretleri topla
      const greenFlags = this.collectGreenFlags(factors);

      return {
        address,
        riskLevel,
        riskScore,
        factors,
        recommendation,
        warnings,
        greenFlags,
        timestamp: new Date(),
      };
    } catch (error: any) {
      // Hesap bulunamazsa yüksek risk
      if (error?.isNotFound || error?.message?.includes('not found')) {
        return this.createNotFoundResult(address);
      }
      throw error;
    }
  }

  /**
   * Risk faktörlerini hesapla
   */
  private calculateRiskFactors(data: any): RiskFactors {
    const { address, accountData, transactions, payments, accountAge } = data;

    // 1. Account Age Analysis
    const accountAgeAnalysis = this.analyzeAccountAge(accountAge);

    // 2. Transaction History Analysis
    const transactionAnalysis = this.analyzeTransactionHistory(transactions);

    // 3. Account Activity Analysis
    const activityAnalysis = this.analyzeAccountActivity(payments, transactions);

    // 4. Known Scammer Check
    const scammerCheck = this.checkKnownScammer(address);

    // 5. Multi-Sig Analysis
    const multiSigAnalysis = this.analyzeMultiSig(accountData);

    return {
      accountAge: accountAgeAnalysis,
      transactionHistory: transactionAnalysis,
      accountActivity: activityAnalysis,
      knownScammer: scammerCheck,
      multiSig: multiSigAnalysis,
    };
  }

  /**
   * Hesap yaşı analizi
   */
  private analyzeAccountAge(ageInDays: number): RiskFactors['accountAge'] {
    if (ageInDays === 0) {
      return {
        score: 0,
        risk: 80,
        description: 'Yeni oluşturulmuş hesap (0 gün) - yüksek risk',
      };
    }

    if (ageInDays < 7) {
      return {
        score: 20,
        risk: 60,
        description: `Çok yeni hesap (${ageInDays} gün) - dikkatli olun`,
      };
    }

    if (ageInDays < 30) {
      return {
        score: 40,
        risk: 40,
        description: `Yeni hesap (${ageInDays} gün) - orta risk`,
      };
    }

    if (ageInDays < 90) {
      return {
        score: 60,
        risk: 20,
        description: `Orta yaşlı hesap (${ageInDays} gün) - düşük risk`,
      };
    }

    return {
      score: 100,
      risk: 0,
      description: `Eski hesap (${ageInDays} gün) - güvenilir`,
    };
  }

  /**
   * Transaction geçmişi analizi
   */
  private analyzeTransactionHistory(transactions: any[]): RiskFactors['transactionHistory'] {
    const txCount = transactions.length;

    if (txCount === 0) {
      return {
        score: 0,
        risk: 70,
        description: 'Hiç transaction yok - şüpheli',
      };
    }

    if (txCount < 5) {
      return {
        score: 30,
        risk: 50,
        description: `Çok az transaction (${txCount}) - dikkatli olun`,
      };
    }

    if (txCount < 20) {
      return {
        score: 60,
        risk: 30,
        description: `Az transaction (${txCount}) - orta güvenilirlik`,
      };
    }

    if (txCount < 50) {
      return {
        score: 80,
        risk: 10,
        description: `İyi transaction geçmişi (${txCount}) - güvenilir`,
      };
    }

    return {
      score: 100,
      risk: 0,
      description: `Zengin transaction geçmişi (${txCount}) - çok güvenilir`,
    };
  }

  /**
   * Hesap aktivitesi analizi
   */
  private analyzeAccountActivity(payments: any[], transactions: any[]): RiskFactors['accountActivity'] {
    const paymentCount = payments.length;
    const txCount = transactions.length;

    // Son transaction zamanını kontrol et
    if (transactions.length > 0) {
      const lastTx = transactions[0];
      const lastTxDate = new Date(lastTx.created_at);
      const daysSinceLastTx = Math.floor(
        (Date.now() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastTx > 180) {
        return {
          score: 30,
          risk: 50,
          description: `Uzun süredir aktif değil (${daysSinceLastTx} gün) - terk edilmiş olabilir`,
        };
      }

      if (daysSinceLastTx > 90) {
        return {
          score: 50,
          risk: 30,
          description: `Bir süredir aktif değil (${daysSinceLastTx} gün)`,
        };
      }
    }

    // Payment/Transaction oranı
    const ratio = txCount > 0 ? paymentCount / txCount : 0;

    if (ratio > 0.8) {
      return {
        score: 90,
        risk: 5,
        description: `Aktif kullanıcı (${paymentCount} payment, ${txCount} tx) - normal kullanım`,
      };
    }

    if (ratio > 0.5) {
      return {
        score: 70,
        risk: 15,
        description: `Orta aktivite (${paymentCount} payment, ${txCount} tx)`,
      };
    }

    return {
      score: 50,
      risk: 30,
      description: `Düşük aktivite - dikkatli olun`,
    };
  }

  /**
   * Bilinen scammer kontrolü
   */
  private checkKnownScammer(address: string): RiskFactors['knownScammer'] {
    if (KNOWN_SCAM_ADDRESSES.has(address)) {
      return {
        score: 0,
        risk: 100,
        description: '⚠️ BİLİNEN SCAMMER ADRESİ - GÖNDERMEYİN!',
      };
    }

    if (KNOWN_SAFE_ADDRESSES.has(address)) {
      return {
        score: 100,
        risk: 0,
        description: '✅ Doğrulanmış güvenilir adres (Exchange)',
      };
    }

    return {
      score: 50,
      risk: 20,
      description: 'Bilinmeyen adres - dikkatli olun',
    };
  }

  /**
   * Multi-signature analizi
   */
  private analyzeMultiSig(accountData: any): RiskFactors['multiSig'] {
    const signers = accountData?.signers || [];

    if (signers.length > 2) {
      return {
        score: 100,
        risk: 0,
        description: `Multi-signature aktif (${signers.length} signer) - çok güvenli`,
      };
    }

    if (signers.length === 2) {
      return {
        score: 80,
        risk: 10,
        description: '2-signer multi-sig - güvenli',
      };
    }

    return {
      score: 50,
      risk: 20,
      description: 'Tek signer - normal güvenlik',
    };
  }

  /**
   * Toplam risk skorunu hesapla (0-100)
   */
  private calculateTotalRiskScore(factors: RiskFactors): number {
    const weights = {
      knownScammer: 0.4,      // %40 - en önemli
      accountAge: 0.2,        // %20
      transactionHistory: 0.2, // %20
      accountActivity: 0.15,   // %15
      multiSig: 0.05,         // %5
    };

    const riskScore =
      factors.knownScammer.risk * weights.knownScammer +
      factors.accountAge.risk * weights.accountAge +
      factors.transactionHistory.risk * weights.transactionHistory +
      factors.accountActivity.risk * weights.accountActivity +
      factors.multiSig.risk * weights.multiSig;

    return Math.round(riskScore);
  }

  /**
   * Risk seviyesini belirle
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 86) return RiskLevel.CRITICAL;
    if (riskScore >= 71) return RiskLevel.HIGH;
    if (riskScore >= 51) return RiskLevel.MEDIUM;
    if (riskScore >= 31) return RiskLevel.LOW;
    return RiskLevel.SAFE;
  }

  /**
   * Recommendation oluştur
   */
  private generateRecommendation(riskLevel: RiskLevel, factors: RiskFactors): string {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return '🛑 UYARI: Bu adrese GÖNDERMEYİN! Çok yüksek risk tespit edildi. Muhtemelen bir scam adresi.';
      
      case RiskLevel.HIGH:
        return '⚠️ DİKKAT: Yüksek riskli adres. Sadece güvendiğiniz kişilere gönderin. Küçük miktarla test edin.';
      
      case RiskLevel.MEDIUM:
        return '⚡ UYARI: Orta seviye risk. Adresi doğrulayın ve küçük miktarla test gönderin.';
      
      case RiskLevel.LOW:
        return '✓ Düşük risk. Normal bir adres gibi görünüyor ancak yine de dikkatli olun.';
      
      case RiskLevel.SAFE:
        return '✅ Güvenli adres. Gönderim yapabilirsiniz.';
      
      default:
        return 'Bilinmeyen risk seviyesi.';
    }
  }

  /**
   * Uyarıları topla
   */
  private collectWarnings(factors: RiskFactors): string[] {
    const warnings: string[] = [];

    if (factors.knownScammer.risk >= 80) {
      warnings.push('⛔ Bilinen scammer adresi!');
    }

    if (factors.accountAge.risk >= 60) {
      warnings.push('⚠️ Çok yeni hesap');
    }

    if (factors.transactionHistory.risk >= 50) {
      warnings.push('📊 Yetersiz transaction geçmişi');
    }

    if (factors.accountActivity.risk >= 40) {
      warnings.push('💤 Düşük hesap aktivitesi');
    }

    return warnings;
  }

  /**
   * Pozitif işaretleri topla
   */
  private collectGreenFlags(factors: RiskFactors): string[] {
    const greenFlags: string[] = [];

    if (factors.knownScammer.score === 100) {
      greenFlags.push('✅ Doğrulanmış güvenilir adres');
    }

    if (factors.accountAge.score >= 80) {
      greenFlags.push('📅 Eski ve güvenilir hesap');
    }

    if (factors.transactionHistory.score >= 80) {
      greenFlags.push('📈 Zengin transaction geçmişi');
    }

    if (factors.accountActivity.score >= 80) {
      greenFlags.push('⚡ Aktif kullanıcı');
    }

    if (factors.multiSig.score >= 80) {
      greenFlags.push('🔐 Multi-signature güvenliği');
    }

    return greenFlags;
  }

  /**
   * Hesap bulunamadığında result
   */
  private createNotFoundResult(address: string): WalletAnalysisResult {
    return {
      address,
      riskLevel: RiskLevel.HIGH,
      riskScore: 75,
      factors: {
        accountAge: {
          score: 0,
          risk: 80,
          description: 'Hesap bulunamadı - aktive edilmemiş',
        },
        transactionHistory: {
          score: 0,
          risk: 70,
          description: 'Transaction geçmişi yok',
        },
        accountActivity: {
          score: 0,
          risk: 60,
          description: 'Aktivite tespit edilemedi',
        },
        knownScammer: {
          score: 50,
          risk: 20,
          description: 'Bilinmeyen adres',
        },
        multiSig: {
          score: 0,
          risk: 50,
          description: 'Güvenlik ayarları belirlenemedi',
        },
      },
      recommendation: '⚠️ UYARI: Bu adres Stellar ağında aktif değil. Yeni hesap olabilir veya yanlış adres girmiş olabilirsiniz.',
      warnings: [
        '⚠️ Hesap blockchain üzerinde bulunamadı',
        '🔍 Adresin doğruluğunu kontrol edin',
        '💡 Alıcıya hesabın aktif olduğunu sorun',
      ],
      greenFlags: [],
      timestamp: new Date(),
    };
  }
}

/**
 * Helper: Risk seviyesi rengi
 */
export function getRiskLevelColor(riskLevel: RiskLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (riskLevel) {
    case RiskLevel.CRITICAL:
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
      };
    case RiskLevel.HIGH:
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-300',
      };
    case RiskLevel.MEDIUM:
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
      };
    case RiskLevel.LOW:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-300',
      };
    case RiskLevel.SAFE:
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-300',
      };
  }
}

/**
 * Helper: Risk seviyesi emoji
 */
export function getRiskLevelEmoji(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case RiskLevel.CRITICAL:
      return '🛑';
    case RiskLevel.HIGH:
      return '⚠️';
    case RiskLevel.MEDIUM:
      return '⚡';
    case RiskLevel.LOW:
      return '✓';
    case RiskLevel.SAFE:
      return '✅';
  }
}
