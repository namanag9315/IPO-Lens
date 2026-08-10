alter table if exists ipos add column if not exists canonical_ipo_id uuid references ipos(id) on delete set null;
alter table if exists ipos add column if not exists is_duplicate boolean default false;
alter table if exists ipos add column if not exists duplicate_status text default 'active';
alter table if exists ipos add column if not exists merged_at timestamptz;
alter table if exists ipos add column if not exists merge_notes text;
alter table if exists ipos add column if not exists admin_verified boolean default false;

create index if not exists ipos_duplicate_status_idx on ipos(is_duplicate, duplicate_status);
create index if not exists ipos_canonical_ipo_id_idx on ipos(canonical_ipo_id);

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

create table if not exists ipo_sync_runs_clean (
  id uuid primary key default gen_random_uuid(),
  sync_type text not null,
  provider text,
  status text default 'running',
  found integer default 0,
  matched integer default 0,
  saved integer default 0,
  skipped integer default 0,
  failed integer default 0,
  warnings jsonb default '[]'::jsonb,
  errors jsonb default '[]'::jsonb,
  debug_json jsonb default '{}'::jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz,
  duration_ms integer
);

create table if not exists ipo_source_records_clean (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references ipo_sync_runs_clean(id) on delete set null,
  provider text not null,
  record_type text not null,
  raw_name text not null,
  normalized_name text,
  source_url text,
  payload jsonb default '{}'::jsonb,
  matched_ipo_id uuid references ipos(id) on delete set null,
  match_confidence integer default 0,
  match_type text,
  status text default 'staged',
  reason text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create table if not exists ipo_facts_clean (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  fact_key text not null,
  fact_value jsonb not null,
  display_value text,
  source_provider text not null,
  source_url text,
  source_priority integer default 70,
  confidence text default 'medium',
  is_official boolean default false,
  admin_verified boolean default false,
  captured_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(ipo_id, fact_key)
);

create table if not exists ipo_gmp_history_clean (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  gmp_value numeric(10,2),
  gmp_pct numeric(10,2),
  estimated_listing_price numeric(10,2),
  source_provider text not null,
  source_url text,
  captured_at timestamptz default now(),
  captured_minute timestamptz default date_trunc('minute', now())
);

create table if not exists ipo_subscription_history_clean (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  qib_x numeric(10,2),
  nii_x numeric(10,2),
  retail_x numeric(10,2),
  total_x numeric(10,2),
  source_provider text not null,
  source_url text,
  captured_at timestamptz default now(),
  captured_minute timestamptz default date_trunc('minute', now())
);

create table if not exists ipo_aliases_clean (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  provider text,
  created_by text,
  created_at timestamptz default now(),
  unique(normalized_alias, provider)
);

create unique index if not exists ipo_gmp_history_clean_dedupe_idx
  on ipo_gmp_history_clean(ipo_id, source_provider, captured_minute, gmp_value);

create unique index if not exists ipo_subscription_history_clean_dedupe_idx
  on ipo_subscription_history_clean(ipo_id, source_provider, captured_minute, total_x);

create index if not exists ipo_sync_runs_clean_started_idx on ipo_sync_runs_clean(started_at desc);
create index if not exists ipo_source_records_clean_status_idx on ipo_source_records_clean(status, created_at desc);
create index if not exists ipo_source_records_clean_match_idx on ipo_source_records_clean(matched_ipo_id, created_at desc);
create index if not exists ipo_facts_clean_ipo_key_idx on ipo_facts_clean(ipo_id, fact_key);
create index if not exists ipo_gmp_history_clean_ipo_captured_idx on ipo_gmp_history_clean(ipo_id, captured_at desc);
create index if not exists ipo_subscription_history_clean_ipo_captured_idx on ipo_subscription_history_clean(ipo_id, captured_at desc);
create index if not exists ipo_aliases_clean_ipo_idx on ipo_aliases_clean(ipo_id);

insert into ipo_sources_clean(provider, source_type, base_url, priority, supports_auto_fetch)
values
  ('CHITTORGARH', 'ipo_list', 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/', 30, true),
  ('CHITTORGARH', 'detail', 'https://www.chittorgarh.com/', 30, true),
  ('INVESTORGAIN', 'gmp', 'https://www.investorgain.com/report/live-ipo-gmp/331/', 40, true),
  ('IPOWATCH', 'gmp', 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', 60, true),
  ('IPOWATCH', 'subscription', 'https://ipowatch.in/ipo-subscription-status-today/', 40, true),
  ('NSE', 'exchange_status', 'https://www.nseindia.com/', 20, true),
  ('BSE', 'exchange_status', 'https://www.bseindia.com/', 20, true),
  ('BSE_SME', 'exchange_status', 'https://www.bsesme.com/', 20, true),
  ('ADMIN', 'detail', null, 5, false)
on conflict(provider, source_type) do nothing;

alter table ipo_sources_clean enable row level security;
alter table ipo_sync_runs_clean enable row level security;
alter table ipo_source_records_clean enable row level security;
alter table ipo_facts_clean enable row level security;
alter table ipo_gmp_history_clean enable row level security;
alter table ipo_subscription_history_clean enable row level security;
alter table ipo_aliases_clean enable row level security;

drop policy if exists "Public read clean facts" on ipo_facts_clean;
create policy "Public read clean facts" on ipo_facts_clean for select using (true);

drop policy if exists "Public read clean GMP" on ipo_gmp_history_clean;
create policy "Public read clean GMP" on ipo_gmp_history_clean for select using (true);

drop policy if exists "Public read clean subscription" on ipo_subscription_history_clean;
create policy "Public read clean subscription" on ipo_subscription_history_clean for select using (true);

notify pgrst, 'reload schema';
