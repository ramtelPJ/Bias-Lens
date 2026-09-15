# Oxylabs Scheduler + Vercel Cron — automatic hourly pipeline

## Goal

Replace manual `POST /api/scrape` + `POST /api/analyze` calls with a fully automatic hourly pipeline:
Oxylabs Scheduler scrapes every active source's homepage once an hour on Oxylabs' own clock; a Vercel
Cron job fires 15 minutes later, pulls the completed homepage HTML, runs it through the existing
scrape-to-insert pipeline, then immediately runs AI analysis on anything left pending.

## Skills read

- `.agents/skills/web-scraper-api/SKILL.md` (this is the "oxylabs-web-scraper" skill referenced in
  AGENTS.md — installed under the plugin name `web-scraper-api`, same Oxylabs Web Scraper API. No
  install needed.) Covers Realtime/Push-Pull basics; does **not** cover Scheduler.
- `.agents/skills/supabase/SKILL.md` — schema/RLS conventions, joined-table filter gotcha (already
  respected by existing code), security checklist for new tables.
- Live-fetched (per AGENTS.md §18 mandate — never assume from memory):
  `https://developers.oxylabs.io/products/web-scraper-api/features/scheduler` and the Push-Pull results
  page. Confirmed endpoint shapes below.

## Existing code inspected

- `lib/oxylabs/client.ts` — `fetchHtml()`, Realtime endpoint, Basic auth from `OXY_WSA_USERNAME/PASSWORD`.
- `lib/pipeline/scrape.ts` — `runScrapePipeline()` already accepts an injectable
  `getHomepageHtml?: (source: SourceRow) => Promise<string>`, built exactly for this: scheduler
  processing can supply Oxylabs job HTML instead of a live fetch, with zero changes to the pipeline
  itself.
- `lib/pipeline/analyze.ts` — `runAnalysisPipeline()`, already LEFT-JOIN-based pending detection.
- `lib/supabase/queries/pipeline-articles.ts` — existing 15-item `.in()` chunking pattern
  (`URL_CHECK_CHUNK_SIZE`) to reuse for job-id dedupe.
- `lib/supabase/queries/sources.ts` — `getActiveSources()`.
- `supabase/schema.sql` — no `oxylabs_schedules` / `oxylabs_schedule_runs` tables exist yet; `logs`
  table exists but is unused by any pipeline code (everything logs via `console.log` only — scrape.ts,
  analyze.ts). Keeping that same convention; wiring up the `logs` table / `GET /api/logs` is a separate,
  unrequested feature (AGENTS.md §1) and out of scope here.
- `app/api/scrape/route.ts`, `app/api/analyze/route.ts` — thin route handler + admin-secret pattern to
  copy for the new POST routes.
- No `vercel.json` exists yet.

## Confirmed Oxylabs Scheduler API shape (live docs, base `https://data.oxylabs.io/v1`)

| Action | Method | Path |
|---|---|---|
| Create schedule | POST | `/schedules` — body `{ cron, items: [{source:"universal", url}], end_time: "YYYY-MM-DD HH:MM:SS" }` |
| List all schedules | GET | `/schedules` — `{ "schedules": ["<id>", ...] }` (already quoted strings) |
| Get one schedule | GET | `/schedules/{id}` |
| Set active state | PUT | `/schedules/{id}/state` — body `{ "active": boolean }` |
| List runs | GET | `/schedules/{id}/runs` — `{ "runs": [{ run_id, jobs: [{ id, result_status, created_at, result_created_at }], success_rate }] }` |
| Job results | GET | `/queries/{job_id}/results` — `{ "results": [{ content, url, status_code, ... }] }` |

**Confirmed precision bug**: `schedule_id` (create/get response) and job `id` (inside `/runs`) are bare
JSON numbers (e.g. `485005153871537982`) that exceed `Number.MAX_SAFE_INTEGER` — `JSON.parse` silently
corrupts the last digits. Per AGENTS.md §18, these must be read from the raw response text via regex
before any `JSON.parse`. The `/schedules` list endpoint returns them as quoted strings already, so that
one is safe to `JSON.parse` normally.

