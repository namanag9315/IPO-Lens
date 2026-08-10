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

CREATE UNIQUE INDEX IF NOT EXISTS ipo_lead_managers_unique_idx
  ON ipo_lead_managers (ipo_id, lead_manager_id);

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

CREATE UNIQUE INDEX IF NOT EXISTS ipo_market_makers_unique_idx
  ON ipo_market_makers (ipo_id, market_maker_id);

NOTIFY pgrst, 'reload schema';
