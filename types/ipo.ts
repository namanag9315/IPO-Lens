export type IPOCategory = "mainboard" | "sme";
export type IPOStatus = "upcoming" | "open" | "closed" | "listed";
export type AnchorInvestorCategory =
  | "Domestic Mutual Fund"
  | "Foreign Portfolio Investor"
  | "Insurance Company"
  | "Bank"
  | "AIF"
  | "Pension Fund"
  | "Other Institution"
  | "Unknown";
export type LegacyAIAnalysisLabel = "Avoid" | "Neutral" | "Apply" | "Strong Apply";
export type ResearchSignalLabel = "Weak signal" | "Neutral signal" | "Positive signal" | "Strong signal" | "High risk";
export type AIAnalysisLabel = LegacyAIAnalysisLabel | ResearchSignalLabel;

export interface SourceDocument {
  title: string;
  url: string;
  type?: string | null;
  published_at?: string | null;
}

export interface IPO {
  id: string;
  slug: string;
  name: string;
  price_band_low: number | null;
  price_band_high: number | null;
  lot_size: number | null;
  issue_size_cr: number | null;
  category: IPOCategory | null;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  status: IPOStatus;
  symbol?: string | null;
  exchange?: string | null;
  created_at: string;
  enriched_data: Record<string, unknown> | null;
  registrar_name: string | null;
  fresh_issue_amount: number | null;
  ofs_amount: number | null;
  face_value: number | null;
  issue_type: string | null;
  pre_issue_shares: number | null;
  post_issue_shares: number | null;
  canonical_ipo_id: string | null;
  is_duplicate: boolean;
  duplicate_status: string | null;
  merged_at: string | null;
  merge_notes: string | null;
  admin_verified: boolean;
}

export interface GMPHistory {
  id: string;
  ipo_id: string;
  gmp_value: number;
  source: string | null;
  captured_at: string;
}

export interface SubscriptionData {
  id: string;
  ipo_id: string;
  qib_x: number;
  nii_x: number;
  retail_x: number;
  total_x: number;
  captured_at: string;
}

export interface AIAnalysis {
  id: string;
  ipo_id: string;
  score: number | null;
  label: AIAnalysisLabel | null;
  summary: string | null;
  generated_at: string;
}

export interface ListingPerformance {
  id: string;
  ipo_id: string;
  issue_price: number | null;
  listing_price: number | null;
  listing_gain_pct: number | null;
  final_gmp_at_close: number | null;
  recorded_at: string;
}

export interface IPOListingPerformance {
  id: string;
  ipo_id: string;
  symbol: string | null;
  exchange: "NSE" | "BSE" | string | null;
  issue_price: number | null;
  listing_price: number | null;
  listing_gain_pct: number | null;
  listing_day_high: number | null;
  listing_day_low: number | null;
  listing_day_volume: number | null;
  listing_day_close: number | null;
  price_1w: number | null;
  price_1m: number | null;
  price_3m: number | null;
  current_price?: number | null;
  return_1w_pct: number | null;
  return_1m_pct: number | null;
  return_3m_pct: number | null;
  return_current_pct?: number | null;
  ipo_lens_score: number | null;
  score_validated: boolean | null;
  data_updated_at: string | null;
  created_at: string;
}

export interface IPOCompanyProfile {
  id: string;
  ipo_id: string;
  company_overview: string | null;
  business_model: string | null;
  sector: string | null;
  industry: string | null;
  headquarters: string | null;
  website: string | null;
  promoters: string | null;
  pre_issue_promoter_holding_pct: number | null;
  post_issue_promoter_holding_pct: number | null;
  risk_factors: string[] | null;
  source_documents: SourceDocument[] | null;
  updated_at: string;
}

export interface IPOFinancialYearly {
  id: string;
  ipo_id: string;
  financial_year: string;
  revenue_cr: number | null;
  pat_cr: number | null;
  ebitda_cr: number | null;
  ebitda_margin_pct: number | null;
  pat_margin_pct: number | null;
  net_worth_cr: number | null;
  total_borrowings_cr: number | null;
  debt_equity: number | null;
  eps: number | null;
  roe_pct: number | null;
  roce_pct: number | null;
  created_at: string;
}

