import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCollection } from '@/lib/server/mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for AI analysis

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ContractAnalysis {
  contractId: string;
  network: string;
  githubRepo: string;
  sourceCode: string;
  analysis: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number; // 0-100
    summary: string;
    securityIssues: SecurityIssue[];
    bestPractices: BestPractice[];
    recommendations: string[];
    gasOptimizations: string[];
    codeQuality: {
      score: number;
      notes: string[];
    };
  };
  analyzedAt: Date;
  aiModel: string;
}

interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  recommendation: string;
}

interface BestPractice {
  followed: boolean;
  practice: string;
  details: string;
}

// Fetch source code from GitHub
async function fetchGitHubSource(githubRepo: string): Promise<{ files: { name: string; content: string }[]; error?: string }> {
  try {
    // Extract owner and repo from URL
    const match = githubRepo.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return { files: [], error: 'Invalid GitHub URL format' };
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');
    
    // Try to fetch from common Soroban contract locations
    const possiblePaths = [
      'src/lib.rs',
      'contracts/src/lib.rs',
      'stellar-contract/src/lib.rs',
      'contract/src/lib.rs',
      'src/contract.rs',
    ];
    
    const files: { name: string; content: string }[] = [];
    
    for (const path of possiblePaths) {
      try {
        const response = await fetch(
          `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/${path}`,
          { headers: { 'Accept': 'text/plain' } }
        );
        
        if (response.ok) {
          const content = await response.text();
          files.push({ name: path, content });
        }
      } catch {
        // Try next path
      }
    }
    
    // Also try to fetch Cargo.toml for dependencies
    try {
      const cargoResponse = await fetch(
        `https://raw.githubusercontent.com/${owner}/${cleanRepo}/main/Cargo.toml`
      );
      if (cargoResponse.ok) {
        const content = await cargoResponse.text();
        files.push({ name: 'Cargo.toml', content });
      }
    } catch {
      // Cargo.toml not found
    }
    
    if (files.length === 0) {
      return { files: [], error: 'Could not find Soroban contract source files' };
    }
    
    return { files };
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return { files: [], error: 'Failed to fetch from GitHub' };
  }
}

