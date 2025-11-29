import { StellarToml } from '@stellar/stellar-sdk';

/**
 * TOML Verification Service (SEP-20)
 * 
 * Stellar hesapların domain ownership doğrulaması.
 * stellar.toml dosyası kontrolü yaparak kuruluşları doğrular.
 */

export interface TomlVerification {
  verified: boolean;
  domain?: string;
  orgName?: string;
  orgEmail?: string;
  accounts?: string[];
  principals?: any[];
  currencies?: any[];
}

/**
 * TOML Verification Client
 */
export class TomlVerificationService {
  /**
   * Hesabın stellar.toml dosyasını kontrol et
   */
  async verifyAccount(address: string, homeDomain?: string): Promise<TomlVerification> {
    // Eğer home_domain verilmemişse kontrol yapamayız
    if (!homeDomain) {
      return { verified: false };
    }

    try {
      console.log(`🔍 Verifying TOML for ${homeDomain}...`);

      // stellar.toml dosyasını getir
      const toml = await StellarToml.Resolver.resolve(homeDomain);

      // Hesabın toml'da tanımlı olup olmadığını kontrol et
      const isInToml = this.checkAccountInToml(address, toml);

      if (!isInToml) {
        return { verified: false, domain: homeDomain };
      }

      // Kuruluş bilgilerini çıkar
      return {
        verified: true,
        domain: homeDomain,
        orgName: toml.DOCUMENTATION?.ORG_NAME,
        orgEmail: toml.DOCUMENTATION?.ORG_OFFICIAL_EMAIL,
        accounts: toml.ACCOUNTS || [],
        principals: toml.PRINCIPALS || [],
        currencies: toml.CURRENCIES || [],
      };
    } catch (error) {
      console.error('TOML verification error:', error);
      return { verified: false, domain: homeDomain };
    }
  }

  /**
   * Hesabın TOML dosyasında tanımlı olup olmadığını kontrol et
   */
  private checkAccountInToml(address: string, toml: any): boolean {
    // ACCOUNTS listesinde var mı?
    if (toml.ACCOUNTS && toml.ACCOUNTS.includes(address)) {
      return true;
    }

    // PRINCIPALS içinde var mı?
    if (toml.PRINCIPALS) {
      for (const principal of toml.PRINCIPALS) {
        if (principal.signing_key === address || principal.public_key === address) {
          return true;
        }
      }
    }

    // CURRENCIES içinde issuer olarak var mı?
    if (toml.CURRENCIES) {
      for (const currency of toml.CURRENCIES) {
        if (currency.issuer === address) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Domain'den kuruluş bilgilerini getir
   */
  async getOrganizationInfo(domain: string): Promise<{
    name?: string;
    email?: string;
    website?: string;
    description?: string;
  } | null> {
    try {
      const toml = await StellarToml.Resolver.resolve(domain);

      return {
        name: toml.DOCUMENTATION?.ORG_NAME,
        email: toml.DOCUMENTATION?.ORG_OFFICIAL_EMAIL,
        website: toml.DOCUMENTATION?.ORG_URL,
        description: toml.DOCUMENTATION?.ORG_DESCRIPTION,
      };
    } catch (error) {
      console.error('Organization info error:', error);
      return null;
    }
  }
}

/**
 * Helper: Get verification badge
 */
export function getVerificationBadge(verification: TomlVerification): {
  icon: string;
  text: string;
  color: string;
} | null {
  if (!verification.verified) return null;

  return {
    icon: '✅',
    text: `Doğrulanmış: ${verification.orgName || verification.domain}`,
    color: 'text-green-700',
  };
}

/**
 * Helper: Format organization display
 */
export function formatOrganization(verification: TomlVerification): string {
  if (!verification.verified) return 'Doğrulanmamış';

  const parts: string[] = [];

  if (verification.orgName) {
    parts.push(verification.orgName);
  }

  if (verification.domain) {
    parts.push(`(${verification.domain})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'Doğrulanmış Kuruluş';
}
