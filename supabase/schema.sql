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
