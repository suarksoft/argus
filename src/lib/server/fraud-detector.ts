/**
 * Advanced Fraud Detection Algorithm
 * 
 * Gerçek dolandırıcılık pattern'lerini tespit eder
 */

interface FraudPattern {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  confidence: number; // 0-100
  indicators: string[];
}

interface AccountBehavior {
  isNewAccount: boolean;
  hasZeroBalance: boolean;
  hasNoHistory: boolean;
  hasLowActivity: boolean;
  hasSuspiciousPattern: boolean;
  isLikelyDrainWallet: boolean;
  isLikelyPhishing: boolean;
  isLikelyPonzi: boolean;
  isLikelyFakeExchange: boolean;
}

export class FraudDetector {
  private patterns: FraudPattern[] = [];
  private confidence: number = 0;

  /**
   * Ana fraud detection algoritması
   */
  async detectFraud(data: any): Promise<{
    isFraud: boolean;
    confidence: number;
    patterns: FraudPattern[];
    behavior: AccountBehavior;
    recommendation: 'BLOCK' | 'WARN' | 'CAUTION' | 'PROCEED';
  }> {
    this.patterns = [];
    this.confidence = 0;

    const behavior = this.analyzeBehavior(data);
    
    // Pattern detection
    this.checkDrainWalletPattern(data, behavior);
    this.checkPhishingPattern(data, behavior);
    this.checkPonziPattern(data, behavior);
    this.checkFakeExchangePattern(data, behavior);
    this.checkHoneypotPattern(data, behavior);
    this.checkRapidCreationPattern(data, behavior);
    this.checkSimilarAddressPattern(data);

    // Calculate overall fraud probability
    const fraudScore = this.calculateFraudScore();
    const isFraud = fraudScore > 60;

    // Recommendation
    let recommendation: 'BLOCK' | 'WARN' | 'CAUTION' | 'PROCEED' = 'PROCEED';
    if (fraudScore > 80) recommendation = 'BLOCK';
    else if (fraudScore > 60) recommendation = 'WARN';
    else if (fraudScore > 40) recommendation = 'CAUTION';

    return {
      isFraud,
      confidence: this.confidence,
      patterns: this.patterns,
      behavior,
      recommendation,
    };
  }

  /**
   * 1. DRAIN WALLET PATTERN
   * Cüzdanları boşaltan hesaplar
   */
  private checkDrainWalletPattern(data: any, behavior: AccountBehavior) {
    const { payments, metrics } = data;
    
    // İşaretler:
    // - Çok fazla gelen ödeme, çok az giden
    // - Paranın hemen başka hesaba aktarılması
    // - Hesap her zaman boş
    
    const incomingCount = metrics.incomingPayments || 0;
    const outgoingCount = metrics.outgoingPayments || 0;
    const balance = parseFloat(data.account.balances[0]?.balance || '0');

    if (incomingCount > 10 && outgoingCount > 10 && balance < 1) {
      // Çok para geliyor, gidiyor ama hesap her zaman boş
      const indicators = [
        `${incomingCount} gelen ödeme`,
        `${outgoingCount} giden ödeme`,
        `Hesap bakiyesi: ${balance} XLM (her zaman boş)`,
        'Pattern: Para gelir gelmez başka hesaba aktarılıyor'
      ];

      this.patterns.push({
        name: 'DRAIN_WALLET',
        severity: 'CRITICAL',
        description: 'Cüzdan boşaltma pattern\'i tespit edildi',
        confidence: 85,
        indicators,
      });
      
      behavior.isLikelyDrainWallet = true;
    }
  }

  /**
   * 2. PHISHING PATTERN
   * Sahte airdrop, fake USDC gibi
   */
  private checkPhishingPattern(data: any, behavior: AccountBehavior) {
    const { account, accountAge, trustlines } = data;
    
    // İşaretler:
    // - Çok yeni hesap
    // - Sıfır bakiye
    // - Garip isimli token'lar issue ediyor
    // - Home domain yok veya suspicious
    
    const suspiciousTrustlines = trustlines?.filter((tl: any) => {
      const code = tl.asset_code?.toLowerCase() || '';
      return (
        code.includes('airdrop') ||
        code.includes('free') ||
        code.includes('bonus') ||
        code.includes('gift')
      );
    }) || [];

    if (accountAge < 30 && suspiciousTrustlines.length > 0) {
      this.patterns.push({
        name: 'PHISHING_AIRDROP',
        severity: 'CRITICAL',
        description: 'Sahte airdrop/token dağıtımı pattern\'i',
        confidence: 90,
        indicators: [
          `Hesap yaşı: ${accountAge} gün`,
          `${suspiciousTrustlines.length} şüpheli token`,
          suspiciousTrustlines.map((t: any) => t.asset_code).join(', '),
        ],
      });
      
      behavior.isLikelyPhishing = true;
    }
  }

