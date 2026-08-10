CREATE TABLE IF NOT EXISTS ipo_gmp_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  gmp numeric,
  gmp_percent numeric,
  issue_price numeric,
  estimated_listing_price numeric,
  source text,
  source_url text,
  source_type text DEFAULT 'public_reference',
  confidence text DEFAULT 'medium',
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ipo_gmp_snapshots_ipo_captured_idx
  ON ipo_gmp_snapshots(ipo_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS ipo_subscription_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  qib_times numeric,
  nii_times numeric,
  retail_times numeric,
  employee_times numeric,
  shareholder_times numeric,
  total_times numeric,
  source text,
  source_url text,
  source_type text DEFAULT 'public_reference',
  confidence text DEFAULT 'medium',
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ipo_subscription_snapshots_ipo_captured_idx
  ON ipo_subscription_snapshots(ipo_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS ipo_data_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text,
  data_type text,
  status text,
  records_found integer,
  records_saved integer,
  error_message text,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS ipo_data_sync_logs_provider_started_idx
  ON ipo_data_sync_logs(provider, started_at DESC);

NOTIFY pgrst, 'reload schema';
