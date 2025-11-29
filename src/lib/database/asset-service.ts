import { executeQuery } from './postgres';

// Database types
interface VerifiedAsset {
  id: string;
  asset_code: string;
  issuer_address: string;
  home_domain?: string;
  description?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  risk_level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  verified_at?: string;
  verified_by?: string;
  toml_url?: string;
  logo_url?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

interface BlacklistedAsset {
  id: string;
  asset_code: string;
  issuer_address: string;
  reason: string;
  risk_level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  blacklisted_at: string;
  reported_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Asset Database Service
 * Handles verified and blacklisted asset operations using PostgreSQL
 */
export class AssetDatabaseService {
  /**
   * Check if an asset is verified
   */
  async isVerified(assetCode: string, issuerAddress: string): Promise<boolean> {
    try {
      const result = await executeQuery(
        'SELECT id FROM verified_assets WHERE asset_code = $1 AND issuer_address = $2 AND verification_status = $3',
        [assetCode, issuerAddress, 'verified']
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking asset verification:', error);
      return false;
    }
  }

  /**
   * Check if an asset is blacklisted
   */
  async isBlacklisted(assetCode: string, issuerAddress: string): Promise<BlacklistedAsset | null> {
    try {
      const result = await executeQuery(
        'SELECT * FROM blacklisted_assets WHERE asset_code = $1 AND issuer_address = $2',
        [assetCode, issuerAddress]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error checking asset blacklist:', error);
      return null;
    }
  }

  /**
   * Check if an asset is whitelisted
   */
  async isWhitelisted(assetCode: string, issuerAddress: string): Promise<boolean> {
    try {
      // Check if issuer is whitelisted (from smart contract or database)
      // For now, we'll check verified assets with SAFE risk level as whitelisted
      const result = await executeQuery(
        'SELECT id FROM verified_assets WHERE asset_code = $1 AND issuer_address = $2 AND verification_status = $3 AND risk_level = $4',
        [assetCode, issuerAddress, 'verified', 'SAFE']
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking asset whitelist:', error);
      return false;
    }
  }

  /**
   * Get all verified assets
   */
  async getAllVerifiedAssets(): Promise<VerifiedAsset[]> {
    try {
      const result = await executeQuery(
        'SELECT * FROM verified_assets WHERE verification_status = $1 ORDER BY verified_at DESC',
        ['verified']
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching verified assets:', error);
      return [];
    }
  }

  /**
   * Search verified assets
   */
  async searchVerifiedAssets(query: string): Promise<VerifiedAsset[]> {
    try {
      const result = await executeQuery(
        `SELECT * FROM verified_assets 
         WHERE verification_status = $1 
         AND (asset_code ILIKE $2 OR description ILIKE $2 OR home_domain ILIKE $2)
         ORDER BY verified_at DESC`,
        ['verified', `%${query}%`]
      );
      return result.rows;
    } catch (error) {
      console.error('Error searching verified assets:', error);
      return [];
    }
  }

  /**
   * Get all blacklisted assets
   */
  async getAllBlacklistedAssets(): Promise<BlacklistedAsset[]> {
    try {
      const result = await executeQuery(
        'SELECT * FROM blacklisted_assets ORDER BY blacklisted_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching blacklisted assets:', error);
      return [];
    }
  }

  /**
   * Search blacklisted assets
   */
  async searchBlacklistedAssets(query: string): Promise<BlacklistedAsset[]> {
    try {
      const result = await executeQuery(
        `SELECT * FROM blacklisted_assets 
         WHERE asset_code ILIKE $1 OR reason ILIKE $1
         ORDER BY blacklisted_at DESC`,
        [`%${query}%`]
      );
      return result.rows;
    } catch (error) {
      console.error('Error searching blacklisted assets:', error);
      return [];
    }
  }

  /**
   * Get asset verification details
   */
  async getAssetDetails(assetCode: string, issuerAddress: string): Promise<VerifiedAsset | null> {
    try {
      const result = await executeQuery(
        'SELECT * FROM verified_assets WHERE asset_code = $1 AND issuer_address = $2 AND verification_status = $3',
        [assetCode, issuerAddress, 'verified']
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching asset details:', error);
      return null;
    }
  }

  /**
   * Add asset to verification queue
   */
  async requestVerification(assetCode: string, issuerAddress: string, metadata: any): Promise<boolean> {
    try {
      await executeQuery(
        `INSERT INTO verified_assets (asset_code, issuer_address, home_domain, description, verification_status, risk_level, risk_score, toml_url, logo_url, website, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          assetCode,
          issuerAddress,
          metadata.home_domain,
          metadata.description,
          'pending',
          'MEDIUM',
          50,
          metadata.toml_url,
          metadata.logo_url,
          metadata.website
        ]
      );
      return true;
    } catch (error) {
      console.error('Error requesting asset verification:', error);
      return false;
    }
  }

  /**
   * Report asset as suspicious
   */
  async reportAsset(assetCode: string, issuerAddress: string, reason: string, reportedBy: string): Promise<boolean> {
    try {
      await executeQuery(
        `INSERT INTO blacklisted_assets (asset_code, issuer_address, reason, risk_level, risk_score, blacklisted_at, reported_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), NOW())`,
        [assetCode, issuerAddress, reason, 'HIGH', 80, reportedBy]
      );
      return true;
    } catch (error) {
      console.error('Error reporting asset:', error);
      return false;
    }
  }

  /**
   * Get asset statistics
   */
  async getAssetStats() {
    try {
      const [verifiedResult, blacklistedResult, riskDistResult] = await Promise.all([
        executeQuery('SELECT COUNT(*) as count FROM verified_assets WHERE verification_status = $1', ['verified']),
        executeQuery('SELECT COUNT(*) as count FROM blacklisted_assets'),
        executeQuery(`
          SELECT risk_level, COUNT(*) as count 
          FROM verified_assets 
          WHERE verification_status = 'verified' 
          GROUP BY risk_level
        `)
      ]);

      const riskDistribution = riskDistResult.rows.reduce((acc: any, row: any) => {
        acc[row.risk_level] = parseInt(row.count);
        return acc;
      }, { SAFE: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });

      return {
        totalVerified: parseInt(verifiedResult.rows[0].count),
        totalBlacklisted: parseInt(blacklistedResult.rows[0].count),
        recentlyVerified: 0, // Bu ayrı bir query ile hesaplanabilir
        pendingVerification: 0, // Bu da ayrı bir query ile hesaplanabilir
        riskDistribution
      };
    } catch (error) {
      console.error('Error fetching asset stats:', error);
      return {
        totalVerified: 0,
        totalBlacklisted: 0,
        recentlyVerified: 0,
        pendingVerification: 0,
        riskDistribution: { SAFE: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
      };
    }
  }
}

// Export singleton instance
export const assetDatabase = new AssetDatabaseService();