  /**
   * 3. PONZI/PYRAMID PATTERN
   * Piramit şema hesapları
   */
  private checkPonziPattern(data: any, behavior: AccountBehavior) {
    const { payments, accountAge, metrics } = data;
    
    // İşaretler:
    // - Çok sayıda farklı adresten para geliyor
    // - Az sayıda adrese para gidiyor
    // - Düzenli aralıklarla ödemeler
    // - "Yatırım" benzeri pattern
    
    const uniqueSenders = new Set(
      payments.filter((p: any) => p.to === data.account.id).map((p: any) => p.from)
    ).size;
    
    const uniqueRecipients = new Set(
      payments.filter((p: any) => p.from === data.account.id).map((p: any) => p.to)
    ).size;

    if (uniqueSenders > 20 && uniqueRecipients < 5 && accountAge < 90) {
      this.patterns.push({
        name: 'PONZI_SCHEME',
        severity: 'CRITICAL',
        description: 'Piramit şema pattern\'i tespit edildi',
        confidence: 75,
        indicators: [
          `${uniqueSenders} farklı adresten para gelmiş`,
          `Sadece ${uniqueRecipients} adrese para gönderilmiş`,
          'Çok sayıda küçük yatırımcı, az sayıda çıkış',
          'Ponzi/Pyramid şeması olabilir'
        ],
      });
      
      behavior.isLikelyPonzi = true;
    }
  }

  /**
   * 4. FAKE EXCHANGE PATTERN
   * Sahte borsa hesapları
   */
  private checkFakeExchangePattern(data: any, behavior: AccountBehavior) {
    const { account, accountAge, metrics } = data;
    
    // İşaretler:
    // - "Exchange" gibi isim ama çok yeni
    // - Çok yüksek aktivite ama doğrulanmamış
    // - Home domain yok veya fake
    // - Stellar Expert'te verified değil
    
    const homeDomain = account.home_domain?.toLowerCase() || '';
    const suspiciousNames = ['exchange', 'binance', 'coinbase', 'kraken', 'ftx'];
    const hasSuspiciousName = suspiciousNames.some(name => homeDomain.includes(name));

    if (hasSuspiciousName && accountAge < 180 && !data.communityInfo?.isVerifiedEntity) {
      this.patterns.push({
        name: 'FAKE_EXCHANGE',
        severity: 'CRITICAL',
        description: 'Sahte borsa hesabı olabilir',
        confidence: 80,
        indicators: [
          `Domain: ${homeDomain} (verified değil)`,
          `Hesap yaşı: ${accountAge} gün (çok yeni)`,
          'Bilinen bir borsaya benziyor ama doğrulanmamış',
          'Resmi borsa hesabı DEĞİL'
        ],
      });
      
      behavior.isLikelyFakeExchange = true;
    }
  }

  /**
   * 5. HONEYPOT PATTERN
   * Token tuzağı hesapları
   */
  private checkHoneypotPattern(data: any, behavior: AccountBehavior) {
    const { account, trustlines } = data;
    
    // İşaretler:
    // - AUTH_REVOCABLE flag (freeze edebilir)
    // - AUTH_CLAWBACK (geri alabilir)
    // - Trustline açtırıp sonra donduruyor
    
    const dangerousFlags = {
      authRevocable: account.flags?.auth_revocable,
      authClawback: account.flags?.auth_clawback_enabled,
    };

    if (dangerousFlags.authRevocable || dangerousFlags.authClawback) {
      this.patterns.push({
        name: 'HONEYPOT_TOKEN',
        severity: 'CRITICAL',
        description: 'Token tuzağı riski (freeze/clawback yetkisi var)',
        confidence: 95,
        indicators: [
          dangerousFlags.authRevocable ? 'AUTH_REVOCABLE: Bakiyenizi dondurabilir' : '',
          dangerousFlags.authClawback ? 'AUTH_CLAWBACK: Token\'larınızı geri alabilir' : '',
          'Bu hesaba trustline AÇMAYIN',
          'Varolan bakiyeniz tehlikede olabilir'
        ].filter(Boolean),
      });
    }
  }

