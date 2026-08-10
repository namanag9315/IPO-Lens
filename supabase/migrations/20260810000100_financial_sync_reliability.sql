-- Financial ingestion reliability and provenance.
-- The statements are intentionally idempotent because some environments were
-- created from schema.sql while others have only part of the clean-engine set.

create table if not exists ipo_sources_clean (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  source_type text not null,
  base_url text,
  is_enabled boolean default true,
  priority integer default 70,
  supports_auto_fetch boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(provider, source_type)
);

create table if not exists ipo_aliases_clean (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid not null references ipos(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  provider text,
  created_by text,
  created_at timestamptz default now(),
  unique(normalized_alias, provider)
);

create index if not exists ipo_aliases_clean_ipo_idx on ipo_aliases_clean(ipo_id);

alter table if exists ipo_financials_yearly
  add column if not exists assets_cr numeric,
  add column if not exists reserves_cr numeric,
  add column if not exists total_income_cr numeric,
  add column if not exists admin_verified boolean default false,
  add column if not exists source text,
  add column if not exists source_url text,
  add column if not exists source_priority integer,
  add column if not exists confidence text,
  add column if not exists last_imported_at timestamptz;

create table if not exists ipo_financial_sync_audit (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid not null references ipos(id) on delete cascade,
  source_provider text not null,
  source_url text,
  parser text not null check (parser in ('deterministic', 'groq_evidence_fallback')),
  status text not null check (status in ('success', 'partial', 'unchanged', 'rejected')),
  identity_score integer check (identity_score between 0 and 100),
  confidence text check (confidence in ('high', 'medium', 'low')),
  rows_parsed integer not null default 0,
  rows_saved integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ipo_financial_sync_audit_ipo_created_idx
  on ipo_financial_sync_audit(ipo_id, created_at desc);

insert into ipo_sources_clean(provider, source_type, base_url, priority, supports_auto_fetch)
values
  ('IPO_GURU_API', 'ipo_list', 'https://www.ipoguru.in/api/v1/ipos', 25, true),
  ('CHITTORGARH', 'detail', 'https://www.chittorgarh.com/', 30, true),
  ('IPOPLATFORM', 'detail', 'https://www.ipoplatform.com/', 40, true),
  ('FINOLOGY_TICKER', 'detail', 'https://ticker.finology.in/ipo/', 45, true)
on conflict(provider, source_type) do update set
  base_url = excluded.base_url,
  priority = excluded.priority,
  supports_auto_fetch = excluded.supports_auto_fetch,
  updated_at = now();

alter table ipo_sources_clean enable row level security;
alter table ipo_aliases_clean enable row level security;
alter table ipo_financial_sync_audit enable row level security;

notify pgrst, 'reload schema';
