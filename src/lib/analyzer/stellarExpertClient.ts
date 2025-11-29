/**
 * Stellar Expert API Client
 * 
 * Stellar Expert, Horizon API'den daha detaylı analiz ve istatistik sağlar.
 * - Account ratings (güvenilirlik puanı)
 * - Directory (doğrulanmış kuruluşlar)
 * - Asset ratings
 * - Trading volume
 */

const STELLAR_EXPERT_API = 'https://api.stellar.expert/explorer';

export interface StellarExpertAccount {
  address: string;
  created: number; // timestamp
  payments: number;
  trades: number;
  trustlines: number;
  offers: number;
  ratings?: {
    age?: number; // 0-10
    volume?: number; // 0-10
    trust?: number; // 0-10
  };
  tags?: string[]; // ['exchange', 'validator', 'issuer', 'anchor']
}

export interface StellarExpertDirectory {
  address: string;
  name: string;
  domain?: string;
  tags: string[];
  rating?: number;
  verified: boolean;
}

/**
 * Stellar Expert Client
 */
export class StellarExpertClient {
  private baseUrl: string;
  private network: 'public' | 'testnet';

  constructor(isTestnet: boolean = false) {
    this.network = isTestnet ? 'testnet' : 'public';
    this.baseUrl = `${STELLAR_EXPERT_API}/${this.network}`;
  }

  /**
   * Hesap detaylı bilgisi
   */
  async getAccountInfo(address: string): Promise<StellarExpertAccount | null> {
    try {
      const response = await fetch(`${this.baseUrl}/account/${address}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Account not found in Stellar Expert');
          return null;
        }
        throw new Error(`Stellar Expert API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        address: data.address,
        created: data.created,
        payments: data.payments || 0,
        trades: data.trades || 0,
        trustlines: data.trustlines || 0,
        offers: data.offers || 0,
        ratings: data.ratings,
        tags: data.tags || [],
      };
    } catch (error) {
      console.error('Stellar Expert getAccountInfo error:', error);
      return null;
    }
  }

  /**
   * Directory lookup (doğrulanmış kuruluşlar)
   */
  async getDirectoryInfo(address: string): Promise<StellarExpertDirectory | null> {
    try {
      const response = await fetch(`${this.baseUrl}/directory/${address}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Address not in directory');
          return null;
        }
        throw new Error(`Directory lookup error: ${response.status}`);
      }

      const data = await response.json();
      return {
        address: data.address,
        name: data.name,
        domain: data.domain,
        tags: data.tags || [],
        rating: data.rating,
        verified: true, // Directory'de olması verified demek
      };
    } catch (error) {
      console.error('Stellar Expert directory lookup error:', error);
      return null;
    }
  }

  /**
   * Trust score hesapla (0-100)
   */
  calculateTrustScore(account: StellarExpertAccount): number {
    let score = 50; // Base score

    // Ratings varsa kullan
    if (account.ratings) {
      if (account.ratings.age) {
        score += account.ratings.age * 2; // max +20
      }
      if (account.ratings.volume) {
        score += account.ratings.volume * 1.5; // max +15
      }
      if (account.ratings.trust) {
        score += account.ratings.trust * 1.5; // max +15
      }
    }

    // Tags (özel hesap türleri)
    if (account.tags && account.tags.length > 0) {
      if (account.tags.includes('exchange')) score += 10;
      if (account.tags.includes('validator')) score += 10;
      if (account.tags.includes('anchor')) score += 5;
    }

    // Activity
    if (account.payments > 100) score += 5;
    if (account.trades > 50) score += 5;

    return Math.min(100, Math.max(0, score));
  }
}

/**
 * Helper: Check if address is verified organization
 */
export function isVerifiedOrganization(
  directory: StellarExpertDirectory | null,
  account: StellarExpertAccount | null
): boolean {
  if (directory) return true;
  
  if (account?.tags) {
    return (
      account.tags.includes('exchange') ||
      account.tags.includes('validator') ||
      account.tags.includes('anchor')
    );
  }

  return false;
}

/**
 * Helper: Get organization type
 */
export function getOrganizationType(
  directory: StellarExpertDirectory | null,
  account: StellarExpertAccount | null
): string | null {
  if (directory?.tags && directory.tags.length > 0) {
    return directory.tags[0];
  }
  
  if (account?.tags && account.tags.length > 0) {
    return account.tags[0];
  }

  return null;
}
