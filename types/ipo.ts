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
  enriched_data?: Record<string, unknown> | null;
  face_value?: number | null;
  fresh_issue_amount?: number | null;
  issue_type?: string | null;
  ofs_amount?: number | null;
  post_issue_shares?: number | null;
  pre_issue_shares?: number | null;
  category: IPOCategory | null;
  open_date: string | null;
  close_date: string | null;
  allotment_date: string | null;
  listing_date: string | null;
  registrar_name: string | null;
  exchange: string | null;
  status: IPOStatus;
  created_at: string;
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

export interface IPOGMPSnapshot {
  id: string;
  ipo_id: string;
  gmp: number | null;
  gmp_percent: number | null;
  issue_price: number | null;
  estimated_listing_price: number | null;
  source: string | null;
  source_url: string | null;
  source_type: string | null;
  confidence: string | null;
  captured_at: string;
  created_at: string;
}

export interface IPOSubscriptionSnapshot {
  id: string;
  ipo_id: string;
  qib_times: number | null;
  nii_times: number | null;
  retail_times: number | null;
  employee_times: number | null;
  shareholder_times: number | null;
  total_times: number | null;
  source: string | null;
  source_url: string | null;
  source_type: string | null;
  confidence: string | null;
  captured_at: string;
  created_at: string;
}