`result_status` values: `pending`, `done`, `faulted` — only `done` is fetched for results, per AGENTS.md
§18 ("Use /runs not /jobs").

There is no documented way to force a schedule to run on demand — the first live Oxylabs run happens on
Oxylabs' own hourly clock after schedule creation.

## Decisions / assumptions

1. **One Oxylabs schedule per active source** (not one shared schedule with many items), matching
   AGENTS.md §18's "Sync schedules route — creates one Oxylabs schedule per active source." Each
   schedule's `items` array has exactly one entry: `{source: "universal", url: source.listing_url}` —
   same as the manual live-fetch default (no `render`, matching `fetchHtml`'s ponytail comment about
   cost).
2. **Oxylabs cron**: `"0 * * * *"` (top of every hour). **Vercel cron**: `"15 * * * *"` (15 min later),
   per AGENTS.md §18.
3. **`end_time`**: set to 10 years from creation time (Oxylabs requires a value; product has no
   "forever" option).
4. **IDs stored and passed around as `text` end-to-end** (DB columns and TS types), never converted
   back through a JS `number`, so the precision fix isn't undone downstream.
5. **Job → source mapping** is done by matching each completed job's `results[0].url` (from
   `/queries/{id}/results`) against `sources.listing_url`, not by array-position ordering (schedule/run
   job ordering isn't documented as stable).
6. **Dedupe of processed runs**: `oxylabs_schedule_runs` stores every already-ingested job id
   (`unique`). The process route only acts on `done` jobs from `/runs` whose id isn't already in that
   table — mirrors the existing 15-item `.in()` chunking pattern in `pipeline-articles.ts`.
7. **Orphan sweep** (§18): every sync call, after creating missing schedules, lists all Oxylabs
   schedule ids via `GET /schedules` and deactivates (`PUT .../state {active:false}`) any id not present
   in `oxylabs_schedules`. Additionally (small, in-spirit extension of §7's "only active sources are
   scheduled"): a stored schedule whose source has since been set `is_active = false` is deactivated on
   Oxylabs and its DB row deleted, so reactivating the source later creates a fresh schedule.
8. **Auth**: `POST /api/oxylabs/schedules` and `POST /api/oxylabs/scheduled-results/process` require
   `x-biasly-admin-secret` (§15, mutate routes). `GET /api/oxylabs/schedules` and `GET /api/oxylabs/runs`
   are unauthenticated reads of DB-only data (§14's GET/read-route class — no live Oxylabs calls, no
   secrets returned). `GET /api/cron/pipeline` requires `CRON_SECRET`, skipped only when
   `NODE_ENV !== "production"` (§18, exact instruction), and must never accept `BIASLY_ADMIN_SECRET`.
9. **Cron route never throws past step 1**: if scheduled-results processing fails, analysis still runs
   (§18 point 6), because pre-existing unanalyzed articles may exist regardless.

## Files likely to change

New:
- `lib/oxylabs/scheduler-client.ts` — raw HTTP calls (create/list/setState/getRuns/getJobResult) with
  the raw-text large-int extraction.
- `lib/supabase/queries/oxylabs-schedules.ts` — CRUD for `oxylabs_schedules`.
- `lib/supabase/queries/oxylabs-schedule-runs.ts` — chunked existing-job-id check + insert-processed.
- `lib/pipeline/scheduler-sync.ts` — `runScheduleSync()`.
- `lib/pipeline/scheduled-results.ts` — `runScheduledResultsProcessing()`, reuses `runScrapePipeline`'s
  `getHomepageHtml` injection.
- `app/api/oxylabs/schedules/route.ts` — POST (sync) + GET (list stored rows).
- `app/api/oxylabs/scheduled-results/process/route.ts` — POST (manual trigger).
- `app/api/oxylabs/runs/route.ts` — GET (list processed job history).
- `app/api/cron/pipeline/route.ts` — GET, `CRON_SECRET`-protected, chains processing then analysis.
- `vercel.json` — cron registration.

Edited:
- `supabase/schema.sql` — append `oxylabs_schedules`, `oxylabs_schedule_runs` (RLS enabled, no public
  policies — internal/service-role only, same pattern as `logs`).
- `lib/supabase/types.ts` — Database types for the two new tables.
- `lib/pipeline/types.ts` — add `ScheduleSyncSummary` and `ScheduledResultsSummary` types.

## Implementation requirements

- Thin route handlers; all Oxylabs/DB logic lives in `lib/`.
- Reuse `runScrapePipeline` unchanged for the actual scrape-to-insert work — scheduled processing only
  supplies `sourceNames` (sources with a new completed job) and a `getHomepageHtml` that returns the
  already-fetched job content, never a second live fetch of the homepage.
- Reuse `getActiveSources()`; never hardcode source URLs.
- `oxylabs_schedule_id` and Oxylabs job `id` are `text` columns/TS `string` everywhere.
- Console `run logging` in the same style as `scrape.ts`/`analyze.ts` (`[scheduler-sync]`,
  `[scheduled-results]` prefixes) plus a final summary object per run.
- `vercel.json` cron path must be `/api/cron/pipeline` at `"15 * * * *"`.

## Security requirements

- Never expose `OXY_WSA_USERNAME/PASSWORD` to browser code (already server-only via `"server-only"`
  import convention — keep it on every new server module).
- `x-biasly-admin-secret` required + validated on both new POST routes (401 on missing/invalid).
- `CRON_SECRET` required + validated on `GET /api/cron/pipeline` in production only; never read from
  `.env.local`; never substitute `BIASLY_ADMIN_SECRET`.
- New tables get RLS enabled with no `anon`/`authenticated` policies (service-role-only, matching `logs`).

## Acceptance criteria

- `POST /api/oxylabs/schedules` creates exactly one Oxylabs schedule per active source lacking one,
  skips sources that already have one, deactivates orphaned Oxylabs schedules and stale
  (now-inactive-source) DB rows, and returns a summary.
- `GET /api/oxylabs/schedules` returns stored schedule rows joined with source name/cron/active status.
- `POST /api/oxylabs/scheduled-results/process` ingests only new `done` jobs since the last call (no
  duplicate processing of the same job id), runs them through the exact same validation/dedupe/insert
  pipeline as manual scraping, and returns a `RunSummary`-shaped result.
- `GET /api/oxylabs/runs` lists processed job history.
- `GET /api/cron/pipeline` runs processing then analysis in sequence, always runs analysis even if
  processing throws, is unreachable without a valid `CRON_SECRET` in production, and is open in dev.
- `vercel.json` registers the 15-minutes-past-the-hour cron.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (new routes + `vercel.json`)

## Exact manual test steps (after implementation)

1. Run the appended SQL in Supabase Dashboard → SQL Editor (new `oxylabs_schedules` /
   `oxylabs_schedule_runs` tables).
2. `npm run dev`, watch its terminal for `[scheduler-sync]` / `[scheduled-results]` / `[analyze]` logs.
3. Sync schedules (creates one Oxylabs schedule per active source — real billable schedules):
   ```bash
   curl -X POST http://localhost:3000/api/oxylabs/schedules \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET"
   ```
4. `curl http://localhost:3000/api/oxylabs/schedules` — confirm one row per active source.
5. Wait for Oxylabs' own hourly clock to produce the first `done` run (up to ~60 minutes — there is no
   on-demand trigger), then:
   ```bash
   curl -X POST http://localhost:3000/api/oxylabs/scheduled-results/process \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET"
   ```
6. `curl http://localhost:3000/api/oxylabs/runs` — confirm the job id now shows as processed; re-running
   step 5 immediately should process 0 new jobs (dedupe working).
7. `curl http://localhost:3000/api/cron/pipeline` (GET, no header needed in dev) — confirm it chains
   processing + analysis and returns both summaries.
8. Deploy to Vercel so `vercel.json`'s cron is registered; confirm in the Vercel dashboard under
   Project → Cron Jobs that `/api/cron/pipeline` is scheduled for `15 * * * *`.
