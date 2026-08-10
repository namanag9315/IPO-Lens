CREATE TABLE IF NOT EXISTS ipo_data_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text,
  data_type text,
  status text,
  records_found integer DEFAULT 0,
  records_saved integer DEFAULT 0,
  unmatched_records integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  triggered_by text,
  triggered_by_user_id uuid
);

ALTER TABLE ipo_data_sync_logs
  ADD COLUMN IF NOT EXISTS unmatched_records integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS triggered_by text,
  ADD COLUMN IF NOT EXISTS triggered_by_user_id uuid;

ALTER TABLE ipo_data_sync_logs
  ALTER COLUMN records_found SET DEFAULT 0,
  ALTER COLUMN records_saved SET DEFAULT 0,
  ALTER COLUMN unmatched_records SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS ipo_data_sync_logs_started_idx
  ON ipo_data_sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS ipo_data_sync_logs_type_started_idx
  ON ipo_data_sync_logs(data_type, started_at DESC);

CREATE INDEX IF NOT EXISTS ipo_gmp_snapshots_ipo_captured_idx
  ON ipo_gmp_snapshots(ipo_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS ipo_subscription_snapshots_ipo_captured_idx
  ON ipo_subscription_snapshots(ipo_id, captured_at DESC);

NOTIFY pgrst, 'reload schema';
