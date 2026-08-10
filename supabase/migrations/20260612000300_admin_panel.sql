CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_user_id_idx
  ON admin_users(user_id);

CREATE INDEX IF NOT EXISTS admin_users_email_idx
  ON admin_users(lower(email));

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
  ON admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx
  ON admin_audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS ipo_data_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  provider_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  priority integer DEFAULT 100,
  base_url text,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO ipo_data_providers (provider_key, provider_name, provider_type, priority, base_url)
VALUES
  ('ipo_guru_gmp', 'IPO Guru GMP', 'gmp', 10, 'https://www.ipoguru.in/live-ipo-gmp'),
  ('investor_gain_gmp', 'InvestorGain GMP', 'gmp', 20, 'https://www.investorgain.com/report/live-ipo-gmp/331/'),
  ('ipo_watch_gmp', 'IPOWatch GMP', 'gmp', 30, 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/'),
  ('investor_gain_subscription', 'InvestorGain Subscription', 'subscription', 10, 'https://www.investorgain.com/report/live-ipo-subscription/333/'),
  ('ipo_watch_subscription', 'IPOWatch Subscription', 'subscription', 20, 'https://ipowatch.in/ipo-subscription-status-live/'),
  ('manual_override', 'Manual Override', 'manual', 90, null),
  ('future_bse', 'Future BSE Provider', 'future_exchange', 110, 'https://www.bseindia.com/'),
  ('future_nse', 'Future NSE Provider', 'future_exchange', 120, 'https://www.nseindia.com/')
ON CONFLICT (provider_key) DO NOTHING;

ALTER TABLE ipo_data_sync_logs
  ADD COLUMN IF NOT EXISTS unmatched_records integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS triggered_by text,
  ADD COLUMN IF NOT EXISTS triggered_by_user_id uuid;

CREATE INDEX IF NOT EXISTS ipo_data_sync_logs_started_idx
  ON ipo_data_sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS ipo_gmp_snapshots_ipo_captured_idx
  ON ipo_gmp_snapshots(ipo_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS ipo_subscription_snapshots_ipo_captured_idx
  ON ipo_subscription_snapshots(ipo_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS user_notifications_user_read_created_idx
  ON user_notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS ipo_allotment_check_logs_ipo_checked_idx
  ON ipo_allotment_check_logs(ipo_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ipo_guide_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  explanation text,
  example text,
  key_takeaway text,
  quiz_question text,
  quiz_options jsonb DEFAULT '[]'::jsonb,
  correct_answer text,
  quiz_explanation text,
  badge_unlocked text,
  estimated_minutes integer DEFAULT 5,
  xp_points integer DEFAULT 50,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
