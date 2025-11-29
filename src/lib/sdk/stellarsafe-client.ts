/**
 * Argus SDK - TypeScript/JavaScript Client
 * 
 * @example
 * ```typescript
 * import { ArgusClient } from '@argus/sdk';
 * 
 * const client = new ArgusClient({
 *   apiKey: 'sk_test_xxx',
 *   baseUrl: 'https://api.argus.io'
 * });
 * 
 * const analysis = await client.analyzeAddress('GXXXXXXX...', 'public');
 * console.log(analysis.riskLevel); // "SAFE"
 * ```
 */

export interface ArgusConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AddressAnalysisRequest {
  address: string;
  network?: 'testnet' | 'public';
  homeDomain?: string;
}

export interface AddressAnalysisResponse {
  success: boolean;
  cached: boolean;
  cacheAge: number | null;
  analysis: {
    address: string;
    riskScore: number;
    riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    recommendation: string;
    warnings: string[];
    greenFlags: string[];
    verificationBadges: string[];
    expertData?: {
      trustScore: number;
      isVerifiedOrg: boolean;
      orgType?: string;
      tags: string[];
    };
    tomlVerification?: {
      verified: boolean;
      domain?: string;
      orgName?: string;
      orgEmail?: string;
    };
    accountAge: {
      days: number;
      risk: number;
    };
    transactionHistory: {
      totalTransactions: number;
      risk: number;
    };
    timestamp: string;
    processingTime?: string;
  };
}

export interface TransactionPreviewRequest {
  source: string;
  destination: string;
  asset: {
    code: string;
    issuer?: string | null;
  };
  amount: string;
  memo?: string;
  network?: 'testnet' | 'public';
}

export interface TransactionPreviewResponse {
  success: boolean;
  preview: {
    success: boolean;
    fee?: string;
    estimatedTime?: string;
    operations: Array<{
      type: string;
      details: any;
    }>;
    warnings?: string[];
    errors?: string[];
    balanceAfter?: string;
    timestamp: string;
    processingTime?: string;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    stellarExpert: string;
    tomlVerification: string;
    cache: string;
    database: string;
  };
  uptime: number;
  endpoints: {
    analyzeAddress: string;
    analyzeTransaction: string;
    health: string;
  };
}

export class ArgusError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ArgusError';
  }
}

export class ArgusClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: ArgusConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.argus.io';
    this.timeout = config.timeout || 30000; // 30 seconds default
  }

  /**
   * Analyze a Stellar address for risk factors
   * 
   * @param address - Stellar address (G...)
   * @param network - Network to use (testnet or public)
   * @param homeDomain - Optional home domain for enhanced verification
   * @returns Address analysis result
   * 
   * @example
   * ```typescript
   * const result = await client.analyzeAddress('GXXXXXXX...', 'public');
   * if (result.analysis.riskLevel === 'CRITICAL') {
   *   alert('High risk address detected!');
   * }
   * ```
   */
  async analyzeAddress(
    address: string,
    network: 'testnet' | 'public' = 'public',
    homeDomain?: string
  ): Promise<AddressAnalysisResponse> {
    return this.request<AddressAnalysisResponse>('/v1/analyze/address', {
      method: 'POST',
      body: JSON.stringify({
        address,
        network,
        homeDomain,
        apiKey: this.apiKey
      })
    });
  }

  /**
   * Preview a transaction before sending
   * 
   * @param params - Transaction parameters
   * @returns Transaction preview with fees, warnings, and errors
   * 
   * @example
   * ```typescript
   * const preview = await client.previewTransaction({
   *   source: 'GXXXXXXX...',
   *   destination: 'GYYYYYY...',
   *   asset: { code: 'XLM' },
   *   amount: '100',
   *   network: 'public'
   * });
   * 
   * if (preview.preview.warnings.length > 0) {
   *   console.warn('Transaction warnings:', preview.preview.warnings);
   * }
   * ```
   */
  async previewTransaction(
    params: TransactionPreviewRequest
  ): Promise<TransactionPreviewResponse> {
    return this.request<TransactionPreviewResponse>('/v1/analyze/transaction', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        apiKey: this.apiKey
      })
    });
  }

  /**
   * Check API health and status
   * 
   * @returns Health check response
   * 
   * @example
   * ```typescript
   * const health = await client.health();
   * console.log('API Status:', health.status);
   * console.log('Uptime:', health.uptime, 'seconds');
   * ```
   */
  async health(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/v1/health', {
      method: 'GET'
    });
  }

  /**
   * Make HTTP request to API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(options.headers || {})
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new ArgusError(
          data.error || 'Unknown error',
          data.code || 'UNKNOWN_ERROR',
          response.status,
          data.retryAfter
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ArgusError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ArgusError(
            'Request timeout',
            'TIMEOUT',
            408
          );
        }

        throw new ArgusError(
          error.message,
          'NETWORK_ERROR',
          0
        );
      }

      throw new ArgusError(
        'Unknown error occurred',
        'UNKNOWN_ERROR',
        500
      );
    }
  }
}

/**
 * React Hook for address analysis
 * 
 * @example
 * ```typescript
 * function SendModal() {
 *   const { analysis, loading, error } = useArgusAnalysis(
 *     destination,
 *     'public'
 *   );
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   
 *   return <RiskBadge level={analysis.riskLevel} />;
 * }
 * ```
 */
export function useArgusAnalysis(
  address: string,
  network: 'testnet' | 'public' = 'public',
  apiKey?: string
) {
  // This is a helper for React - actual implementation would use useState/useEffect
  // For now, this is just the type signature
  
  return {
    analysis: null as AddressAnalysisResponse['analysis'] | null,
    loading: false,
    error: null as Error | null,
    refetch: async () => {}
  };
}

// Export default client instance
export default ArgusClient;
