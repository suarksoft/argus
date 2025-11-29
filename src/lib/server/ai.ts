interface RiskContext {
  address: string;
  accountAge: number;
  transactionCount: number;
  balance: string;
  threats: Array<{
    name: string;
    severity: string;
    description: string;
  }>;
  riskScore: number;
  riskLevel: string;
}

export async function generateAIExplanation(context: any): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Template-based explanation (always works)
  if (!apiKey) {
    return getTemplateExplanation(context);
  }

  try {
    // OpenAI API call with comprehensive data
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert blockchain security analyst specializing in Stellar network fraud detection. 
Analyze transaction recipients for scam/fraud indicators. 
Provide clear, actionable security assessments in 2-3 sentences.
Focus on practical risk factors that users can understand.`,
          },
          {
            role: 'user',
            content: `Analyze this Stellar address for potential fraud/scam:

ACCOUNT BASICS:
- Address: ${context.address}
- Age: ${context.accountAge} days
- Balance: ${context.balance} XLM

ACTIVITY METRICS:
- Total Transactions: ${context.metrics?.totalTransactions || context.transactionCount || 0}
- Total Payments: ${context.metrics?.totalPayments || 0}
- Incoming Payments: ${context.metrics?.incomingPayments || 0}
- Outgoing Payments: ${context.metrics?.outgoingPayments || 0}
- Average Transaction: ${context.metrics?.averageTransaction?.toFixed(2) || 'N/A'} XLM
- Largest Transaction: ${context.metrics?.largestTransaction?.toFixed(2) || 'N/A'} XLM
- Last Activity: ${context.metrics?.lastActivityDate || 'Unknown'}

SECURITY:
- Multi-signature: ${context.security?.isMultiSig ? 'Yes' : 'No'}
- Signer Count: ${context.security?.signerCount || 1}
- Home Domain: ${context.security?.hasHomeDomain ? 'Yes' : 'No'}
- Active Offers: ${context.metrics?.activeOfferCount || 0}

REPUTATION (Stellar Expert):
- Trust Score: ${context.expertTrustScore || 0}/100
- Verified Entity: ${context.isVerifiedEntity ? 'Yes' : 'No'}
${context.entityName ? `- Name: ${context.entityName}` : ''}
${context.entityCategory ? `- Category: ${context.entityCategory}` : ''}

DETECTED THREATS:
${context.threats.map((t: any) => `- ${t.severity}: ${t.description}`).join('\n')}

RISK ASSESSMENT:
- Overall Risk Score: ${context.riskScore}/100
- Risk Level: ${context.riskLevel}

Provide a security assessment for someone about to send crypto to this address. 
Be specific about the risks and give practical advice.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('AI API error:', error.message);
    return getTemplateExplanation(context);
  }
}

function getTemplateExplanation(context: RiskContext): string {
  const { riskLevel, accountAge, transactionCount, threats } = context;

  if (riskLevel === 'CRITICAL') {
    return `🛑 CRITICAL RISK: This address shows multiple red flags and should be avoided. ${
      threats.length > 0 ? threats[0].description : 'Suspicious activity detected.'
    } Do NOT proceed with this transaction.`;
  }

  if (riskLevel === 'HIGH') {
    return `⚠️ HIGH RISK: This address exhibits concerning patterns. ${
      accountAge < 7 ? `Account is only ${accountAge} days old. ` : ''
    }${
      transactionCount < 5 ? 'Very limited transaction history. ' : ''
    }Proceed with extreme caution.`;
  }

  if (riskLevel === 'MEDIUM') {
    return `⚡ MODERATE RISK: This address requires caution. ${
      accountAge < 30 ? `Account is ${accountAge} days old. ` : ''
    }${
      transactionCount < 20 ? 'Limited transaction history. ' : ''
    }Consider a test transaction first.`;
  }

  if (riskLevel === 'LOW') {
    return `✓ LOW RISK: This address appears relatively safe with ${transactionCount} transactions over ${accountAge} days. Standard security practices apply.`;
  }

  return `✓ SAFE: Good security profile with ${accountAge} days of history and ${transactionCount} transactions.`;
}

export function generateRecommendations(context: RiskContext): string[] {
  const { riskLevel, accountAge, transactionCount } = context;
  const recommendations: string[] = [];

  if (riskLevel === 'CRITICAL') {
    recommendations.push('DO NOT send funds to this address');
    recommendations.push('Report this address if suspected scam');
    recommendations.push('Double-check address source');
    return recommendations;
  }

  if (riskLevel === 'HIGH') {
    recommendations.push('Verify recipient through independent channels');
    recommendations.push('Start with small test transaction');
    recommendations.push('Contact recipient to confirm address');
    return recommendations;
  }

  if (riskLevel === 'MEDIUM') {
    recommendations.push('Send test transaction first');
    recommendations.push('Verify address is correct');
    recommendations.push('Check for typos');
    return recommendations;
  }

  if (accountAge < 30) {
    recommendations.push('Relatively new account - verify identity');
  }

  if (transactionCount < 10) {
    recommendations.push('Limited history - proceed cautiously');
  }

  recommendations.push('Double-check recipient address');
  recommendations.push('Ensure correct amount');

  return recommendations;
}

