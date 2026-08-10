CREATE TABLE ipos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  price_band_low int,
  price_band_high int,
  lot_size int,
  issue_size_cr float,
  category text CHECK (category IN ('mainboard', 'sme')),
  open_date date,
  close_date date,
  allotment_date date,
  listing_date date,
  registrar_name text,
  exchange text,
  status text DEFAULT 'upcoming'
    CHECK (status IN ('upcoming','open','closed','listed')),
  created_at timestamp DEFAULT now()
);

CREATE TABLE gmp_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  gmp_value int NOT NULL,
  source text,
  captured_at timestamp DEFAULT now()
);

CREATE TABLE subscription_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  qib_x float DEFAULT 0,
  nii_x float DEFAULT 0,
  retail_x float DEFAULT 0,
  total_x float DEFAULT 0,
  captured_at timestamp DEFAULT now()
);

CREATE TABLE ai_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  score int CHECK (score >= 0 AND score <= 100),
  label text CHECK (
    label IN (
      'Avoid',
      'Neutral',
      'Apply',
      'Strong Apply',
      'Weak signal',
      'Neutral signal',
      'Positive signal',
      'Strong signal',
      'High risk'
    )
  ),
  summary text,
  generated_at timestamp DEFAULT now()
);

CREATE TABLE listing_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  issue_price float,
  listing_price float,
  listing_gain_pct float,
  final_gmp_at_close int,
  recorded_at timestamp DEFAULT now()
);

CREATE TABLE ipo_company_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE UNIQUE,
  company_overview text,
  business_model text,
  sector text,
  industry text,
  headquarters text,
  website text,
  promoters text,
  pre_issue_promoter_holding_pct float,
  post_issue_promoter_holding_pct float,
  risk_factors text[] DEFAULT '{}',
  source_documents jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE ipo_financials_yearly (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  financial_year text NOT NULL,
  revenue_cr float,
  pat_cr float,
  ebitda_cr float,
  ebitda_margin_pct float,
  pat_margin_pct float,
  net_worth_cr float,
  total_borrowings_cr float,
  debt_equity float,
  eps float,
  roe_pct float,
  roce_pct float,
  created_at timestamp DEFAULT now(),
  UNIQUE (ipo_id, financial_year)
);

CREATE TABLE ipo_anchor_investors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  investor_name text NOT NULL,
  investor_category text DEFAULT 'Unknown'
    CHECK (investor_category IN (
      'Domestic Mutual Fund',
      'Foreign Portfolio Investor',
      'Insurance Company',
      'Bank',
      'AIF',
      'Pension Fund',
      'Other Institution',
      'Unknown'
    )),
  scheme_name text,
  shares_allotted bigint,
  amount_cr float,
  allocation_price float,
  percent_of_anchor_book float,
  quality_tag text,
  is_marquee boolean DEFAULT false,
  source text,
  source_url text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE ipo_anchor_summary (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE UNIQUE,
  anchor_book_size_cr float,
  number_of_anchor_investors int DEFAULT 0,
  domestic_mf_share_pct float,
  fpi_share_pct float,
  insurance_pension_share_pct float,
  top_investor_concentration_pct float,
  top_five_concentration_pct float,
  unknown_investor_count int DEFAULT 0,
  marquee_investor_count int DEFAULT 0,
  anchor_quality_score int CHECK (anchor_quality_score >= 0 AND anchor_quality_score <= 100),
  interpretation text,
  positive_signals text[] DEFAULT '{}',
  risk_signals text[] DEFAULT '{}',
  source_completeness_pct float,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE ipo_peer_comparisons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  peer_name text NOT NULL,
  revenue_cr float,
  pat_cr float,
  pe_ratio float,
  pb_ratio float,
  roe_pct float,
  roce_pct float,
  market_cap_cr float,
  notes text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE ipo_valuation_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE UNIQUE,
  pe_ratio float,
  eps float,
  roe_pct float,
  roce_pct float,
  pat_margin_pct float,
  source text,
  source_url text,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE ipo_objects_of_issue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  object_name text NOT NULL,
  amount_cr float,
  percentage float,
  category text,
  details text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  type text,
  website text,
  sebi_registration_no text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipo_lead_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  lead_manager_id uuid REFERENCES lead_managers(id) ON DELETE CASCADE,
  role text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_manager_ipo_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_manager_id uuid REFERENCES lead_managers(id) ON DELETE CASCADE,
  ipo_name text NOT NULL,
  ipo_type text,
  listing_date date,
  issue_price numeric,
  listing_price numeric,
  listing_gain_percent numeric,
  day_30_close numeric,
  day_30_return_percent numeric,
  day_90_close numeric,
  day_90_return_percent numeric,
  current_price numeric,
  current_return_percent numeric,
  total_subscription numeric,
  retail_subscription numeric,
  issue_size_cr numeric,
  exchange text,
  source text,
  source_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_manager_track_record_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_manager_id uuid REFERENCES lead_managers(id) ON DELETE CASCADE,
  period text DEFAULT '3Y',
  total_ipos_managed integer,
  positive_listing_count integer,
  positive_listing_percent numeric,
  average_listing_gain_percent numeric,
  median_listing_gain_percent numeric,
  average_30_day_return_percent numeric,
  median_30_day_return_percent numeric,
  average_90_day_return_percent numeric,
  median_90_day_return_percent numeric,
  average_subscription numeric,
  median_subscription numeric,
  severe_negative_count integer,
  liquidity_quality_score numeric,
  compliance_flag_count integer,
  final_track_record_score numeric,
  calculated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_makers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  website text,
  sebi_registration_no text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipo_market_makers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  market_maker_id uuid REFERENCES market_makers(id) ON DELETE CASCADE,
  obligation_details text,
  liquidity_support_period text,
  created_at timestamptz DEFAULT now()
);