export interface IPOAnchorInvestor {
  id: string;
  ipo_id: string;
  investor_name: string;
  investor_category: AnchorInvestorCategory | null;
  scheme_name: string | null;
  shares_allotted: number | null;
  amount_cr: number | null;
  allocation_price: number | null;
  percent_of_anchor_book: number | null;
  quality_tag: string | null;
  is_marquee: boolean | null;
  source: string | null;
  source_url: string | null;
  created_at: string;

  // Legacy columns kept optional so older local/Supabase rows continue to render.
  investor_type?: string | null;
  shares_allocated?: number | null;
  allocation_pct?: number | null;
  is_reputed?: boolean | null;
  notes?: string | null;
}

export interface IPOAnchorSummary {
  id: string;
  ipo_id: string;
  anchor_book_size_cr: number | null;
  number_of_anchor_investors: number;
  domestic_mf_share_pct: number | null;
  fpi_share_pct: number | null;
  insurance_pension_share_pct: number | null;
  top_investor_concentration_pct: number | null;
  top_five_concentration_pct: number | null;
  unknown_investor_count: number;
  marquee_investor_count: number;
  anchor_quality_score: number | null;
  interpretation: string | null;
  positive_signals: string[] | null;
  risk_signals: string[] | null;
  source_completeness_pct: number | null;
  updated_at: string;

  // Legacy columns kept optional so older local/Supabase rows continue to render.
  total_anchor_amount_cr?: number | null;
  anchor_investor_count?: number;
  mutual_fund_count?: number;
  fpi_count?: number;
  insurance_count?: number;
  quality_score?: number | null;
  summary?: string | null;
}

export interface IPOPeerComparison {
  id: string;
  ipo_id: string;
  peer_name: string;
  revenue_cr: number | null;
  pat_cr: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe_pct: number | null;
  roce_pct: number | null;
  market_cap_cr: number | null;
  notes: string | null;
  created_at: string;
}

export interface IPOObjectOfIssue {
  id: string;
  ipo_id: string;
  object_name: string;
  amount_cr: number | null;
  percentage: number | null;
  category: string | null;
  details: string | null;
  created_at: string;
}

export interface ScoreBreakdown {
  fundamentals: number;
  subscriptionDemand: number;
  valuationComfort: number;
  gmpMomentum: number;
  anchorInvestorQuality: number;
  riskAndGovernance: number;
  objectsOfIssue: number;
  penalties: number;
}

export interface AIResearchSummary {
  summary: string;
  positives: string[];
  negatives: string[];
  anchorInvestorView: string;
  valuationView: string;
  fundamentalsView: string;
  subscriptionView: string;
  gmpView: string;
  objectsOfIssueView: string;
  retailInvestorView: string;
  dataQualityNote: string;
}

export interface ComputedIPO extends IPO {
  gmp_history: GMPHistory[];
  subscription_data: SubscriptionData[];
  ai_analysis: AIAnalysis | null;
  listing_performance: ListingPerformance | null;
  post_listing_performance?: IPOListingPerformance | null;
  company_profile?: IPOCompanyProfile | null;
  financials_yearly?: IPOFinancialYearly[];
  anchor_investors?: IPOAnchorInvestor[];
  anchor_summary?: IPOAnchorSummary | null;
  peer_comparisons?: IPOPeerComparison[];
  objects_of_issue?: IPOObjectOfIssue[];
  latest_gmp: number | null;
  latest_subscription: SubscriptionData | null;
  estimated_listing_gain_pct: number | null;
}

export interface ScrapedIPOInput {
  slug: string;
  name: string;
  price_band_low?: number | null;
  price_band_high?: number | null;
  lot_size?: number | null;
  issue_size_cr?: number | null;
  category?: IPOCategory | null;
  open_date?: string | null;
  close_date?: string | null;
  listing_date?: string | null;
  status?: IPOStatus;
}

