ALTER TABLE ai_analysis
  DROP CONSTRAINT IF EXISTS ai_analysis_label_check;

ALTER TABLE ai_analysis
  ADD CONSTRAINT ai_analysis_label_check CHECK (
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
  );

CREATE TABLE IF NOT EXISTS ipo_company_profiles (
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

CREATE TABLE IF NOT EXISTS ipo_financials_yearly (
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

CREATE TABLE IF NOT EXISTS ipo_anchor_investors (
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

CREATE TABLE IF NOT EXISTS ipo_anchor_summary (
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

ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS investor_category text DEFAULT 'Unknown';
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS scheme_name text;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS shares_allotted bigint;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS allocation_price float;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS percent_of_anchor_book float;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS quality_tag text;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS is_marquee boolean DEFAULT false;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS investor_type text;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS shares_allocated bigint;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS allocation_pct float;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS is_reputed boolean DEFAULT false;
ALTER TABLE ipo_anchor_investors ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ipo_anchor_investors_investor_category_check'
  ) THEN
    ALTER TABLE ipo_anchor_investors
      ADD CONSTRAINT ipo_anchor_investors_investor_category_check
      CHECK (investor_category IN (
        'Domestic Mutual Fund',
        'Foreign Portfolio Investor',
        'Insurance Company',
        'Bank',
        'AIF',
        'Pension Fund',
        'Other Institution',
        'Unknown'
      )) NOT VALID;
  END IF;
END $$;

UPDATE ipo_anchor_investors
SET
  investor_category = COALESCE(
    investor_category,
    CASE
      WHEN investor_type ILIKE '%mutual%' OR investor_type ILIKE '%fund%' THEN 'Domestic Mutual Fund'
      WHEN investor_type ILIKE '%fpi%' OR investor_type ILIKE '%foreign%' THEN 'Foreign Portfolio Investor'
      WHEN investor_type ILIKE '%insurance%' THEN 'Insurance Company'
      WHEN investor_type ILIKE '%pension%' THEN 'Pension Fund'
      WHEN investor_type ILIKE '%bank%' THEN 'Bank'
      WHEN investor_type ILIKE '%aif%' THEN 'AIF'
      WHEN investor_type IS NOT NULL THEN 'Other Institution'
      ELSE 'Unknown'
    END
  ),
  shares_allotted = COALESCE(shares_allotted, shares_allocated),
  percent_of_anchor_book = COALESCE(percent_of_anchor_book, allocation_pct),
  is_marquee = COALESCE(is_marquee, is_reputed, false),
  quality_tag = COALESCE(quality_tag, CASE WHEN is_reputed THEN 'Marquee' ELSE NULL END)
WHERE TRUE;

ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS anchor_book_size_cr float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS number_of_anchor_investors int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS domestic_mf_share_pct float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS fpi_share_pct float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS insurance_pension_share_pct float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS top_five_concentration_pct float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS unknown_investor_count int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS marquee_investor_count int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS anchor_quality_score int;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS interpretation text;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS positive_signals text[] DEFAULT '{}';
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS risk_signals text[] DEFAULT '{}';
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS source_completeness_pct float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS total_anchor_amount_cr float;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS anchor_investor_count int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS mutual_fund_count int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS fpi_count int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS insurance_count int DEFAULT 0;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS quality_score int;
ALTER TABLE ipo_anchor_summary ADD COLUMN IF NOT EXISTS summary text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ipo_anchor_summary_anchor_quality_score_check'
  ) THEN
    ALTER TABLE ipo_anchor_summary
      ADD CONSTRAINT ipo_anchor_summary_anchor_quality_score_check
      CHECK (anchor_quality_score >= 0 AND anchor_quality_score <= 100) NOT VALID;
  END IF;
END $$;

UPDATE ipo_anchor_summary
SET
  anchor_book_size_cr = COALESCE(anchor_book_size_cr, total_anchor_amount_cr),
  number_of_anchor_investors = COALESCE(number_of_anchor_investors, anchor_investor_count, 0),
  anchor_quality_score = COALESCE(anchor_quality_score, quality_score * 10),
  interpretation = COALESCE(interpretation, summary)
WHERE TRUE;

CREATE TABLE IF NOT EXISTS ipo_peer_comparisons (
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

CREATE TABLE IF NOT EXISTS ipo_objects_of_issue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  object_name text NOT NULL,
  amount_cr float,
  percentage float,
  category text,
  details text,
  created_at timestamp DEFAULT now()
);
