ALTER TABLE lead_managers
  ADD COLUMN IF NOT EXISTS lead_manager_profile_url text,
  ADD COLUMN IF NOT EXISTS discovery_confidence text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS import_status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS last_imported_at timestamptz;

ALTER TABLE ipo_lead_managers
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS confidence text DEFAULT 'medium';

CREATE TABLE IF NOT EXISTS lead_manager_discovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  source text,
  source_url text,
  status text,
  lead_manager_name text,
  lead_manager_url text,
  confidence text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_manager_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_manager_id uuid REFERENCES lead_managers(id) ON DELETE CASCADE,
  ipo_id uuid REFERENCES ipos(id) ON DELETE SET NULL,
  source text,
  source_url text,
  status text DEFAULT 'queued',
  attempts integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS lead_manager_discovery_logs_ipo_created_idx
  ON lead_manager_discovery_logs (ipo_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lead_manager_import_jobs_status_created_idx
  ON lead_manager_import_jobs (status, created_at);

CREATE INDEX IF NOT EXISTS lead_managers_import_status_idx
  ON lead_managers (import_status);

NOTIFY pgrst, 'reload schema';