export interface ScrapedGMPInput {
  ipoSlug: string;
  gmpValue: number;
  source: string;
}

export interface ScrapedSubscriptionInput {
  ipoSlug: string;
  qib_x: number;
  nii_x: number;
  retail_x: number;
  total_x: number;
}

export type IPOInsert = Omit<IPO, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type GMPHistoryInsert = Omit<GMPHistory, "id" | "captured_at"> & {
  id?: string;
  captured_at?: string;
};

export type SubscriptionDataInsert = Omit<SubscriptionData, "id" | "captured_at"> & {
  id?: string;
  captured_at?: string;
};

export type AIAnalysisInsert = Omit<AIAnalysis, "id" | "generated_at"> & {
  id?: string;
  generated_at?: string;
};

export type ListingPerformanceInsert = Omit<ListingPerformance, "id" | "recorded_at"> & {
  id?: string;
  recorded_at?: string;
};

export type IPOListingPerformanceInsert = Omit<IPOListingPerformance, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type IPOCompanyProfileInsert = Omit<IPOCompanyProfile, "id" | "updated_at"> & {
  id?: string;
  updated_at?: string;
};

export type IPOFinancialYearlyInsert = Omit<IPOFinancialYearly, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type IPOAnchorInvestorInsert = Omit<IPOAnchorInvestor, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type IPOAnchorSummaryInsert = Omit<IPOAnchorSummary, "id" | "updated_at"> & {
  id?: string;
  updated_at?: string;
};

export type IPOPeerComparisonInsert = Omit<IPOPeerComparison, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type IPOObjectOfIssueInsert = Omit<IPOObjectOfIssue, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export interface Database {
  public: {
    Tables: {
      ipos: {
        Row: IPO;
        Insert: IPOInsert;
        Update: Partial<IPOInsert>;
        Relationships: [];
      };
      gmp_history: {
        Row: GMPHistory;
        Insert: GMPHistoryInsert;
        Update: Partial<GMPHistoryInsert>;
        Relationships: [];
      };
      subscription_data: {
        Row: SubscriptionData;
        Insert: SubscriptionDataInsert;
        Update: Partial<SubscriptionDataInsert>;
        Relationships: [];
      };
      ai_analysis: {
        Row: AIAnalysis;
        Insert: AIAnalysisInsert;
        Update: Partial<AIAnalysisInsert>;
        Relationships: [];
      };
      listing_performance: {
        Row: ListingPerformance;
        Insert: ListingPerformanceInsert;
        Update: Partial<ListingPerformanceInsert>;
        Relationships: [];
      };
      ipo_listing_performance: {
        Row: IPOListingPerformance;
        Insert: IPOListingPerformanceInsert;
        Update: Partial<IPOListingPerformanceInsert>;
        Relationships: [];
      };
      ipo_company_profiles: {
        Row: IPOCompanyProfile;
        Insert: IPOCompanyProfileInsert;
        Update: Partial<IPOCompanyProfileInsert>;
        Relationships: [];
      };
      ipo_financials_yearly: {
        Row: IPOFinancialYearly;
        Insert: IPOFinancialYearlyInsert;
        Update: Partial<IPOFinancialYearlyInsert>;
        Relationships: [];
      };
      ipo_anchor_investors: {
        Row: IPOAnchorInvestor;
        Insert: IPOAnchorInvestorInsert;
        Update: Partial<IPOAnchorInvestorInsert>;
        Relationships: [];
      };
      ipo_anchor_summary: {
        Row: IPOAnchorSummary;
        Insert: IPOAnchorSummaryInsert;
        Update: Partial<IPOAnchorSummaryInsert>;
        Relationships: [];
      };
      ipo_peer_comparisons: {
        Row: IPOPeerComparison;
        Insert: IPOPeerComparisonInsert;
        Update: Partial<IPOPeerComparisonInsert>;
        Relationships: [];
      };
      ipo_objects_of_issue: {
        Row: IPOObjectOfIssue;
        Insert: IPOObjectOfIssueInsert;
        Update: Partial<IPOObjectOfIssueInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