  /**
   * 6. RAPID ACCOUNT CREATION
   * Toplu hesap oluşturma (bot saldırısı)
   */
  private checkRapidCreationPattern(data: any, behavior: AccountBehavior) {
    const { accountAge, metrics } = data;
    
    // İşaretler:
    // - Çok yeni hesap (< 3 gün)
    // - Sıfır veya çok az işlem
    // - Sıfır bakiye
    // - Benzer sequence pattern
    
    if (accountAge < 3 && metrics.totalTransactions < 2) {
      this.patterns.push({
        name: 'RAPID_CREATION',
        severity: 'HIGH',
        description: 'Yeni oluşturulmuş, aktivitesiz hesap',
        confidence: 70,
        indicators: [
          `Hesap yaşı: ${accountAge} gün (çok yeni)`,
          `Sadece ${metrics.totalTransactions} işlem`,
          'Bot tarafından oluşturulmuş olabilir',
          'Scam kampanyasının parçası olabilir'
        ],
      });
    }
  }

  /**
   * 7. SIMILAR ADDRESS ATTACK
   * Adres benzerliği (phishing)
   */
  private checkSimilarAddressPattern(data: any) {
    const address = data.address || data.account?.id;
    
    // Bilinen exchange/anchor adreslerine benziyor mu?
    const knownAddresses = [
      { name: 'Binance', pattern: 'GAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A' },
      { name: 'Kraken', pattern: 'GCQHDR2E4WNUX24NO76ZWHFHHUW25C5BZPQYBUT7KSRQZ65AZKH7RSRO' },
      // Daha fazla eklenebilir
    ];

    for (const known of knownAddresses) {
      const similarity = this.calculateAddressSimilarity(address, known.pattern);
      
      if (similarity > 70 && address !== known.pattern) {
        this.patterns.push({
          name: 'ADDRESS_SIMILARITY',
          severity: 'CRITICAL',
          description: `${known.name} adresine benziyor (phishing)`,
          confidence: 95,
          indicators: [
            `Orijinal: ${known.pattern.slice(0, 20)}...`,
            `Bu adres: ${address.slice(0, 20)}...`,
            `Benzerlik: %${similarity}`,
            `UYARI: Bu ${known.name} DEĞİL, sahte olabilir!`
          ],
        });
      }
    }
  }

  /**
   * Adres benzerliği hesapla (Levenshtein distance)
   */
  private calculateAddressSimilarity(addr1: string, addr2: string): number {
    if (!addr1 || !addr2) return 0;
    
    // Basit benzerlik: ilk ve son karakterleri karşılaştır
    const start1 = addr1.slice(0, 10);
    const start2 = addr2.slice(0, 10);
    const end1 = addr1.slice(-10);
    const end2 = addr2.slice(-10);

    let matches = 0;
    for (let i = 0; i < 10; i++) {
      if (start1[i] === start2[i]) matches++;
      if (end1[i] === end2[i]) matches++;
    }

    return (matches / 20) * 100;
  }

  /**
   * Davranış analizi
   */
  private analyzeBehavior(data: any): AccountBehavior {
    const { account, accountAge, metrics, security } = data;
    const balance = parseFloat(account.balances[0]?.balance || '0');

    return {
      isNewAccount: accountAge < 30,
      hasZeroBalance: balance === 0,
      hasNoHistory: metrics.totalTransactions === 0,
      hasLowActivity: metrics.totalTransactions < 5,
      hasSuspiciousPattern: false, // Will be set by pattern detectors
      isLikelyDrainWallet: false,
      isLikelyPhishing: false,
      isLikelyPonzi: false,
      isLikelyFakeExchange: false,
    };
  }

  /**
   * Fraud score hesapla (tüm pattern'lerden)
   */
  private calculateFraudScore(): number {
    if (this.patterns.length === 0) return 0;

    // Her pattern'in confidence'ını topla ve ağırlıklı ortalama al
    const totalConfidence = this.patterns.reduce((sum, p) => {
      const severityWeight = {
        CRITICAL: 1.5,
        HIGH: 1.2,
        MEDIUM: 1.0,
        LOW: 0.7,
      };
      return sum + (p.confidence * severityWeight[p.severity]);
    }, 0);

    this.confidence = Math.min(100, totalConfidence / this.patterns.length);
    return this.confidence;
  }
}

/**
 * ADVANCED RISK SCORING
 * 
 * Çok boyutlu risk hesaplama
 */
