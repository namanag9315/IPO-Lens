ALTER TABLE lead_managers
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS data_confidence text DEFAULT 'medium';

ALTER TABLE lead_managers
  ALTER COLUMN type SET DEFAULT 'merchant_banker';

UPDATE lead_managers
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL AND name IS NOT NULL;

ALTER TABLE lead_manager_ipo_history
  ADD COLUMN IF NOT EXISTS ipo_slug text,
  ADD COLUMN IF NOT EXISTS price_band text,
  ADD COLUMN IF NOT EXISTS lot_size numeric,
  ADD COLUMN IF NOT EXISTS issue_date date,
  ADD COLUMN IF NOT EXISTS listing_gain_amount numeric,
  ADD COLUMN IF NOT EXISTS market_maker text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS data_confidence text DEFAULT 'medium';

ALTER TABLE lead_manager_track_record_scores
  ADD COLUMN IF NOT EXISTS flat_listing_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS negative_listing_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_negative_listing_percent numeric,
  ADD COLUMN IF NOT EXISTS consistency_score numeric;

ALTER TABLE lead_manager_track_record_scores
  ALTER COLUMN total_ipos_managed SET DEFAULT 0,
  ALTER COLUMN positive_listing_count SET DEFAULT 0,
  ALTER COLUMN severe_negative_count SET DEFAULT 0,
  ALTER COLUMN compliance_flag_count SET DEFAULT 0;

ALTER TABLE market_makers
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE ipo_market_makers
  ADD COLUMN IF NOT EXISTS inventory_details text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE ipo_objects_of_issue
  ADD COLUMN IF NOT EXISTS score_impact text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text;

CREATE INDEX IF NOT EXISTS lead_managers_slug_idx
  ON lead_managers (slug);

CREATE INDEX IF NOT EXISTS lead_manager_ipo_history_manager_listing_idx
  ON lead_manager_ipo_history (lead_manager_id, listing_date DESC);

CREATE INDEX IF NOT EXISTS lead_manager_track_scores_manager_calculated_idx
  ON lead_manager_track_record_scores (lead_manager_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS ipo_lead_managers_ipo_idx
  ON ipo_lead_managers (ipo_id);

CREATE INDEX IF NOT EXISTS ipo_market_makers_ipo_idx
  ON ipo_market_makers (ipo_id);

NOTIFY pgrst, 'reload schema';