export interface IPOCompanyProfile {
  id: string;
  ipo_id: string;
  company_overview: string | null;
  business_model: string | null;
  customers?: string | null;
  sector: string | null;
  industry: string | null;
  headquarters: string | null;
  manufacturing_facilities?: string | null;
  products_services?: string | null;
  promoter_summary?: string | null;
  website: string | null;
  promoters: string | null;
  pre_issue_promoter_holding_pct: number | null;
  post_issue_promoter_holding_pct: number | null;
  registrar_address?: string | null;
  registrar_email?: string | null;
  registrar_phone?: string | null;
  registrar_website?: string | null;
  revenue_model?: string | null;
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
  assets_cr?: number | null;
  reserves_cr?: number | null;
  total_income_cr?: number | null;
  total_borrowings_cr: number | null;
  debt_equity: number | null;
  eps: number | null;
  roe_pct: number | null;
  roce_pct: number | null;
  source?: string | null;
  source_url?: string | null;
  source_priority?: number | null;
  confidence?: string | null;
  last_imported_at?: string | null;
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

export interface IPOValuationMetrics {
  id: string;
  ipo_id: string;
  pe_ratio: number | null;
  eps: number | null;
  industry_pe?: number | null;
  market_cap_cr?: number | null;
  peer_median_pe?: number | null;
  post_issue_shares?: number | null;
  price_to_book?: number | null;
  roe_pct: number | null;
  roce_pct: number | null;
  pat_margin_pct: number | null;
  sector_index_name?: string | null;
  source: string | null;
  source_url: string | null;
  updated_at: string;
  valuation_source?: string | null;
  valuation_source_url?: string | null;
}

export interface IPOObjectOfIssue {
  id: string;
  ipo_id: string;
  object_name: string;
  amount_cr: number | null;
  percentage: number | null;
  category: string | null;
  details: string | null;
  score_impact: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

export interface LeadManager {
  address: string | null;
  created_at: string;
  data_confidence: string | null;
  description: string | null;
  discovery_confidence?: string | null;
  email: string | null;
  id: string;
  import_status?: string | null;
  last_imported_at?: string | null;
  lead_manager_profile_url?: string | null;
  name: string;
  phone: string | null;
  sebi_registration_no: string | null;
  slug: string | null;
  source: string | null;
  source_url: string | null;
  type: string | null;
  updated_at: string;
  website: string | null;
}

export interface IPOLeadManager {
  confidence?: string | null;
  created_at: string;
  id: string;
  ipo_id: string;
  is_primary: boolean | null;
  lead_manager_id: string;
  role: string | null;
  source?: string | null;
  source_url?: string | null;
}

export interface IPOLeadManagerWithManager extends IPOLeadManager {
  lead_manager?: LeadManager | null;
}

export interface LeadManagerIPOHistory {
  average_subscription?: number | null;
  created_at: string;
  current_price: number | null;
  current_return_percent: number | null;
  data_confidence: string | null;
  day_30_close: number | null;
  day_30_return_percent: number | null;
  day_90_close: number | null;
  day_90_return_percent: number | null;
  exchange: string | null;
  id: string;
  ipo_name: string;
  ipo_slug: string | null;
  ipo_type: string | null;
  issue_date: string | null;
  issue_price: number | null;
  issue_size_cr: number | null;
  lead_manager_id: string;
  listing_date: string | null;
  listing_gain_amount: number | null;
  listing_gain_percent: number | null;
  listing_price: number | null;
  lot_size: number | null;
  market_maker: string | null;
  price_band: string | null;
  retail_subscription: number | null;
  source: string | null;
  source_url: string | null;
  status: string | null;
  total_subscription: number | null;
  updated_at: string;
}

export interface LeadManagerTrackRecordScore {
  average_30_day_return_percent: number | null;
  average_90_day_return_percent: number | null;
  average_listing_gain_percent: number | null;
  average_subscription: number | null;
  calculated_at: string;
  compliance_flag_count: number | null;
  consistency_score: number | null;
  final_track_record_score: number | null;
  flat_listing_count: number | null;
  id: string;
  lead_manager_id: string;
  liquidity_quality_score: number | null;
  median_30_day_return_percent: number | null;
  median_90_day_return_percent: number | null;
  median_listing_gain_percent: number | null;
  median_subscription: number | null;
  negative_listing_count: number | null;
  non_negative_listing_percent: number | null;
  period: string | null;
  positive_listing_count: number | null;
  positive_listing_percent: number | null;
  severe_negative_count: number | null;
  total_ipos_managed: number | null;
}

export interface IPOEnrichedField {
  id: string;
  ipo_id: string;
  job_id: string | null;
  field_name: string;
  field_value: unknown;
  display_value: string | null;
  source_name: string | null;
  source_url: string | null;
  source_snapshot_id: string | null;
  evidence_text: string | null;
  confidence: string | null;
  status: string | null;
  applied_to_table: string | null;
  applied_to_column: string | null;
  applied_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface IPOFieldQuality {
  id: string;
  ipo_id: string;
  field_name: string;
  status: string;
  source_name: string | null;
  source_url: string | null;
  confidence: string | null;
  last_checked_at: string;
  notes: string | null;
}

export interface MarketMaker {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  sebi_registration_no: string | null;
  slug: string | null;
  source: string | null;
  source_url: string | null;
  updated_at: string;
  website: string | null;
}

export interface IPOMarketMaker {
  created_at: string;
  id: string;
  inventory_details: string | null;
  ipo_id: string;
  liquidity_support_period: string | null;
  market_maker_id: string;
  obligation_details: string | null;
  source: string | null;
  source_url: string | null;
}

export interface IPOMarketMakerWithMaker extends IPOMarketMaker {
  market_maker?: MarketMaker | null;
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
  allotmentView?: string;
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
  public_gmp_snapshots?: IPOGMPSnapshot[];
  public_subscription_snapshots?: IPOSubscriptionSnapshot[];
  latest_public_gmp_snapshot?: IPOGMPSnapshot | null;
  latest_public_subscription_snapshot?: IPOSubscriptionSnapshot | null;
  gmp_source_variance?: boolean;
  subscription_source_variance?: boolean;
  company_profile?: IPOCompanyProfile | null;
  financials_yearly?: IPOFinancialYearly[];
  anchor_investors?: IPOAnchorInvestor[];
  anchor_summary?: IPOAnchorSummary | null;
  peer_comparisons?: IPOPeerComparison[];
  valuation_metrics?: IPOValuationMetrics | null;
  objects_of_issue?: IPOObjectOfIssue[];
  lead_managers?: IPOLeadManagerWithManager[];
  lead_manager_history?: LeadManagerIPOHistory[];
  lead_manager_scores?: LeadManagerTrackRecordScore[];
  market_makers?: IPOMarketMakerWithMaker[];
  enriched_fields?: IPOEnrichedField[];
  field_quality?: IPOFieldQuality[];
  latest_gmp: number | null;
  latest_subscription: SubscriptionData | null;
  latest_gmp_percent: number | null;
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

export type IPOGMPSnapshotInsert = Omit<IPOGMPSnapshot, "id" | "created_at" | "captured_at"> & {
  id?: string;
  created_at?: string;
  captured_at?: string;
};

export type IPOSubscriptionSnapshotInsert = Omit<IPOSubscriptionSnapshot, "id" | "created_at" | "captured_at"> & {
  id?: string;
  created_at?: string;
  captured_at?: string;
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

export type IPOValuationMetricsInsert = Omit<IPOValuationMetrics, "id" | "updated_at"> & {
  id?: string;
  updated_at?: string;
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
      ipo_valuation_metrics: {
        Row: IPOValuationMetrics;
        Insert: IPOValuationMetricsInsert;
        Update: Partial<IPOValuationMetricsInsert>;
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
