import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Database features will be disabled.');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database Types
export interface VerifiedAsset {
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

export interface BlacklistedAsset {
  id: string;
  asset_code: string;
  issuer_address: string;
  reason: string;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reported_by?: string;
  reported_at: string;
  verified_scam: boolean;
  evidence_url?: string;
  created_at: string;
}

export interface UserWatchlist {
  id: string;
  user_id: string;
  asset_code: string;
  issuer_address: string;
  notes?: string;
  added_at: string;
}

export interface AnalysisHistory {
  id: string;
  analysis_type: 'asset' | 'transaction';
  asset_code?: string;
  issuer_address?: string;
  transaction_hash?: string;
  risk_level: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  threats_count: number;
  analysis_data: any;
  analyzed_at: string;
  created_at: string;
}

export interface CommunityReport {
  id: string;
  asset_code: string;
  issuer_address: string;
  reporter_address?: string;
  report_type: 'scam' | 'suspicious' | 'legitimate';
  description: string;
  evidence_url?: string;
  status: 'pending' | 'reviewed' | 'verified' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}
