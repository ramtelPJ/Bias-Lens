# Supabase Database and Data Access

## Goal

Stand up the Supabase schema and a typed, server-only data-access layer for Biasly: `sources`, `articles`, and `article_analyses` tables plus a generic `logs` table, RLS policies matching the actual access model, typed Supabase clients, and the first read query functions. This is infrastructure only — no scraping/AI pipeline exists yet to write real rows, and (per user decision below) the UI keeps rendering `SAMPLE_ARTICLES` for now.

## Skills read

- `.agents/skills/supabase/SKILL.md` — core principles (verify against live docs/changelog, never work from memory), security checklist (RLS-on-every-exposed-table, `service_role` never in public clients, `TO authenticated` alone ≠ authorization, views bypass RLS, `SECURITY DEFINER` traps), CLI/MCP guidance, schema-change workflow.
- Fetched live (per the skill's Core Principle 1 — verify before implementing):
  - `https://supabase.com/changelog.md` — no breaking changes found affecting client creation, `@supabase/ssr`, or schema/migration workflow.
  - `https://supabase.com/docs/guides/api/api-keys.md` — confirms the new short-string key format (`sb_publishable_...` / `sb_secret_...`) is a drop-in replacement for legacy JWT `anon`/`service_role` keys; `createClient(url, key)` code is unchanged regardless of format. Recommended client-side env var name is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — **this already matches what's in `.env.local`**, which differs from the `NEXT_PUBLIC_SUPABASE_ANON_KEY` name in AGENTS.md §21's table (written before this key rotation existed).
  - `https://supabase.com/docs/guides/getting-started/quickstarts/nextjs.md` — current file convention is `lib/supabase/client.ts` (browser) / `lib/supabase/server.ts` (Server Components with cookie-based auth). Not directly applicable here: Biasly uses **Clerk**, not Supabase Auth, so there's no Supabase session/cookie to manage and `@supabase/ssr` isn't needed — plain `@supabase/supabase-js` `createClient()` is sufficient for both clients this prompt adds.

## Existing code inspected

- `.env.local` already has real project credentials: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (holding a new-format `sb_secret_...` value despite the legacy var name).
- No `supabase/` directory, no Supabase client code, no CLI installed, no Supabase MCP server connected in this session — schema changes will be applied by hand via the Supabase Dashboard SQL Editor (the same workflow AGENTS.md §7 already prescribes for future `ALTER` statements).
- `lib/sample-articles.ts` / `lib/sample-article-details.ts` / `components/article-card.tsx` / `app/article/[id]/page.tsx`: the current mock UI models a **multi-outlet "story"** (per-story `category`, `region`, `sourceCount`, a cross-outlet "Top Sources" bias breakdown, related stories). AGENTS.md §7's actual schema and §19's required card/detail fields model **one article = one source = one analysis**, with no story-clustering, category, or region concept anywhere in the spec.
- **Decision (confirmed with user)**: reconciling that mismatch is out of scope for this prompt. The schema/data-access layer is built to the real spec; `app/page.tsx` and `app/article/[id]/page.tsx` are left untouched on `SAMPLE_ARTICLES` until a future prompt decides how (or whether) to redesign the cards/detail page around the real per-article model.
- `package.json`: no `@supabase/supabase-js` yet. Confirmed current version via `npm view`: `@supabase/supabase-js@2.116.0`.

## Decisions / assumptions

- **Env var naming**: use what's already in `.env.local` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. AGENTS.md §21's env table will be updated to match (`NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), since that table is documentation of reality, not a fixed contract, and the project's actual keys are already in the new format.
- **Tables created now**: `sources`, `articles`, `article_analyses`, `logs`. **Deferred**: `oxylabs_schedules` / `oxylabs_schedule_runs` — AGENTS.md §7 lists them as core tables but doesn't specify their columns, and their real shape depends on the live Oxylabs Scheduler API response fields (§18 requires fetching that API's current docs before implementing). Building them now risks guessing wrong and re-altering later; they'll be added in the `oxylabs-scheduler` prompt once that API contract is actually in hand.
- **No `@supabase/ssr`**: not needed — Biasly has no Supabase Auth session to manage (Clerk handles auth). Both clients use plain `@supabase/supabase-js`.
- **Two server-only clients**, matching the two key exposure levels already implied by the env table:
  - `lib/supabase/service-client.ts` — built with `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS. For pipeline/admin use (e.g. `getActiveSources()` for the future scraping prompt).
  - `lib/supabase/public-client.ts` — built with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, subject to RLS. For the read paths a future prompt will point the public pages at (`getArticles`, `getArticleById`). Both are marked `import "server-only"` — even though the publishable key is browser-safe, nothing in this app calls Supabase from client components, so this keeps a single clear boundary. Requires adding the tiny `server-only` package.
- **RLS design** (no Supabase Auth / `auth.uid()` involved — access is either "public content" or "internal-only"):
  - `sources`: RLS on; `select` policy `to anon, authenticated using (true)` (source name/logo are public-safe); no write policies (writes only via service role).
  - `articles`: RLS on; `select` policy `to anon, authenticated using (analyzed_at is not null)` — matches AGENTS.md §18 ("articles only appear on the homepage after `analyzed_at` is set"). No write policies.
  - `article_analyses`: RLS on; `select` policy `to anon, authenticated using (true)` (existence of the row already implies its article is analyzed). No write policies.
  - `logs`: RLS on, **no policies at all** — default-deny for `anon`/`authenticated`; only the service-role client (bypasses RLS) can read/write. Matches "logs" being internal pipeline/ops data, not public content.
  - Explicit `grant select on sources, articles, article_analyses to anon, authenticated;` per the skill's note that new tables aren't always auto-exposed to the Data API depending on project settings. No grant for `logs`.
- **No DB-level check that left/center/right percentages sum to 100** — floating-point AI output makes a hard `CHECK` brittle (e.g. 33.33/33.33/33.34 rounding). That validation belongs in the future AI-analysis prompt's Zod schema (AGENTS.md §19 already specifies it there), not in SQL.
- **Dedupe / FK shape**: `articles.original_url` is `unique` (the dedupe key per §10). `article_analyses.article_id` is `unique` + `references articles(id) on delete cascade`, which both enforces "one analysis per article" and gives PostgREST a proper one-to-one embed for joined queries. `articles.source_id references sources(id) on delete restrict` (don't let a source deletion silently orphan/cascade-delete scraped articles).
- **Schema applied manually**: no Supabase CLI or MCP server is available in this environment, and only API keys (not a Postgres connection string) are on hand — so `supabase/schema.sql` is written to the repo and the user runs it once in the Supabase Dashboard → SQL Editor, per the exact workflow AGENTS.md §7 already documents for schema changes.

## Files likely to change

- `supabase/schema.sql` (new) — full DDL: extensions, 4 tables, indexes, RLS, policies, grants.
- `lib/supabase/types.ts` (new) — hand-written `Database` type matching the schema (generator-style shape, usable with `createClient<Database>()`).
- `lib/supabase/service-client.ts` (new) — server-only client, service-role key.
- `lib/supabase/public-client.ts` (new) — server-only client, publishable key.
- `lib/supabase/queries/sources.ts` (new) — `getActiveSources()`.
- `lib/supabase/queries/articles.ts` (new) — `getArticles({ limit, offset })`, `getArticleById(id)` (both joined with `sources` + `article_analyses`, filtered to analyzed articles). This is the file AGENTS.md §20 later extends with `getRelatedArticles(articleId, embedding)`.
- `package.json` / `package-lock.json` — add `@supabase/supabase-js`, `server-only`.
- `.env.example` — add the three Supabase vars.
- `AGENTS.md` — update the env var table row `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to match reality.
- No changes to `app/page.tsx`, `app/article/[id]/page.tsx`, or any component — UI stays on sample data per the decision above.

## Implementation requirements

- All SQL in one idempotent-as-possible `supabase/schema.sql` (`create table if not exists`, `create extension if not exists pgcrypto`), since it's applied by hand once.
- `service-client.ts` and `public-client.ts` both start with `import "server-only";` and throw a clear error if their required env var is missing (fail fast, not a silent `undefined` client).
- Query functions return typed rows (using the `Database` type), no `any`.
- No RLS policy uses `auth.role()` (deprecated per the skill) — use `to anon, authenticated` directly.
- `SUPABASE_SERVICE_ROLE_KEY` never imported into any file reachable from a client component.

## Security requirements

- RLS enabled on all 4 tables, with policies matching the access model above (no blanket `using (true)` on `articles` — gated to analyzed rows).
- `logs` has zero public policies — verified by a manual test (below) that an anon-key query against `logs` returns empty/denied, not data.
- Service-role client stays in server-only modules; never referenced by anything under `"use client"`.

## Acceptance criteria

- Running `supabase/schema.sql` in the Supabase SQL Editor succeeds with no errors on a clean project.
- `getActiveSources()`, `getArticles()`, `getArticleById(id)` compile and, once rows exist, return correctly-typed, correctly-joined data — verified with an empty-database smoke test (see below) since no pipeline has inserted rows yet.
- `npm run typecheck` / `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` is not required (no routes/pages change), but will be run anyway since new server-only modules are added.

## Exact manual test steps (after implementation)

1. Open the Supabase Dashboard → SQL Editor for the project at the URL in `NEXT_PUBLIC_SUPABASE_URL`, paste in the full contents of `supabase/schema.sql`, and run it. Confirm no errors and that `sources`, `articles`, `article_analyses`, `logs` appear under Table Editor with RLS shown as enabled on all four.
2. In the SQL Editor, insert one throwaway test row so the query functions have something to return (single statement, no manual ID copying — the CTEs chain the returned ids for you):
   ```sql
   with new_source as (
     insert into sources (name, listing_url)
     values ('Test Source', 'https://example.com')
     returning id
   ),
   new_article as (
     insert into articles (source_id, original_url, canonical_url, title, image_url, published_at, raw_text, analyzed_at)
     select id, 'https://example.com/test-article', 'https://example.com/test-article', 'Test Article',
            'https://example.com/image.jpg', now(), 'Enough raw text to pass the content gate for this smoke test row.', now()
     from new_source
     returning id
   )
   insert into article_analyses (article_id, summary, sentiment_score, sentiment_label, bias_score, bias_label, left_percentage, center_percentage, right_percentage, confidence, framing_notes, loaded_terms, disclaimer, model)
   select id, 'Test summary.', 0, 'neutral', 0, 'center', 33, 34, 33, 0.5, 'Test framing notes.', array['test term'], 'AI-estimated, not objective truth.', 'test-model'
   from new_article
   returning article_id;
   ```
   Note the returned `article_id` — you'll need it for step 3.
3. Add a throwaway Node script (or a temporary Next.js route) that calls `getArticles()` and `getArticleById(id)` from `lib/supabase/queries/articles.ts` and `getActiveSources()` from `lib/supabase/queries/sources.ts`; confirm each returns the test row(s) with the joined source/analysis data attached, then delete the throwaway rows and script.
4. Confirm `logs` is truly locked down: run a query against the `logs` table using the publishable key (e.g. via `curl` against the PostgREST endpoint with the `apikey`/`Authorization` header set to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) and confirm it returns an empty result, not data.

Is this good to execute?