// Analyze contract with OpenAI
async function analyzeWithAI(sourceFiles: { name: string; content: string }[]): Promise<ContractAnalysis['analysis']> {
  const sourceCode = sourceFiles
    .map(f => `// File: ${f.name}\n${f.content}`)
    .join('\n\n---\n\n');
  
  const systemPrompt = `You are an expert Soroban/Stellar smart contract security auditor. Analyze the provided Rust/Soroban smart contract code and provide a comprehensive security analysis.

Your analysis should cover:
1. Security vulnerabilities (reentrancy, overflow, access control, etc.)
2. Best practices adherence
3. Code quality assessment
4. Gas/resource optimization opportunities
5. Specific recommendations for improvement

Respond in JSON format with this exact structure:
{
  "overallRisk": "low" | "medium" | "high" | "critical",
  "riskScore": 0-100 (0 = safest, 100 = most risky),
  "summary": "Brief 2-3 sentence summary of the contract and its security posture",
  "securityIssues": [
    {
      "severity": "low" | "medium" | "high" | "critical",
      "title": "Issue title",
      "description": "Detailed description of the issue",
      "location": "File and approximate location (optional)",
      "recommendation": "How to fix this issue"
    }
  ],
  "bestPractices": [
    {
      "followed": true | false,
      "practice": "Name of the best practice",
      "details": "Details about adherence or violation"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "gasOptimizations": [
    "Gas optimization suggestion 1",
    "Gas optimization suggestion 2"
  ],
  "codeQuality": {
    "score": 0-100,
    "notes": ["Code quality observation 1", "Code quality observation 2"]
  }
}

Be thorough but fair. If the contract is simple and safe, say so. If there are issues, be specific about what they are and how to fix them.`;

  const userPrompt = `Please analyze this Soroban smart contract for security issues and best practices:

${sourceCode}

Provide your analysis in the specified JSON format.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    
    // Return a default analysis on error
    return {
      overallRisk: 'medium',
      riskScore: 50,
      summary: 'Unable to complete full analysis. Manual review recommended.',
      securityIssues: [{
        severity: 'medium',
        title: 'Analysis Incomplete',
        description: 'Automated analysis could not be completed. Please review manually.',
        recommendation: 'Have the contract reviewed by a security expert.',
      }],
      bestPractices: [],
      recommendations: ['Manual security audit recommended'],
      gasOptimizations: [],
      codeQuality: {
        score: 50,
        notes: ['Analysis incomplete'],
      },
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, network, githubRepo, forceRefresh } = body;

    console.log('🔍 Contract analysis request:', { contractId, network, githubRepo });

    // Validation
    if (!contractId || !githubRepo) {
      return NextResponse.json(
        { success: false, error: 'contractId and githubRepo are required' },
        { status: 400 }
      );
    }

    // Check for existing analysis (cache)
    if (!forceRefresh) {
      try {
        const analysisCollection = await getCollection('contract_analyses');
        const existing = await analysisCollection.findOne({
          contractId,
          network: network || 'testnet',
        });

        if (existing) {
          // Return cached analysis if less than 7 days old
          const ageInDays = (Date.now() - new Date(existing.analyzedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (ageInDays < 7) {
            console.log('📦 Returning cached analysis');
            return NextResponse.json({
              success: true,
              cached: true,
              analysis: existing,
            });
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not check cache:', dbError);
        // Continue without cache
      }
    }

    // Fetch source code from GitHub
    console.log('📥 Fetching source code from GitHub...');
    const { files, error: fetchError } = await fetchGitHubSource(githubRepo);
    
    if (fetchError || files.length === 0) {
      return NextResponse.json(
        { success: false, error: fetchError || 'No source files found' },
        { status: 400 }
      );
    }

    console.log(`📄 Found ${files.length} source files`);

    // Analyze with OpenAI
    console.log('🤖 Analyzing with AI...');
    const analysis = await analyzeWithAI(files);
    
    console.log('✅ Analysis complete:', {
      overallRisk: analysis.overallRisk,
      riskScore: analysis.riskScore,
      issueCount: analysis.securityIssues.length,
    });

    // Prepare full analysis document
    const fullAnalysis: ContractAnalysis = {
      contractId,
      network: network || 'testnet',
      githubRepo,
      sourceCode: files.map(f => f.content).join('\n\n'),
      analysis,
      analyzedAt: new Date(),
      aiModel: 'gpt-4o',
    };

    // Save to database
    try {
      const analysisCollection = await getCollection('contract_analyses');
      await analysisCollection.updateOne(
        { contractId, network: network || 'testnet' },
        { $set: fullAnalysis },
        { upsert: true }
      );
      console.log('💾 Analysis saved to database');
    } catch (dbError) {
      console.warn('⚠️ Could not save to database:', dbError);
      // Continue - still return analysis to user
    }

    return NextResponse.json({
      success: true,
      cached: false,
      analysis: {
        contractId: fullAnalysis.contractId,
        network: fullAnalysis.network,
        githubRepo: fullAnalysis.githubRepo,
        analysis: fullAnalysis.analysis,
        analyzedAt: fullAnalysis.analyzedAt,
        aiModel: fullAnalysis.aiModel,
      },
    });

  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');
    const network = searchParams.get('network') || 'testnet';

    if (!contractId) {
      return NextResponse.json(
        { success: false, error: 'contractId is required' },
        { status: 400 }
      );
    }

    const analysisCollection = await getCollection('contract_analyses');
    const analysis = await analysisCollection.findOne({ contractId, network });

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'No analysis found for this contract' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: {
        contractId: analysis.contractId,
        network: analysis.network,
        githubRepo: analysis.githubRepo,
        analysis: analysis.analysis,
        analyzedAt: analysis.analyzedAt,
        aiModel: analysis.aiModel,
      },
    });

  } catch (error: any) {
    console.error('❌ Get analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve analysis' },
      { status: 500 }
    );
  }
}
