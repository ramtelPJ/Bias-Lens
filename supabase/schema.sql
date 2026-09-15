-- Biasly Supabase schema (AGENTS.md §7).
-- Run once in the Supabase Dashboard -> SQL Editor. Safe to re-run (idempotent
-- creates); future field changes are documented as ALTER statements appended
-- below their owning table, per AGENTS.md §7.

create extension if not exists pgcrypto;

-- =========================================================================
-- sources
-- =========================================================================
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  listing_url text not null unique,
  parser_strategy text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sources enable row level security;

create policy "Public read access to sources"
  on sources for select
  to anon, authenticated
  using (true);

grant select on sources to anon, authenticated;

-- =========================================================================
-- articles
-- =========================================================================
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources (id) on delete restrict,
  original_url text not null unique,
  canonical_url text not null,
  title text not null,
  image_url text not null,
  published_at timestamptz not null,
  raw_text text not null,
  scraped_at timestamptz not null default now(),
  analyzed_at timestamptz
);

create index if not exists articles_source_id_idx on articles (source_id);
create index if not exists articles_published_at_idx on articles (published_at desc);

alter table articles enable row level security;

-- Matches AGENTS.md §18: articles only appear on the homepage once analyzed.
create policy "Public read access to analyzed articles"
  on articles for select
  to anon, authenticated
  using (analyzed_at is not null);

grant select on articles to anon, authenticated;

-- =========================================================================
-- article_analyses
-- =========================================================================
create table if not exists article_analyses (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references articles (id) on delete cascade,
  summary text not null,
  sentiment_score numeric not null check (sentiment_score >= -1 and sentiment_score <= 1),
  sentiment_label text not null check (sentiment_label in ('positive', 'neutral', 'negative')),
  bias_score numeric not null check (bias_score >= -1 and bias_score <= 1),
  bias_label text not null check (bias_label in ('left', 'center', 'right', 'mixed', 'unclear')),
  left_percentage numeric not null check (left_percentage >= 0 and left_percentage <= 100),
  center_percentage numeric not null check (center_percentage >= 0 and center_percentage <= 100),
  right_percentage numeric not null check (right_percentage >= 0 and right_percentage <= 100),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  framing_notes text not null,
  loaded_terms text[] not null default '{}'::text[],
  disclaimer text not null,
  model text not null,
  created_at timestamptz not null default now()
);

-- NOTE: intentionally no CHECK that left+center+right = 100 — AI floating-point
-- output makes a hard DB constraint brittle. That validation lives in the
-- AI-analysis pipeline's Zod schema (AGENTS.md §19).

alter table article_analyses enable row level security;

-- A row's existence already implies its article is analyzed.
create policy "Public read access to article analyses"
  on article_analyses for select
  to anon, authenticated
  using (true);

grant select on article_analyses to anon, authenticated;

-- =========================================================================
-- pgvector (AGENTS.md §20) — enable the "vector" extension via Supabase
-- Dashboard -> Database -> Extensions first, then run the statements below
-- once in the Dashboard -> SQL Editor. Safe to re-run (idempotent creates).
-- =========================================================================
alter table article_analyses add column if not exists embedding vector(1536);

create index if not exists article_analyses_embedding_idx
  on article_analyses using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Cosine-distance ordering against a dynamic query vector isn't expressible
-- through the PostgREST query builder, so related-article lookups go through
-- this function instead. security invoker (the default) — no privilege
-- escalation; it relies on the caller's own access.
create or replace function match_related_articles(
  current_article_id uuid,
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  image_url text,
  published_at timestamptz,
  source_name text,
  bias_label text,
  sentiment_label text
)
language sql
stable
as $$
  select
    a.id,
    a.title,
    a.image_url,
    a.published_at,
    s.name as source_name,
    aa.bias_label,
    aa.sentiment_label
  from article_analyses aa
  join articles a on a.id = aa.article_id
  join sources s on s.id = a.source_id
  where aa.embedding is not null
    and a.analyzed_at is not null
    and a.id <> current_article_id
  order by aa.embedding <=> query_embedding
  limit match_count;
$$;

-- =========================================================================
-- oxylabs_schedules (AGENTS.md §18) — one Oxylabs Scheduler schedule per
-- active source. oxylabs_schedule_id is text, never bigint/numeric: Oxylabs
-- schedule ids are 64-bit integers that lose precision through JSON number
-- parsing (JS and PostgREST both), so the app treats them as opaque strings
-- end-to-end.
-- =========================================================================
create table if not exists oxylabs_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references sources (id) on delete cascade,
  oxylabs_schedule_id text not null unique,
  cron text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table oxylabs_schedules enable row level security;

-- Internal/ops bookkeeping only, readable exclusively via the service-role
-- client (which bypasses RLS). Default-deny for anon/authenticated.

-- =========================================================================
-- oxylabs_schedule_runs (AGENTS.md §18) — dedupe ledger of Oxylabs run jobs
-- already ingested, so processing never re-scrapes the same homepage
-- snapshot twice. oxylabs_job_id is text for the same precision reason above.
-- =========================================================================
create table if not exists oxylabs_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references oxylabs_schedules (id) on delete cascade,
  oxylabs_job_id text not null unique,
  result_status text not null,
  processed_at timestamptz not null default now()
);

create index if not exists oxylabs_schedule_runs_schedule_id_idx on oxylabs_schedule_runs (schedule_id);

alter table oxylabs_schedule_runs enable row level security;

-- Internal/ops bookkeeping only, readable exclusively via the service-role
-- client (which bypasses RLS). Default-deny for anon/authenticated.

-- =========================================================================
-- logs
-- =========================================================================
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('info', 'warn', 'error')),
  pipeline text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_pipeline_created_at_idx on logs (pipeline, created_at desc);

alter table logs enable row level security;

-- Intentionally no policies: internal/ops data only, readable exclusively via
-- the service-role client (which bypasses RLS). Default-deny for anon/authenticated.
