ALTER TABLE ipo_valuation_metrics
  ADD COLUMN IF NOT EXISTS peer_median_pe numeric,
  ADD COLUMN IF NOT EXISTS industry_pe numeric,
  ADD COLUMN IF NOT EXISTS sector_index_name text,
  ADD COLUMN IF NOT EXISTS market_cap_cr numeric,
  ADD COLUMN IF NOT EXISTS post_issue_shares numeric,
  ADD COLUMN IF NOT EXISTS price_to_book numeric,
  ADD COLUMN IF NOT EXISTS valuation_source text,
  ADD COLUMN IF NOT EXISTS valuation_source_url text;

NOTIFY pgrst, 'reload schema';
