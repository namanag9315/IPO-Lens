ALTER TABLE ipos
  ADD COLUMN IF NOT EXISTS allotment_date date,
  ADD COLUMN IF NOT EXISTS registrar_name text,
  ADD COLUMN IF NOT EXISTS exchange text;

CREATE TABLE IF NOT EXISTS ipo_allotment_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE SET NULL,
  registrar text,
  check_type text,
  provider text,
  status text,
  checked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY,
  email text,
  name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_pan_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nickname text NOT NULL,
  pan_last4 text NOT NULL,
  pan_hash text NOT NULL,
  pan_encrypted text NOT NULL,
  consent_version text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS user_pan_profiles_active_hash_idx
  ON user_pan_profiles(user_id, pan_hash)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS user_allotment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  pan_profile_id uuid REFERENCES user_pan_profiles(id) ON DELETE SET NULL,
  status text,
  allotted_shares numeric,
  registrar text,
  source text,
  checked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ipo_opening_alerts boolean DEFAULT true,
  ipo_closing_alerts boolean DEFAULT true,
  allotment_alerts boolean DEFAULT true,
  listing_alerts boolean DEFAULT true,
  gmp_alerts boolean DEFAULT false,
  subscription_alerts boolean DEFAULT false,
  weekly_digest boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  watchlist_only boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_idx
  ON notification_preferences(user_id);

CREATE TABLE IF NOT EXISTS notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  title text,
  message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid REFERENCES notification_events(id) ON DELETE CASCADE,
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE,
  title text,
  message text,
  event_type text,
  cta_label text,
  cta_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_dedupe_idx
  ON user_notifications(user_id, ipo_id, event_type, ((created_at AT TIME ZONE 'UTC')::date));

CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id uuid REFERENCES user_notifications(id) ON DELETE CASCADE,
  channel text,
  status text,
  provider text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS allotment_provider_status (
  provider_name text PRIMARY KEY,
  is_enabled boolean DEFAULT false,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason text,
  updated_at timestamptz DEFAULT now()
);

NOTIFY pgrst, 'reload schema';
