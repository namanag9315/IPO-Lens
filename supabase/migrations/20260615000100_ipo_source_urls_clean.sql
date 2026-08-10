-- Migration: ipo_source_urls_clean
-- Auto-discovered and admin-overridden source URLs per IPO per provider

create table if not exists ipo_source_urls_clean (
  id                 uuid        primary key default gen_random_uuid(),
  ipo_id             uuid        not null references ipos(id) on delete cascade,
  provider           text        not null,
  source_type        text        not null,
  -- e.g. detail | financial_report | peer_comparison | subscription | review | gmp | ipo_list
  source_url         text        not null,
  discovery_method   text        not null default 'admin_override',
  -- e.g. list_row | provider_search | sibling_url | slug_guess_verified | admin_override
  match_confidence   integer     not null default 0,
  status             text        not null default 'candidate',
  -- candidate | verified | failed | blocked | needs_review | rejected
  failure_reason     text,
  last_checked_at    timestamptz,
  last_success_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (ipo_id, provider, source_type, source_url)
);

create index if not exists ipo_source_urls_clean_ipo_idx
  on ipo_source_urls_clean (ipo_id, provider, source_type);

create index if not exists ipo_source_urls_clean_status_idx
  on ipo_source_urls_clean (status, provider);

alter table ipo_source_urls_clean enable row level security;

-- Public can read verified URLs (used by public page)
drop policy if exists "Public read verified source urls" on ipo_source_urls_clean;
create policy "Public read verified source urls"
  on ipo_source_urls_clean for select
  using (status = 'verified');

-- Service role writes only (no direct client writes)
drop policy if exists "Service role full access source urls" on ipo_source_urls_clean;
create policy "Service role full access source urls"
  on ipo_source_urls_clean for all
  using (true)
  with check (true);

notify pgrst, 'reload schema';
