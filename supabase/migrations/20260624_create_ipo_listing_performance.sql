ALTER TABLE ipos ADD COLUMN IF NOT EXISTS symbol text;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS exchange text;

CREATE TABLE IF NOT EXISTS ipo_listing_performance (
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

CREATE INDEX IF NOT EXISTS ipo_listing_performance_ipo_id_idx
  ON ipo_listing_performance (ipo_id);

CREATE INDEX IF NOT EXISTS ipo_listing_performance_score_idx
  ON ipo_listing_performance (ipo_lens_score);

CREATE INDEX IF NOT EXISTS ipo_listing_performance_gain_idx
  ON ipo_listing_performance (listing_gain_pct);
