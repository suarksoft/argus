import { WalletRiskAnalyzer, WalletAnalysisResult, RiskLevel } from './walletRiskAnalyzer';
import { StellarExpertClient, isVerifiedOrganization, getOrganizationType } from './stellarExpertClient';
import { TomlVerificationService, getVerificationBadge } from './tomlVerification';

/**
 * Enhanced Wallet Risk Analyzer
 * 
 * Orijinal risk analizine ek olarak:
 * - Stellar Expert API entegrasyonu
 * - TOML verification (domain ownership)
 * - Organization verification
 * - Enhanced trust scoring
 */

export interface EnhancedAnalysisResult extends WalletAnalysisResult {
  // Stellar Expert data
  expertData?: {
    trustScore: number; // 0-100
    isVerifiedOrg: boolean;
    orgType?: string; // 'exchange', 'validator', 'anchor'
    tags: string[];
    ratings?: {
      age?: number;
      volume?: number;
      trust?: number;
    };
  };
  
  // TOML verification
  tomlVerification?: {
    verified: boolean;
    domain?: string;
    orgName?: string;
    orgEmail?: string;
  };
  
  // Enhanced flags
  verificationBadges: string[]; // ['✅ Doğrulanmış Exchange', '🌐 Domain Sahibi']
}

/**
 * Enhanced Wallet Risk Analyzer
 */
export class EnhancedWalletRiskAnalyzer {
  private baseAnalyzer: WalletRiskAnalyzer;
  private expertClient: StellarExpertClient;
  private tomlService: TomlVerificationService;

  constructor(isTestnet: boolean = false) {
    this.baseAnalyzer = new WalletRiskAnalyzer(isTestnet);
    this.expertClient = new StellarExpertClient(isTestnet);
    this.tomlService = new TomlVerificationService();
  }

  /**
   * Enhanced analiz - tüm veri kaynaklarını kullan
   */
  async analyzeWallet(address: string, homeDomain?: string): Promise<EnhancedAnalysisResult> {
    console.log('🔍 Enhanced analysis starting...');

    // 1. Base analiz (mevcut sistemimiz)
    const baseAnalysis = await this.baseAnalyzer.analyzeWallet(address);

    // 2. Stellar Expert analizi (paralel)
    const [expertAccount, expertDirectory] = await Promise.all([
      this.expertClient.getAccountInfo(address).catch(() => null),
      this.expertClient.getDirectoryInfo(address).catch(() => null),
    ]);

    // 3. TOML verification (eğer home_domain varsa)
    let tomlVerification = null;
    if (homeDomain) {
      tomlVerification = await this.tomlService.verifyAccount(address, homeDomain);
    }

    // 4. Expert data'yı işle
    const expertData = expertAccount
      ? {
          trustScore: this.expertClient.calculateTrustScore(expertAccount),
          isVerifiedOrg: isVerifiedOrganization(expertDirectory, expertAccount),
          orgType: getOrganizationType(expertDirectory, expertAccount) || undefined,
          tags: expertAccount.tags || [],
          ratings: expertAccount.ratings,
        }
      : undefined;

    // 5. Verification badges oluştur
    const verificationBadges: string[] = [];
    
    if (expertData?.isVerifiedOrg) {
      if (expertData.orgType === 'exchange') {
        verificationBadges.push('✅ Doğrulanmış Exchange');
      } else if (expertData.orgType === 'validator') {
        verificationBadges.push('✅ Doğrulanmış Validator');
      } else if (expertData.orgType === 'anchor') {
        verificationBadges.push('✅ Doğrulanmış Anchor');
      } else {
        verificationBadges.push('✅ Doğrulanmış Kuruluş');
      }
    }

    if (tomlVerification?.verified) {
      const badge = getVerificationBadge(tomlVerification);
      if (badge) {
        verificationBadges.push(badge.text);
      }
    }

    // 6. Risk skorunu yeniden hesapla (expert data ile)
    const enhancedRiskScore = this.calculateEnhancedRiskScore(
      baseAnalysis.riskScore,
      expertData,
      tomlVerification
    );

    // 7. Risk seviyesini güncelle
    const enhancedRiskLevel = this.determineRiskLevel(enhancedRiskScore);

    // 8. Recommendation'ı güncelle
    const enhancedRecommendation = this.generateEnhancedRecommendation(
      enhancedRiskLevel,
      expertData,
      tomlVerification
    );

    // 9. Green flags ekle
    const enhancedGreenFlags = [...baseAnalysis.greenFlags];
    
    if (expertData?.isVerifiedOrg) {
      enhancedGreenFlags.push('✅ Stellar Expert tarafından doğrulanmış');
    }
    
    if (tomlVerification?.verified) {
      enhancedGreenFlags.push(`✅ Domain ownership doğrulandı (${tomlVerification.domain})`);
    }

    if (expertData && expertData.trustScore > 70) {
      enhancedGreenFlags.push(`✅ Yüksek güven skoru (${expertData.trustScore}/100)`);
    }

    // 10. Enhanced result oluştur
    return {
      ...baseAnalysis,
      riskScore: enhancedRiskScore,
      riskLevel: enhancedRiskLevel,
      recommendation: enhancedRecommendation,
      greenFlags: enhancedGreenFlags,
      expertData,
      tomlVerification: tomlVerification || undefined,
      verificationBadges,
    };
  }

