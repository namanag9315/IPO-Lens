CREATE TABLE IF NOT EXISTS ipo_valuation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id uuid REFERENCES ipos(id) ON DELETE CASCADE UNIQUE,
  pe_ratio numeric,
  eps numeric,
  roe_pct numeric,
  roce_pct numeric,
  pat_margin_pct numeric,
  source text,
  source_url text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ipo_valuation_metrics_ipo_idx
  ON ipo_valuation_metrics(ipo_id);

NOTIFY pgrst, 'reload schema';
