-- supabase/migrations/20260613_ipo_data_engine.sql

-- 1. IPOS Core Registry
CREATE TABLE IF NOT EXISTS ipos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE NOT NULL,
  name                text NOT NULL,
  name_normalized     text,

  -- Classification
  category            text CHECK (category IN ('mainboard','sme')),
  exchange            text,
  board               text,

  -- Issue details
  price_band_low      integer,
  price_band_high     integer,
  lot_size            integer,
  issue_size_cr       numeric(12,2),
  face_value          numeric(10,2),

  -- Dates
  open_date           date,
  close_date          date,
  allotment_date      date,
  refund_date         date,
  demat_credit_date   date,
  listing_date        date,

  -- Status
  status              text DEFAULT 'upcoming' CHECK (
    status IN ('upcoming','open','closed','allotment','listed','cancelled')
  ),

  -- Parties
  lead_manager        text,
  registrar           text,
  market_maker        text,

  -- Admin
  admin_verified      boolean DEFAULT false,
  admin_notes         text,

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- 2. IPO Facts (Unified scraping storage)
CREATE TABLE IF NOT EXISTS ipo_facts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id          uuid REFERENCES ipos(id) ON DELETE CASCADE,

  -- What this fact is
  fact_key        text NOT NULL,

  -- The values
  raw_value       text,
  parsed_value    text,
  numeric_value   numeric(18,4),

  -- Source tracking
  source_provider text NOT NULL,
  source_url      text,
  source_priority integer DEFAULT 70,

  -- Confidence
  confidence      text DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),
  is_official     boolean DEFAULT false,
  admin_verified  boolean DEFAULT false,

  -- Freshness
  captured_at     timestamptz DEFAULT now(),
  expires_at      timestamptz,

  -- Deduplication
  is_latest       boolean DEFAULT true,

  created_at      timestamptz DEFAULT now()
);

-- Only one latest fact per key per IPO
CREATE UNIQUE INDEX IF NOT EXISTS ipo_facts_latest_unique
  ON ipo_facts(ipo_id, fact_key)
  WHERE is_latest = true;

-- 3. IPO GMP History (Time series)
CREATE TABLE IF NOT EXISTS ipo_gmp_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id          uuid REFERENCES ipos(id) ON DELETE CASCADE,
  gmp_value       integer NOT NULL,
  gmp_pct         numeric(8,2),
  est_listing     integer,
  source_provider text NOT NULL,
  source_url      text,
  captured_at     timestamptz DEFAULT now()
);

-- 4. IPO Subscription History (Time series)
CREATE TABLE IF NOT EXISTS ipo_subscription_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id          uuid REFERENCES ipos(id) ON DELETE CASCADE,
  qib_x           numeric(10,2) DEFAULT 0,
  nii_x           numeric(10,2) DEFAULT 0,
  retail_x        numeric(10,2) DEFAULT 0,
  total_x         numeric(10,2) DEFAULT 0,
  source_provider text NOT NULL,
  source_url      text,
  captured_at     timestamptz DEFAULT now()
);

-- 5. IPO Source Links (Document Discovery)
CREATE TABLE IF NOT EXISTS ipo_source_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id              uuid REFERENCES ipos(id) ON DELETE CASCADE,
  source_type         text NOT NULL,
  source_provider     text NOT NULL,
  source_url          text NOT NULL,
  source_priority     integer DEFAULT 70,
  is_official         boolean DEFAULT false,
  last_checked_at     timestamptz,
  created_at          timestamptz DEFAULT now(),
  UNIQUE(ipo_id, source_type, source_provider)
);

-- 6. IPO Sync Log
CREATE TABLE IF NOT EXISTS ipo_sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type       text NOT NULL,
  provider        text,
  status          text DEFAULT 'running' CHECK (
    status IN ('running','success','partial','failed')
  ),
  found           integer DEFAULT 0,
  saved           integer DEFAULT 0,
  skipped         integer DEFAULT 0,
  failed          integer DEFAULT 0,
  errors          jsonb DEFAULT '[]'::jsonb,
  started_at      timestamptz DEFAULT now(),
  finished_at     timestamptz,
  duration_ms     integer
);

-- 7. IPO PDF Jobs (Text Extraction Tracking)
CREATE TABLE IF NOT EXISTS ipo_pdf_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id          uuid REFERENCES ipos(id) ON DELETE CASCADE,
  pdf_url         text NOT NULL,
  pdf_type        text,
  status          text DEFAULT 'pending' CHECK (
    status IN ('pending','downloading','extracting','mapping','success','failed','needs_ocr','skipped')
  ),
  attempts        integer DEFAULT 0,
  max_attempts    integer DEFAULT 3,
  text_length     integer DEFAULT 0,
  pages_extracted integer DEFAULT 0,
  facts_saved     integer DEFAULT 0,
  error_message   text,
  next_attempt_at timestamptz DEFAULT now(),
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_gmp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_pdf_jobs ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ POLICIES
CREATE POLICY "public_read_ipos" ON ipos FOR SELECT USING (true);
CREATE POLICY "public_read_facts" ON ipo_facts FOR SELECT USING (true);
CREATE POLICY "public_read_gmp" ON ipo_gmp_history FOR SELECT USING (true);
CREATE POLICY "public_read_sub" ON ipo_subscription_history FOR SELECT USING (true);

-- All writes via service role only (bypasses RLS)