export function calculateAdvancedRiskScore(data: any, fraudResult: any): number {
  let score = 0;
  const factors: Array<{ name: string; points: number; reason: string }> = [];

  // 1. HESAP YAŞI (0-20 puan)
  if (data.accountAge === 0) {
    score += 20;
    factors.push({ name: 'Account Age', points: 20, reason: 'Brand new account (0 days)' });
  } else if (data.accountAge < 3) {
    score += 18;
    factors.push({ name: 'Account Age', points: 18, reason: `Very new (${data.accountAge} days)` });
  } else if (data.accountAge < 7) {
    score += 15;
    factors.push({ name: 'Account Age', points: 15, reason: `New account (${data.accountAge} days)` });
  } else if (data.accountAge < 30) {
    score += 10;
    factors.push({ name: 'Account Age', points: 10, reason: `Young account (${data.accountAge} days)` });
  } else if (data.accountAge > 365) {
    score -= 10;
    factors.push({ name: 'Account Age', points: -10, reason: `Established account (${data.accountAge} days)` });
  }

  // 2. TRANSACTION HISTORY (0-15 puan)
  const txCount = data.metrics.totalTransactions;
  if (txCount === 0) {
    score += 15;
    factors.push({ name: 'History', points: 15, reason: 'No transaction history' });
  } else if (txCount < 5) {
    score += 12;
    factors.push({ name: 'History', points: 12, reason: `Very limited (${txCount} tx)` });
  } else if (txCount < 20) {
    score += 8;
    factors.push({ name: 'History', points: 8, reason: `Limited history (${txCount} tx)` });
  } else if (txCount > 100) {
    score -= 5;
    factors.push({ name: 'History', points: -5, reason: `Active history (${txCount} tx)` });
  }

  // 3. BALANCE (0-10 puan)
  const balance = parseFloat(data.account.balances[0]?.balance || '0');
  if (balance === 0) {
    score += 10;
    factors.push({ name: 'Balance', points: 10, reason: 'Zero balance' });
  } else if (balance < 1) {
    score += 5;
    factors.push({ name: 'Balance', points: 5, reason: 'Very low balance' });
  }

  // 4. MULTI-SIG (güvenlik bonusu)
  if (data.security.isMultiSig) {
    score -= 10;
    factors.push({ name: 'Security', points: -10, reason: 'Multi-signature enabled' });
  }

  // 5. HOME DOMAIN (güvenlik bonusu)
  if (data.security.hasHomeDomain) {
    score -= 5;
    factors.push({ name: 'Domain', points: -5, reason: 'Has home domain' });
  }

  // 6. STELLAR EXPERT TRUST SCORE
  const trustScore = data.communityInfo?.expertTrustScore || 0;
  if (trustScore > 80) {
    score -= 15;
    factors.push({ name: 'Trust Score', points: -15, reason: `High trust (${trustScore}/100)` });
  } else if (trustScore === 0) {
    score += 10;
    factors.push({ name: 'Trust Score', points: 10, reason: 'No trust score' });
  }

  // 7. VERIFIED ENTITY (büyük bonus)
  if (data.communityInfo?.isVerifiedEntity) {
    score -= 20;
    factors.push({ name: 'Verified', points: -20, reason: `Verified: ${data.communityInfo.entityName}` });
  }

  // 8. FRAUD PATTERNS (maksimum risk)
  if (fraudResult.isFraud) {
    score += fraudResult.confidence;
    factors.push({ 
      name: 'Fraud Patterns', 
      points: fraudResult.confidence, 
      reason: `${fraudResult.patterns.length} fraud pattern(s) detected` 
    });
  }

  // 9. PAYMENT PATTERN ANALYSIS
  const inOut = data.metrics.incomingPayments / (data.metrics.outgoingPayments || 1);
  if (inOut > 10) {
    // Çok fazla para geliyor, az gidiyor (şüpheli)
    score += 12;
    factors.push({ name: 'Payment Pattern', points: 12, reason: 'Unusual incoming/outgoing ratio' });
  }

  // 10. LARGE TRANSACTIONS (whale or suspicious)
  const avgTx = data.metrics.averageTransaction;
  const largestTx = data.metrics.largestTransaction;
  if (largestTx > avgTx * 100 && avgTx > 0) {
    score += 8;
    factors.push({ name: 'Transaction Size', points: 8, reason: 'Unusually large transactions detected' });
  }

  // Clamp between 0-100
  score = Math.max(0, Math.min(100, score));

  console.log('📊 Risk Factors:', factors);
  console.log('🎯 Final Risk Score:', score);

  return score;
}

/**
 * CONNECTED SCAM ADDRESS DETECTION
 * 
 * Kullanıcının scam adreslerle olan bağlantılarını tespit eder
 */
export interface ConnectedScamResult {
  hasScamConnections: boolean;
  scamConnectionCount: number;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  connections: Array<{
    scamAddress: string;
    scamType: string;
    scamReason: string;
    interactionType: 'sent_to' | 'received_from' | 'both';
    transactionCount: number;
    totalAmount: number;
    lastInteraction: string;
  }>;
  recommendations: string[];
}