  /**
   * Enhanced risk score hesapla
   */
  private calculateEnhancedRiskScore(
    baseScore: number,
    expertData?: any,
    tomlVerification?: any
  ): number {
    let score = baseScore;

    // Expert data ile risk azalt
    if (expertData) {
      if (expertData.isVerifiedOrg) {
        score = Math.max(0, score - 20); // Doğrulanmış kuruluş: -20 risk
      }

      if (expertData.trustScore > 70) {
        score = Math.max(0, score - 10); // Yüksek trust: -10 risk
      }

      // Tags bonusu
      if (expertData.tags.includes('exchange')) {
        score = Math.max(0, score - 15);
      }
      if (expertData.tags.includes('validator')) {
        score = Math.max(0, score - 10);
      }
    }

    // TOML verification ile risk azalt
    if (tomlVerification?.verified) {
      score = Math.max(0, score - 15); // Domain ownership: -15 risk
    }

    return Math.round(score);
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
   * Enhanced recommendation oluştur
   */
  private generateEnhancedRecommendation(
    riskLevel: RiskLevel,
    expertData?: any,
    tomlVerification?: any
  ): string {
    // Doğrulanmış kuruluş
    if (expertData?.isVerifiedOrg && tomlVerification?.verified) {
      return '✅ Doğrulanmış ve güvenilir kuruluş. Güvenle gönderim yapabilirsiniz.';
    }

    // Sadece expert verification
    if (expertData?.isVerifiedOrg) {
      return '✅ Stellar Expert tarafından doğrulanmış kuruluş. Güvenilir görünüyor.';
    }

    // Sadece TOML verification
    if (tomlVerification?.verified) {
      return '✅ Domain ownership doğrulanmış. Güvenilir görünüyor.';
    }

    // Normal risk seviyeleri
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return '🛑 UYARI: Bu adrese GÖNDERMEYİN! Çok yüksek risk tespit edildi.';
      case RiskLevel.HIGH:
        return '⚠️ DİKKAT: Yüksek riskli adres. Sadece güvendiğiniz kişilere gönderin.';
      case RiskLevel.MEDIUM:
        return '⚡ UYARI: Orta seviye risk. Adresi doğrulayın ve küçük miktarla test edin.';
      case RiskLevel.LOW:
        return '✓ Düşük risk. Normal bir adres gibi görünüyor ancak dikkatli olun.';
      case RiskLevel.SAFE:
        return '✅ Güvenli adres. Gönderim yapabilirsiniz.';
      default:
        return 'Bilinmeyen risk seviyesi.';
    }
  }
}

/**
 * Helper: Get verification summary
 */
export function getVerificationSummary(result: EnhancedAnalysisResult): string {
  const badges: string[] = [];

  if (result.expertData?.isVerifiedOrg) {
    badges.push('Stellar Expert ✓');
  }

  if (result.tomlVerification?.verified) {
    badges.push('Domain ✓');
  }

  if (badges.length === 0) {
    return 'Doğrulanmamış';
  }

  return badges.join(' | ');
}
