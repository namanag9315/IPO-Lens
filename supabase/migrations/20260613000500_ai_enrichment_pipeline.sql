create table if not exists ipo_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  source_name text not null,
  source_url text,
  source_type text,
  raw_text text,
  raw_html text,
  parsed_json jsonb,
  captured_at timestamptz default now(),
  confidence text default 'medium',
  created_at timestamptz default now()
);

create table if not exists ipo_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  status text default 'queued',
  missing_fields text[] not null default '{}',
  source_snapshot_ids uuid[] default '{}',
  attempts integer default 0,
  error_message text,
  triggered_by text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists ipo_enriched_fields (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  job_id uuid references ipo_enrichment_jobs(id) on delete set null,
  field_name text not null,
  field_value jsonb not null,
  display_value text,
  source_name text,
  source_url text,
  source_snapshot_id uuid references ipo_source_snapshots(id) on delete set null,
  evidence_text text,
  confidence text not null,
  status text default 'needs_review',
  applied_to_table text,
  applied_to_column text,
  applied_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists ipo_field_quality (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  field_name text not null,
  status text not null,
  source_name text,
  source_url text,
  confidence text,
  last_checked_at timestamptz default now(),
  notes text,
  unique (ipo_id, field_name)
);

create table if not exists ipo_strengths (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  title text not null,
  description text,
  source text,
  source_url text,
  confidence text default 'medium',
  created_at timestamptz default now()
);

create table if not exists ipo_risks (
  id uuid primary key default gen_random_uuid(),
  ipo_id uuid references ipos(id) on delete cascade,
  title text not null,
  severity text default 'medium',
  explanation text,
  source text,
  source_url text,
  confidence text default 'medium',
  created_at timestamptz default now()
);

alter table if exists ipos add column if not exists enriched_data jsonb default '{}'::jsonb;
alter table if exists ipos add column if not exists registrar_name text;
alter table if exists ipos add column if not exists fresh_issue_amount numeric;
alter table if exists ipos add column if not exists ofs_amount numeric;
alter table if exists ipos add column if not exists face_value numeric;
alter table if exists ipos add column if not exists issue_type text;
alter table if exists ipos add column if not exists pre_issue_shares numeric;
alter table if exists ipos add column if not exists post_issue_shares numeric;

alter table if exists ipo_company_profiles add column if not exists products_services text;
alter table if exists ipo_company_profiles add column if not exists customers text;
alter table if exists ipo_company_profiles add column if not exists manufacturing_facilities text;
alter table if exists ipo_company_profiles add column if not exists revenue_model text;
alter table if exists ipo_company_profiles add column if not exists promoter_summary text;
alter table if exists ipo_company_profiles add column if not exists registrar_website text;
alter table if exists ipo_company_profiles add column if not exists registrar_email text;
alter table if exists ipo_company_profiles add column if not exists registrar_phone text;
alter table if exists ipo_company_profiles add column if not exists registrar_address text;

create index if not exists ipo_source_snapshots_ipo_id_captured_at_idx on ipo_source_snapshots(ipo_id, captured_at desc);
create index if not exists ipo_source_snapshots_source_type_idx on ipo_source_snapshots(source_type);
create index if not exists ipo_enrichment_jobs_status_created_at_idx on ipo_enrichment_jobs(status, created_at desc);
create index if not exists ipo_enrichment_jobs_ipo_id_created_at_idx on ipo_enrichment_jobs(ipo_id, created_at desc);
create index if not exists ipo_enriched_fields_status_created_at_idx on ipo_enriched_fields(status, created_at desc);
create index if not exists ipo_enriched_fields_ipo_id_field_name_idx on ipo_enriched_fields(ipo_id, field_name);
create index if not exists ipo_field_quality_ipo_id_field_name_idx on ipo_field_quality(ipo_id, field_name);
