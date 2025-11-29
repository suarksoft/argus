import { WalletAnalysisResult } from './walletRiskAnalyzer';

/**
 * AI Risk Explainer
 * 
 * Uses OpenAI or Claude API to explain risk analysis in more detail.
 * This is an optional feature - works without API key as well.
 */

interface AIExplanation {
  summary: string;
  detailedAnalysis: string;
  recommendations: string[];
  riskMitigation: string[];
  shouldProceed: boolean;
}

/**
 * AI Explanation Service
 */
export class AIRiskExplainer {
  private apiKey?: string;
  private model: 'openai' | 'claude';

  constructor(apiKey?: string, model: 'openai' | 'claude' = 'openai') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Explain risk analysis with AI
   */
  async explainRisk(analysis: WalletAnalysisResult): Promise<AIExplanation | null> {
    // Return null if no API key
    if (!this.apiKey) {
      console.log('⚠️ AI API key not provided - skipping AI explanation');
      return null;
    }

    try {
      if (this.model === 'openai') {
        return await this.explainWithOpenAI(analysis);
      } else {
        return await this.explainWithClaude(analysis);
      }
    } catch (error) {
      console.error('AI explanation error:', error);
      return null;
    }
  }

  /**
   * Explain with OpenAI
   */
  private async explainWithOpenAI(analysis: WalletAnalysisResult): Promise<AIExplanation> {
    const prompt = this.buildPrompt(analysis);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a blockchain security expert specializing in Stellar network. 
            Analyze wallet risks and provide clear, actionable advice to users in English. 
            Be honest about risks but also highlight positive indicators.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return this.parseAIResponse(aiResponse);
  }

  /**
   * Explain with Claude
   */
  private async explainWithClaude(analysis: WalletAnalysisResult): Promise<AIExplanation> {
    const prompt = this.buildPrompt(analysis);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await response.json();
    const aiResponse = data.content[0].text;

    return this.parseAIResponse(aiResponse);
  }

  /**
   * Build prompt
   */
  private buildPrompt(analysis: WalletAnalysisResult): string {
    return `
A crypto transaction is about to be sent to a wallet address on the Stellar blockchain. 
Below are the security analysis results for this address. Please respond in English with:

1. Brief summary (2-3 sentences)
2. Detailed analysis (explain risk factors)
3. Recommendations list
4. Risk mitigation methods
5. Whether to proceed (boolean)

in JSON format.

ANALYSIS RESULTS:
- Address: ${analysis.address}
- Risk Level: ${analysis.riskLevel} (${analysis.riskScore}/100)
- Recommendation: ${analysis.recommendation}

Risk Factors:
- Account Age: ${analysis.factors.accountAge.description} (Risk: ${analysis.factors.accountAge.risk}/100)
- Transaction History: ${analysis.factors.transactionHistory.description} (Risk: ${analysis.factors.transactionHistory.risk}/100)
- Account Activity: ${analysis.factors.accountActivity.description} (Risk: ${analysis.factors.accountActivity.risk}/100)
- Known Address Status: ${analysis.factors.knownScammer.description} (Risk: ${analysis.factors.knownScammer.risk}/100)
- Multi-Signature: ${analysis.factors.multiSig.description} (Risk: ${analysis.factors.multiSig.risk}/100)

Warnings: ${analysis.warnings.join(', ') || 'None'}
Positive Indicators: ${analysis.greenFlags.join(', ') || 'None'}

JSON format:
{
  "summary": "...",
  "detailedAnalysis": "...",
  "recommendations": ["...", "..."],
  "riskMitigation": ["...", "..."],
  "shouldProceed": true/false
}
`;
  }

  /**
   * Parse AI response
   */
  private parseAIResponse(response: string): AIExplanation {
    try {
      // Extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI response parse error:', error);
    }

    // Return default value if parse fails
    return {
      summary: 'AI analysis could not be performed.',
      detailedAnalysis: response,
      recommendations: [],
      riskMitigation: [],
      shouldProceed: true,
    };
  }
}

/**
 * Helper: Mock AI explanation (for testing without API key)
 */
export function getMockAIExplanation(analysis: WalletAnalysisResult): AIExplanation {
  const explanations = {
    critical: {
      summary: 'This address appears extremely dangerous. I strongly recommend avoiding sending to it.',
      detailedAnalysis: 'According to the analysis results, this address contains multiple high-risk factors. Particularly noteworthy are the very low account age and insufficient transaction history. Such addresses are typically used in scam or phishing attacks.',
      recommendations: [
        'DO NOT SEND to this address',
        'Contact through alternative channels to verify recipient identity',
        'If you absolutely must send, use a very small test amount',
      ],
      riskMitigation: [
        'Verify the recipient address through a different communication channel',
        'Check the recipient\'s social media accounts',
        'Consider postponing this transaction',
      ],
      shouldProceed: false,
    },
    high: {
      summary: 'This address contains high risk. Be careful and test with a small amount.',
      detailedAnalysis: 'The address has some risk factors. Account age or transaction history doesn\'t provide sufficient confidence. Additional verification is recommended before sending to this address.',
      recommendations: [
        'Send a small test amount first',
        'Ask the recipient to verify the address',
        'Add descriptive information to the memo field',
      ],
      riskMitigation: [
        'Make your first send with minimum amount',
        'Send the main amount after successful test',
        'Record the transaction hash',
      ],
      shouldProceed: true,
    },
    medium: {
      summary: 'This address contains medium-level risk. Take your normal precautions.',
      detailedAnalysis: 'While the address shows some trust indicators, there are points that require caution. Transaction history and account activity appear normal, but additional verification may be beneficial.',
      recommendations: [
        'Check transaction details',
        'Send with a memo',
        'Save the transaction hash',
      ],
      riskMitigation: [
        'Double-check address accuracy before sending',
        'You may perform a small test transaction',
      ],
      shouldProceed: true,
    },
    low: {
      summary: 'This address contains low risk. Appears to be a normal user.',
      detailedAnalysis: 'The address mostly shows positive indicators. Account age and transaction history are reassuring. Appears to be a normal Stellar user.',
      recommendations: [
        'You can send normally',
        'Add memo if needed',
        'Save the transaction hash',
      ],
      riskMitigation: ['Apply standard security measures'],
      shouldProceed: true,
    },
    safe: {
      summary: 'This address appears safe. You can proceed with sending.',
      detailedAnalysis: 'The address has successfully passed all security checks. Account age, transaction history, and activity levels indicate reliability. It could be either a verified exchange address or a long-active user.',
      recommendations: [
        'You can send safely',
        'Don\'t forget to add memo when sending to exchanges',
      ],
      riskMitigation: ['Follow standard transaction procedures'],
      shouldProceed: true,
    },
  };

  return explanations[analysis.riskLevel];
}

/**
 * Example Usage:
 * 
 * // With API key
 * const explainer = new AIRiskExplainer(process.env.OPENAI_API_KEY, 'openai');
 * const aiExplanation = await explainer.explainRisk(analysis);
 * 
 * // Without API key (mock)
 * const mockExplanation = getMockAIExplanation(analysis);
 */
