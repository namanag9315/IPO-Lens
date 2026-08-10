-- supabase/migrations/20260613001100_ipo_data_engine_lite.sql

-- Part 1: Add Duplicate Tracking to Core IPOs
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS canonical_ipo_id uuid REFERENCES ipos(id) ON DELETE SET NULL;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS is_duplicate boolean DEFAULT false;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS duplicate_status text DEFAULT 'active';
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS merged_at timestamptz;
ALTER TABLE ipos ADD COLUMN IF NOT EXISTS merge_notes text;

-- Part 2: Create Lite Schema Tables

CREATE TABLE IF NOT EXISTS ipo_import_runs_lite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source_url text,
  input_mode text NOT NULL CHECK (input_mode IN ('url', 'html', 'text', 'admin_manual')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'preview_ready', 'approved', 'imported', 'failed', 'rejected')),
  fetch_status text DEFAULT 'not_attempted' CHECK (fetch_status IN ('not_attempted', 'success', 'blocked', 'failed')),
  html_length integer DEFAULT 0,
  text_length integer DEFAULT 0,
  tables_found integer DEFAULT 0,
  facts_detected integer DEFAULT 0,
  facts_validated integer DEFAULT 0,
  facts_imported integer DEFAULT 0,
  warnings jsonb DEFAULT '[]'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  debug_json jsonb DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  imported_at timestamptz
);

CREATE TABLE IF NOT EXISTS ipo_import_staging_lite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid REFERENCES ipo_import_runs_lite(id) ON DELETE CASCADE,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  fact_key text NOT NULL,
  fact_value jsonb NOT NULL,
  display_value text,
  source_provider text,
  source_url text,
  confidence text DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'warning', 'rejected')),
  validation_errors jsonb DEFAULT '[]'::jsonb,
  source_evidence text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(import_run_id, fact_key)
);

CREATE TABLE IF NOT EXISTS ipo_facts_lite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  fact_key text NOT NULL,
  fact_value jsonb NOT NULL,
  display_value text,
  source_provider text,
  source_url text,
  confidence text DEFAULT 'medium',
  source_priority integer DEFAULT 70,
  admin_verified boolean DEFAULT false,
  is_latest boolean DEFAULT true,
  imported_from_run_id uuid REFERENCES ipo_import_runs_lite(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ipo_id, fact_key)
);

CREATE TABLE IF NOT EXISTS ipo_source_records_lite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('ipo_list', 'gmp', 'subscription', 'detail')),
  raw_name text NOT NULL,
  normalized_name text,
  source_url text,
  payload jsonb DEFAULT '{}'::jsonb,
  matched_ipo_id uuid REFERENCES ipos(id) ON DELETE SET NULL,
  match_confidence integer DEFAULT 0,
  status text DEFAULT 'staged' CHECK (status IN ('staged', 'matched', 'needs_review', 'ignored', 'rejected')),
  reason text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE IF NOT EXISTS ipo_aliases_lite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  provider text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(normalized_alias, provider)
);

-- Part 3: RLS Policies

ALTER TABLE ipo_import_runs_lite ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_import_staging_lite ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_facts_lite ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_source_records_lite ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_aliases_lite ENABLE ROW LEVEL SECURITY;

-- Public can read ipo_facts_lite
CREATE POLICY "public_read_facts_lite" ON ipo_facts_lite FOR SELECT USING (true);

-- Admins via service role will bypass RLS. No other public policies needed.