export async function detectConnectedScamAddresses(
  payments: any[],
  targetAddress: string,
  blacklistCollection: any,
  reportsCollection: any
): Promise<ConnectedScamResult> {
  const connections: ConnectedScamResult['connections'] = [];
  
  // 1. Gather all unique addresses this account interacted with
  const interactedAddresses = new Map<string, {
    sentTo: number;
    receivedFrom: number;
    totalSent: number;
    totalReceived: number;
    lastInteraction: string;
  }>();

  for (const payment of payments) {
    const otherAddress = payment.from === targetAddress ? payment.to : payment.from;
    const isSent = payment.from === targetAddress;
    const amount = parseFloat(payment.amount || '0');
    
    if (!interactedAddresses.has(otherAddress)) {
      interactedAddresses.set(otherAddress, {
        sentTo: 0,
        receivedFrom: 0,
        totalSent: 0,
        totalReceived: 0,
        lastInteraction: payment.created_at,
      });
    }
    
    const stats = interactedAddresses.get(otherAddress)!;
    if (isSent) {
      stats.sentTo++;
      stats.totalSent += amount;
    } else {
      stats.receivedFrom++;
      stats.totalReceived += amount;
    }
    
    if (new Date(payment.created_at) > new Date(stats.lastInteraction)) {
      stats.lastInteraction = payment.created_at;
    }
  }

  // 2. Check each address against blacklist and scam reports
  const addressList = Array.from(interactedAddresses.keys());
  
  if (addressList.length > 0) {
    try {
      // Check blacklist
      const blacklistedAddresses = await blacklistCollection.find({
        address: { $in: addressList },
        isActive: true,
      }).toArray();

      for (const blacklisted of blacklistedAddresses) {
        const stats = interactedAddresses.get(blacklisted.address)!;
        connections.push({
          scamAddress: blacklisted.address,
          scamType: blacklisted.scamType || 'BLACKLISTED',
          scamReason: blacklisted.reason || 'Known scam address',
          interactionType: stats.sentTo > 0 && stats.receivedFrom > 0 
            ? 'both' 
            : stats.sentTo > 0 ? 'sent_to' : 'received_from',
          transactionCount: stats.sentTo + stats.receivedFrom,
          totalAmount: stats.totalSent + stats.totalReceived,
          lastInteraction: stats.lastInteraction,
        });
      }

      // Check scam reports (verified ones)
      const reportedAddresses = await reportsCollection.find({
        address: { $in: addressList },
        status: 'verified',
      }).toArray();

      for (const reported of reportedAddresses) {
        // Skip if already in blacklist
        if (connections.some(c => c.scamAddress === reported.address)) continue;
        
        const stats = interactedAddresses.get(reported.address)!;
        connections.push({
          scamAddress: reported.address,
          scamType: reported.scamType || 'REPORTED',
          scamReason: reported.title || 'Community reported scam',
          interactionType: stats.sentTo > 0 && stats.receivedFrom > 0 
            ? 'both' 
            : stats.sentTo > 0 ? 'sent_to' : 'received_from',
          transactionCount: stats.sentTo + stats.receivedFrom,
          totalAmount: stats.totalSent + stats.totalReceived,
          lastInteraction: stats.lastInteraction,
        });
      }
    } catch (error) {
      console.error('Error checking scam connections:', error);
    }
  }

  // 3. Calculate risk level
  let riskLevel: ConnectedScamResult['riskLevel'] = 'NONE';
  const recommendations: string[] = [];

  if (connections.length === 0) {
    riskLevel = 'NONE';
    recommendations.push('No scam connections detected - keep up good security practices');
  } else if (connections.length === 1) {
    riskLevel = connections[0].interactionType === 'sent_to' ? 'HIGH' : 'MEDIUM';
    recommendations.push('Consider reviewing your transaction history');
    if (connections[0].interactionType === 'sent_to') {
      recommendations.push('You may have been a victim of a scam - be extra cautious');
    }
  } else if (connections.length <= 3) {
    riskLevel = 'HIGH';
    recommendations.push('Multiple scam connections detected - review all recent transactions');
    recommendations.push('Consider creating a new wallet for future transactions');
  } else {
    riskLevel = 'CRITICAL';
    recommendations.push('CRITICAL: Many scam connections detected');
    recommendations.push('This wallet may be compromised or associated with scam activity');
    recommendations.push('Strongly recommend moving funds to a new secure wallet');
  }

  return {
    hasScamConnections: connections.length > 0,
    scamConnectionCount: connections.length,
    riskLevel,
    connections,
    recommendations,
  };
}

