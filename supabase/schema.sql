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
  listing_date date,
  status text DEFAULT 'upcoming' 
    CHECK (status IN ('upcoming','open','closed','listed')),
  symbol text,
  exchange text,
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

CREATE TABLE ipo_listing_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  symbol text,
  exchange text CHECK (exchange IN ('NSE', 'BSE')),
  issue_price numeric,
  listing_price numeric,
  listing_gain_pct numeric,
  listing_day_high numeric,
  listing_day_low numeric,
  listing_day_volume bigint,
  listing_day_close numeric,
  price_1w numeric,
  price_1m numeric,
  price_3m numeric,
  current_price numeric,
  return_1w_pct numeric,
  return_1m_pct numeric,
  return_3m_pct numeric,
  return_current_pct numeric,
  ipo_lens_score integer CHECK (ipo_lens_score >= 0 AND ipo_lens_score <= 100),
  score_validated boolean,
  data_updated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (ipo_id, exchange)
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
