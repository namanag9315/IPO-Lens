CREATE TABLE IF NOT EXISTS ipo_allotment_check_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipo_id TEXT NOT NULL,
    registrar TEXT NOT NULL,
    check_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies: Server-side insertion only
ALTER TABLE ipo_allotment_check_logs ENABLE ROW LEVEL SECURITY;
