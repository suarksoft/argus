const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'API request failed',
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'API request failed',
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

export const apiClient = new ApiClient();

export interface AddressAnalysisResult {
  address: string;
  riskScore: number;
  riskLevel: string;
  threats: Array<{
    name: string;
    severity: string;
    description: string;
    impact: number;
  }>;
  metadata: {
    accountAge: number;
    transactionCount: number;
    balance: string;
  };
  recommendations: string[];
  analyzedAt: string;
}

export interface AssetAnalysisResult {
  assetCode: string;
  issuerAddress: string;
  riskScore: number;
  riskLevel: string;
  threats: Array<{
    name: string;
    severity: string;
    description: string;
    impact: number;
  }>;
  metadata: {
    homeDomain?: string;
    flags: any;
    numAccounts: number;
    amount: string;
  };
  recommendations: string[];
  analyzedAt: string;
}

