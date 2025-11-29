import { collectAllData, getStellarExpertData } from './data-collector';
import { generateAIExplanation, generateRecommendations } from './ai';
import { getCollection } from './mongodb';
import { FraudDetector, calculateAdvancedRiskScore } from './fraud-detector';

interface ComprehensiveAnalysis {
  riskScore: number;
  riskLevel: string;
  aiExplanation: string;
  recommendations: string[];
  threats: any[];
  accountInfo: any;
  activityInfo: any;
  securityInfo: any;
  communityInfo: any;
  rawData?: any;
}

export async function analyzeAddressComprehensive(
  address: string,
  context?: {
    senderAddress?: string;
    amount?: string;
    asset?: string;
  }
): Promise<ComprehensiveAnalysis> {
  console.log('Starting comprehensive analysis for:', address);

  const threats: any[] = [];
  let riskScore = 50;

  try {
    const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

    // 1. COLLECT ALL DATA (Stellar Horizon)
    console.log('🔍 Collecting comprehensive data...');
    const allData = await collectAllData(address, network);
    
    // 2. STELLAR EXPERT DATA (opsiyonel)
    console.log('⭐ Fetching Stellar Expert data...');
    const expertData = await getStellarExpertData(address);

    // Extract key metrics
    const accountAge = allData.accountAge;
    const txCount = allData.metrics.totalTransactions;
    const xlmBalance = allData.account.balances.find((b: any) => b.asset_type === 'native');
    const balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
    const isMultiSig = allData.security.isMultiSig;
    const hasHomeDomain = allData.security.hasHomeDomain;

    // 4. FRAUD DETECTION (Advanced Algorithm)
    console.log('🔍 Running fraud detection...');
    const fraudDetector = new FraudDetector();
    const fraudResult = await fraudDetector.detectFraud({
      address,
      account: allData.account,
      accountAge: allData.accountAge,
      payments: allData.payments,
      transactions: allData.transactions,
      metrics: allData.metrics,
      security: allData.security,
      trustlines: allData.trustlines,
      communityInfo: { expertData },
    });

    console.log('🚨 Fraud Detection Result:', {
      isFraud: fraudResult.isFraud,
      confidence: fraudResult.confidence,
      patterns: fraudResult.patterns.length,
      recommendation: fraudResult.recommendation,
    });

    // Add fraud patterns to threats
    fraudResult.patterns.forEach(pattern => {
      threats.push({
        name: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        impact: pattern.confidence,
        indicators: pattern.indicators,
      });
    });

    // 5. RISK FACTORS (Basic checks)

    // Account Age Check
    if (accountAge === 0) {
      threats.push({
        name: 'NEW_ACCOUNT',
        severity: 'CRITICAL',
        description: 'Hesap yeni oluşturulmuş (0 gün)',
        impact: 40,
      });
      riskScore += 40;
    } else if (accountAge < 7) {
      threats.push({
        name: 'VERY_NEW_ACCOUNT',
        severity: 'HIGH',
        description: `Hesap çok yeni (${accountAge} gün)`,
        impact: 25,
      });
      riskScore += 25;
    } else if (accountAge < 30) {
      threats.push({
        name: 'NEW_ACCOUNT',
        severity: 'MEDIUM',
        description: `Yeni hesap (${accountAge} gün) - orta risk`,
        impact: 15,
      });
      riskScore += 15;
    } else if (accountAge > 365) {
      riskScore -= 15; // Bonus for old accounts
    }

    // Transaction History Check
    if (txCount === 0) {
      threats.push({
        name: 'NO_HISTORY',
        severity: 'HIGH',
        description: 'Hiç transaction geçmişi yok',
        impact: 20,
      });
      riskScore += 20;
    } else if (txCount < 5) {
      threats.push({
        name: 'LOW_ACTIVITY',
        severity: 'MEDIUM',
        description: `Az transaction (${txCount})`,
        impact: 10,
      });
      riskScore += 10;
    } else if (txCount > 100) {
      riskScore -= 10; // Active account bonus
    }

    // Balance Check
    if (balance === 0) {
      threats.push({
        name: 'ZERO_BALANCE',
        severity: 'MEDIUM',
        description: 'Hesapta XLM yok',
        impact: 10,
      });
      riskScore += 10;
    }

    // Multi-sig is good
    if (isMultiSig) {
      riskScore -= 10;
    }

    // Home domain is good
    if (hasHomeDomain) {
      riskScore -= 5;
    }

    // 5. DATABASE CHECKS
    try {
      // Blacklist check
      const blacklistCollection = await getCollection('blacklist');
      const blacklisted = await blacklistCollection.findOne({ 
        address,
        isActive: true 
      });
      
      if (blacklisted) {
        threats.push({
          name: 'BLACKLISTED',
          severity: 'CRITICAL',
          description: `KARALİSTE: ${blacklisted.reason}`,
          impact: 100,
        });
        riskScore = 100;
      }

      // Community reports check (GERÇEK VERİ)
      const reportsCollection = await getCollection('scam_reports');
      const reports = await reportsCollection.find({ 
        address,
        status: { $in: ['verified', 'pending'] } // Verified ve pending reportları göster
      }).sort({ createdAt: -1 }).limit(10).toArray();
      
      if (reports.length > 0) {
        const verifiedCount = reports.filter(r => r.status === 'verified').length;
        const totalUpvotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);
        const severity = verifiedCount > 0 ? 'CRITICAL' : 'HIGH';
        const impact = verifiedCount > 0 ? 50 : 30;
        
        // En son report detayları
        const latestReport = reports[0];
        
        threats.push({
          name: 'COMMUNITY_REPORTS',
          severity,
          description: `${verifiedCount > 0 ? verifiedCount : reports.length} ${verifiedCount > 0 ? 'doğrulanmış' : 'bekleyen'} community report var. ${totalUpvotes > 0 ? `(${totalUpvotes} upvote)` : ''}${latestReport.title ? ` Son report: "${latestReport.title}"` : ''}`,
          impact,
          indicators: reports.map((r: any) => ({
            title: r.title,
            scamType: r.scamType,
            status: r.status,
            upvotes: r.upvotes || 0,
            reportedAt: r.createdAt,
          })),
        });
        riskScore += impact;
      }
    } catch (dbError) {
      console.log('Database checks skipped:', dbError);
    }

    // Calculate advanced risk score (with all factors)
    console.log('📊 Calculating advanced risk score...');
    riskScore = calculateAdvancedRiskScore({
      account: allData.account,
      accountAge: allData.accountAge,
      metrics: allData.metrics,
      security: allData.security,
      communityInfo: { expertData },
    }, fraudResult);

    // Risk level based on advanced score
    let riskLevel = 'SAFE';
    if (riskScore > 80) riskLevel = 'CRITICAL';
    else if (riskScore > 60) riskLevel = 'HIGH';
    else if (riskScore > 40) riskLevel = 'MEDIUM';
    else if (riskScore > 20) riskLevel = 'LOW';

    console.log('🎯 Final Risk Assessment:', {
      score: riskScore,
      level: riskLevel,
      threatCount: threats.length,
    });

    // 6. AI EXPLANATION (Tüm veriyle)
    console.log('🤖 Generating AI explanation...');
    const aiContext = {
      address,
      accountAge,
      transactionCount: txCount,
      balance: balance.toString(),
      threats,
      riskScore,
      riskLevel,
      // Ekstra context
      metrics: allData.metrics,
      security: allData.security,
      hasExpertData: !!expertData,
      expertTrustScore: expertData?.trustScore || 0,
      isVerifiedEntity: expertData?.isVerified || false,
      entityName: expertData?.name,
      recentActivity: {
        last24h: allData.transactions.filter((tx: any) => {
          const txDate = new Date(tx.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return txDate > dayAgo;
        }).length,
        last7d: allData.transactions.filter((tx: any) => {
          const txDate = new Date(tx.created_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return txDate > weekAgo;
        }).length,
      },
    };

    const aiExplanation = await generateAIExplanation(aiContext);
    const recommendations = generateRecommendations(aiContext);

    // 7. COMPILE COMPREHENSIVE RESULTS
    console.log('📦 Compiling results...');
    return {
      riskScore,
      riskLevel,
      aiExplanation,
      recommendations,
      threats,
      
      // Hesap bilgileri
      accountInfo: {
        address,
        accountAge,
        createdAt: accountAge > 0 
          ? new Date(Date.now() - accountAge * 24 * 60 * 60 * 1000).toISOString() 
          : 'Unknown',
        balance,
        hasHomeDomain,
        homeDomain: allData.account.home_domain,
        sequence: allData.account.sequence,
      },
      
      // Aktivite bilgileri
      activityInfo: {
        totalTransactions: allData.metrics.totalTransactions,
        totalPayments: allData.metrics.totalPayments,
        totalOperations: allData.metrics.totalOperations,
        incomingPayments: allData.metrics.incomingPayments,
        outgoingPayments: allData.metrics.outgoingPayments,
        largestTransaction: allData.metrics.largestTransaction,
        averageTransaction: allData.metrics.averageTransaction,
        lastActivity: allData.metrics.lastActivityDate,
        activeOffers: allData.metrics.activeOfferCount,
        recentTrades: allData.trades.length,
      },
      
      // Güvenlik bilgileri
      securityInfo: {
        isMultiSig: allData.security.isMultiSig,
        signerCount: allData.security.signerCount,
        signers: allData.account.signers,
        thresholds: allData.security.thresholds,
        flags: allData.security.flags,
        trustlineCount: allData.trustlines.length,
      },
      
      // Community & Expert bilgileri (GERÇEK VERİ)
      communityInfo: {
        isBlacklisted: threats.some(t => t.name === 'BLACKLISTED'),
        reportCount: reports.length,
        verifiedReportCount: reports.filter((r: any) => r.status === 'verified').length,
        pendingReportCount: reports.filter((r: any) => r.status === 'pending').length,
        latestReports: reports.slice(0, 3).map((r: any) => ({
          title: r.title,
          scamType: r.scamType,
          status: r.status,
          upvotes: r.upvotes || 0,
          createdAt: r.createdAt,
        })),
        expertTrustScore: expertData?.trustScore || 0,
        isVerifiedEntity: expertData?.isVerified || false,
        entityName: expertData?.name,
        entityCategory: expertData?.category,
        tags: expertData?.tags || [],
      },
      
      // Ham data (debugging için)
      rawData: process.env.NODE_ENV === 'development' ? {
        transactionCount: allData.transactions.length,
        paymentCount: allData.payments.length,
        operationCount: allData.operations.length,
        offerCount: allData.offers.length,
        tradeCount: allData.trades.length,
      } : undefined,
    };
  } catch (error: any) {
    console.error('Comprehensive analysis error:', error);
    
    // Return fallback analysis
    return {
      riskScore: 50,
      riskLevel: 'MEDIUM',
      aiExplanation: error.message === 'Account not found' 
        ? 'Hesap blockchain\'de bulunamadı. Yeni hesap veya hatalı adres olabilir.'
        : 'Analiz tamamlanamadı. Dikkatli olun.',
      recommendations: ['Adresi doğrulayın', 'Küçük miktar ile test edin'],
      threats: [{
        name: 'ANALYSIS_FAILED',
        severity: 'MEDIUM',
        description: error.message || 'Analysis could not be completed',
        impact: 0,
      }],
      accountInfo: { address },
      activityInfo: {},
      securityInfo: {},
      communityInfo: {},
    };
  }
}

