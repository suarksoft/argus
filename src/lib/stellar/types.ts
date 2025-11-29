// Stellar domain types
export interface StellarAccount {
  id: string;
  sequence: string;
  balances: Balance[];
  signers: Signer[];
  flags: AccountFlags;
  thresholds: Thresholds;
  data: Record<string, string>;
  home_domain?: string;
}

export interface Balance {
  balance: string;
  limit?: string;
  asset_type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  asset_code?: string;
  asset_issuer?: string;
}

export interface Signer {
  weight: number;
  key: string;
  type: string;
}

export interface AccountFlags {
  auth_required: boolean;
  auth_revocable: boolean;
  auth_immutable: boolean;
  auth_clawback_enabled: boolean;
}

export interface Thresholds {
  low_threshold: number;
  med_threshold: number;
  high_threshold: number;
}

export interface AssetInfo {
  asset_code: string;
  asset_issuer: string;
  accounts: {
    authorized: number;
    authorized_to_maintain_liabilities: number;
    unauthorized: number;
  };
  balances: {
    authorized: string;
    authorized_to_maintain_liabilities: string;
    unauthorized: string;
  };
  claimable_balances_amount: string;
  amount: string;
  num_accounts: number;
  flags: AccountFlags;
}
