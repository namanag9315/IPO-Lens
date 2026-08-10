-- 1. Create source snapshots table if it doesn't exist already
CREATE TABLE IF NOT EXISTS ipo_source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL,
  raw_text text,
  raw_html text,
  parsed_json jsonb,
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2. Create import logs table
CREATE TABLE IF NOT EXISTS ipo_detail_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  source_name text,
  source_url text,
  status text,
  fields_found text[],
  fields_imported text[],
  tables_updated text[],
  missing_after_import text[],
  fields_skipped text[],
  skip_reasons jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  triggered_by text,
  triggered_by_user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- 3. Create new tables
CREATE TABLE IF NOT EXISTS ipo_application_breakup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  category text NOT NULL,
  reserved_applications numeric,
  applied_applications numeric,
  times numeric,
  admin_verified boolean DEFAULT false,
  source text,
  source_url text,
  source_priority integer,
  confidence text,
  last_imported_at timestamptz,
  captured_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_application_breakup_unique_import
ON ipo_application_breakup (ipo_id, category, source);

CREATE TABLE IF NOT EXISTS ipo_lot_distribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  category text NOT NULL,
  lots numeric,
  quantity numeric,
  amount numeric,
  reserved numeric,
  admin_verified boolean DEFAULT false,
  source text,
  source_url text,
  source_priority integer,
  confidence text,
  last_imported_at timestamptz,
  captured_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_lot_distribution_unique_import
ON ipo_lot_distribution (ipo_id, category, source);

CREATE TABLE IF NOT EXISTS ipo_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  category text NOT NULL,
  shares_offered numeric,
  percentage numeric,
  admin_verified boolean DEFAULT false,
  source text,
  source_url text,
  source_priority integer,
  confidence text,
  last_imported_at timestamptz,
  captured_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_reservations_unique_import
ON ipo_reservations (ipo_id, category, source);

CREATE TABLE IF NOT EXISTS ipo_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  kpi_name text NOT NULL,
  period text,
  value text,
  admin_verified boolean DEFAULT false,
  source text,
  source_url text,
  source_priority integer,
  confidence text,
  last_imported_at timestamptz,
  captured_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_kpis_unique_import
ON ipo_kpis (ipo_id, kpi_name, period, source);

CREATE TABLE IF NOT EXISTS registrars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  website text,
  address text,
  admin_verified boolean DEFAULT false,
  source text,
  source_url text,
  source_priority integer,
  confidence text,
  last_imported_at timestamptz,
  created_at timestamptz DEFAULT now()
);
-- Optional unique index for registrars to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrars_name_unique ON registrars(name);

-- 4. Alter existing tables

-- ipo_peer_comparisons
ALTER TABLE IF EXISTS ipo_peer_comparisons
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS cmp numeric,
  ADD COLUMN IF NOT EXISTS face_value numeric,
  ADD COLUMN IF NOT EXISTS ronw numeric,
  ADD COLUMN IF NOT EXISTS eps_basic numeric,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS captured_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_peer_comparisons_unique_import
ON ipo_peer_comparisons (ipo_id, company_name, source);

-- ipo_financials_yearly
ALTER TABLE IF EXISTS ipo_financials_yearly
  ADD COLUMN IF NOT EXISTS assets_cr numeric,
  ADD COLUMN IF NOT EXISTS reserves_cr numeric,
  ADD COLUMN IF NOT EXISTS total_income_cr numeric,
  ADD COLUMN IF NOT EXISTS period_label text,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ipo_financials_yearly_unique_import
ON ipo_financials_yearly (ipo_id, period_label, source);

-- ipo_company_profiles
ALTER TABLE IF EXISTS ipo_company_profiles
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sector_suggestion text,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz;

-- ipo_market_makers
ALTER TABLE IF EXISTS ipo_market_makers
  ADD COLUMN IF NOT EXISTS reserved_shares numeric,
  ADD COLUMN IF NOT EXISTS reserved_amount numeric,
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz;

-- ipo_lead_managers
ALTER TABLE IF EXISTS ipo_lead_managers
  ADD COLUMN IF NOT EXISTS admin_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_priority integer,
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz;

-- ipos
ALTER TABLE IF EXISTS ipos
  ADD COLUMN IF NOT EXISTS market_maker_name text;

-- Notify postgrest
NOTIFY pgrst, 'reload schema';
