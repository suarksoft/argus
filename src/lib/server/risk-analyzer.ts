import { getStellarService } from './stellar';
import { getCollection } from './mongodb';

interface Threat {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: number;
}

export async function analyzeAddress(address: string) {
  const threats: Threat[] = [];
  let riskScore = 50; // Start at medium

  try {
    const stellarService = getStellarService('testnet');
    const accountData = await stellarService.getAccountData(address);
    const accountAge = await stellarService.getAccountAge(address);
    const txCount = await stellarService.getTransactionCount(address);

    // Check 1: Account age
    if (accountAge < 7) {
      threats.push({
        name: 'NEW_ACCOUNT',
        severity: 'MEDIUM',
        description: 'Account created less than 7 days ago',
        impact: 15,
      });
      riskScore += 15;
    } else if (accountAge > 365) {
      riskScore -= 15; // Bonus for old accounts
    }

    // Check 2: Transaction count
    if (txCount < 5) {
      threats.push({
        name: 'LOW_ACTIVITY',
        severity: 'LOW',
        description: 'Very few transactions on record',
        impact: 10,
      });
      riskScore += 10;
    } else if (txCount > 100) {
      riskScore -= 10; // Bonus for active accounts
    }

    // Check 3: Balance
    const xlmBalance = accountData.balances.find(b => b.asset_type === 'native');
    const balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
    
    if (balance === 0) {
      threats.push({
        name: 'ZERO_BALANCE',
        severity: 'LOW',
        description: 'Account has no XLM balance',
        impact: 5,
      });
      riskScore += 5;
    }

    // Check 4: Blacklist (MongoDB)
    try {
      const blacklistCollection = await getCollection('blacklist');
      const blacklisted = await blacklistCollection.findOne({ 
        address,
        isActive: true 
      });
      
      if (blacklisted) {
        threats.push({
          name: 'BLACKLISTED',
          severity: 'CRITICAL',
          description: blacklisted.reason || 'Address is on blacklist',
          impact: 100,
        });
        riskScore = 100; // Max risk
      }
    } catch (error) {
      console.log('Blacklist check skipped (DB not available)');
    }

    // Clamp risk score
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Determine risk level
    let riskLevel = 'SAFE';
    if (riskScore > 80) riskLevel = 'CRITICAL';
    else if (riskScore > 60) riskLevel = 'HIGH';
    else if (riskScore > 40) riskLevel = 'MEDIUM';
    else if (riskScore > 20) riskLevel = 'LOW';

    return {
      address,
      riskScore,
      riskLevel,
      threats,
      metadata: {
        accountAge,
        transactionCount: txCount,
        balance: balance.toString(),
      },
    };
  } catch (error) {
    console.error('Address analysis error:', error);
    throw error;
  }
}

