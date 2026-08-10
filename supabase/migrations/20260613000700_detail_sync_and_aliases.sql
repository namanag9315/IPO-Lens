CREATE TABLE IF NOT EXISTS ipo_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  source text NOT NULL,
  confidence numeric,
  verified_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(normalized_alias, source)
);

CREATE TABLE IF NOT EXISTS ipo_unmatched_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  data_type text NOT NULL,
  source_name text NOT NULL,
  source_url text,
  raw_name text NOT NULL,
  normalized_name text NOT NULL,
  suggested_ipo_id uuid REFERENCES ipos(id) ON DELETE SET NULL,
  confidence numeric,
  payload jsonb,
  status text DEFAULT 'needs_review',
  linked_ipo_id uuid REFERENCES ipos(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipo_source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL,
  provider text,
  is_primary boolean DEFAULT false,
  confidence text,
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ipo_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_unmatched_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_source_documents ENABLE ROW LEVEL SECURITY;

-- Note: Admin APIs use service role key which bypasses RLS.
-- No public policies created to ensure internal tables remain inaccessible from the browser.

NOTIFY pgrst, 'reload schema';
