# Oxylabs manual scraping pipeline

## Goal

Implement the manual scrape-to-insert pipeline (AGENTS.md §9, §10, §11, §12, §13, §15, §16): a `POST /api/scrape` route that loads active sources from Supabase, fetches each source's homepage HTML live through the Oxylabs Web Scraper API, extracts candidate article links, filters/dedupes them, scrapes and validates article detail pages, and appends valid articles to `articles`. Returns a run summary. Console-logs progress.

Out of scope (separate future prompts): Oxylabs Scheduler (§18), AI analysis (§19), pgvector (§20), a `logs` DB-table writer / `GET /api/logs` route, `GET /api/sources`.

## Skills read

- `.agents/skills/web-scraper-api` (installed name for the Oxylabs Web Scraper API skill referenced as `oxylabs-web-scraper` in AGENTS.md §3) — Realtime endpoint (`POST https://realtime.oxylabs.io/v1/queries`), `source: "universal"`, `url`, optional `render`, HTTP Basic Auth via `OXY_WSA_USERNAME`/`OXY_WSA_PASSWORD`.
- `.agents/skills/supabase` — confirmed via AGENTS.md §21's documented gotcha (no `.eq('foreignTable.column', …)` on joins); not otherwise needed since this task only touches `sources`/`articles` directly, no joined-table filtering.

## Existing code inspected

- `supabase/schema.sql` — `sources` (name, listing_url unique, parser_strategy, logo_url, is_active) and `articles` (source_id, original_url unique, canonical_url, title, image_url not null, published_at not null, raw_text, scraped_at, analyzed_at) already match AGENTS.md §7. No changes needed.
- `lib/supabase/types.ts`, `lib/supabase/service-client.ts` (service-role, bypasses RLS), `lib/supabase/public-client.ts` (RLS-bound, used by UI reads).
- `lib/supabase/queries/sources.ts` — `getActiveSources()` already exists, service-role based.
- `lib/supabase/queries/articles.ts` — only has public-client read functions for the UI (`getArticles`, `getArticleById`). No write path exists yet.
- `package.json` — no `cheerio`; `zod` is present only as a transitive dependency, not declared.
- No `app/api/*` routes exist yet. No `lib/oxylabs`, `lib/parsing`, or `lib/pipeline` directories yet.
- Queried the live Supabase project directly: **`sources` table is currently empty (0 rows)**.
- Confirmed via `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` that Route Handlers in this Next 16.3.4 install are unchanged from standard App Router conventions (`export async function POST(request: Request)`), so no adjustment needed there.

## Decisions / assumptions

- **Seed data**: per your selection, seeding one source — Reuters (`https://www.reuters.com`) — as part of this implementation, via a direct insert using the service-role client. `parser_strategy` left `null`; generic extraction (below) is expected to work for Reuters without a bespoke selector because filtering leans on URL shape, not DOM structure.
- **Scope boundary**: only the manual path (§16) is built now. The pipeline logic lives in `lib/pipeline/scrape.ts` so §18's Scheduler prompt can reuse it later by swapping how homepage HTML is obtained (live fetch vs. Oxylabs job result), per §9's "canonical scrape-to-insert flow."
- **Run logging**: interpreted as console logging plus the JSON summary object returned from the API (both explicitly required by §9/§16). Persisting run logs to the `logs` DB table is treated as part of a future "logs" feature, not built here — flag if you want it folded in now instead.
- **Homepage fetch**: no `render: "html"` by default (Reuters' homepage is largely server-rendered; this keeps Oxylabs cost down). If a run comes back with 0 candidate links, the pipeline logs a warning suggesting `render: "html"` be enabled — this is a one-line flip in `lib/oxylabs/client.ts`, not built as a runtime option.
- **Candidate URL filtering** is generic/URL-shape based (path depth, slug length/hyphen count, trailing date pattern) plus a shared regex reject list (§9's non-article list), rather than per-source CSS selectors — matches §11's "use source-specific parser strategy when generic extraction is not enough," which isn't yet known to be the case for Reuters.
- **Canonical URL**: read `<link rel="canonical">` from the detail page when present and it passes the same candidate-URL check; otherwise falls back to the normalized original URL.
- Dependencies to add: `cheerio` (not currently installed) and `zod` (currently only transitive — declaring it explicitly per AGENTS.md §6 tech stack).

## Files likely to change

New:
- `lib/oxylabs/client.ts` — server-only Realtime API client (`fetchHtml(url, opts?)`), Basic Auth from env, throws typed error on non-200/non-2xx `status_code`.
- `lib/parsing/reject-list.ts` — shared non-article reject regex patterns (§9 canonical list), exported for reuse by scheduler processing later.
- `lib/parsing/extract-candidate-links.ts` — homepage HTML → normalized, deduped, filtered candidate URLs (§11, §12).
- `lib/parsing/validate-article.ts` — detail HTML → cleaned `raw_text` + validated fields, or a typed rejection reason (§13).
- `lib/pipeline/types.ts` — `RunSummary`, `PerSourceResult`, rejection-reason enum/union.
- `lib/pipeline/scrape.ts` — orchestrator implementing the 9-step flow in §9, using injectable "get homepage HTML" so the scheduler can reuse it later.
- `lib/supabase/queries/pipeline-articles.ts` — service-role write path: `getExistingOriginalUrls(urls)` (chunked ≤15 per `.in()`, §9's URL existence check) and `insertArticle(row)` (treats unique-violation as a duplicate-skip, not a failure).
- `app/api/scrape/route.ts` — thin `POST` handler: admin-secret check → zod-parse optional body (`sourceNames?: string[]`, `limitPerSource?: number`) → call `runScrapePipeline` → return summary JSON.

Changed:
- `package.json` — add `cheerio`, `zod` dependencies.
- `.env.example` — add `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `BIASLY_ADMIN_SECRET`.
- `.env.local` — add the same keys (placeholder values for Oxylabs creds if you haven't already got them; you'll need to fill in real ones before a live run succeeds).

Data (not code):
- Insert one `sources` row for Reuters (`name: "Reuters"`, `listing_url: "https://www.reuters.com"`, `is_active: true`) via a one-off script using the service-role client.

## Implementation requirements

- Follow the exact 9-step flow in AGENTS.md §9 and the shared rules (URL existence check chunk size ≤15, article content gate, run logging) it defines by name.
- Non-article reject list (§9) implemented once in `lib/parsing/reject-list.ts`, imported wherever needed — never duplicated.
- Candidate filtering (§12): reject anything on the reject list, reject path depth < 2 segments, reject when the last segment isn't slug-shaped (short, few hyphens) unless it has a trailing date pattern. When uncertain, reject (stricter choice per §12).
- Article validation (§13): require article-specific title (reject generic/section/show names), image URL, published date, and body passing the OR-gate (≥3 meaningful paragraphs OR ≥900 meaningful chars after cleanup). Strip scripts/styles/ads/newsletter/related/most-viewed/share/nav blocks before computing `raw_text`. Never reject solely because paragraph splitting returned one paragraph — re-split via DOM blocks/sentence boundaries first.
- Insertion is append-only (§10): only `insert`, never delete/update/reset existing article rows; treat a unique-constraint violation on `original_url` as a duplicate-skip rather than a thrown error.
- API layering (§5): `app/api/scrape/route.ts` must stay thin (auth + parse + delegate + respond) — all scraping/parsing/DB logic lives in `lib/oxylabs`, `lib/parsing`, `lib/pipeline`, `lib/supabase`.
- Method + admin-secret rules (§14, §15): `POST /api/scrape` only, require `x-biasly-admin-secret` header matching `BIASLY_ADMIN_SECRET`, reject with `401` if missing/invalid, never read the secret from a query string.
- Batching/limits: default to all active sources and up to 5 valid articles per source when the request body omits `sourceNames`/`limitPerSource`; respect explicit values when given.
- Console logging (§9): log scrape started, selected sources, per-source start, homepage fetched, candidates found, candidates rejected (with reasons), duplicates skipped, detail pages scraped, articles inserted, articles rejected (with reasons), per-source errors, and scrape completed/failed — plus the final summary object.
- Types: explicit TypeScript types for pipeline results, no `any`.

## Security requirements

- `SUPABASE_SERVICE_ROLE_KEY`, `OXY_WSA_USERNAME`/`OXY_WSA_PASSWORD`, and `BIASLY_ADMIN_SECRET` are read only in server-only modules (`lib/oxylabs/client.ts`, `lib/supabase/service-client.ts`, the route handler) — never imported by client components, never sent to the browser.
- `app/api/scrape/route.ts` must 401 on a missing/incorrect `x-biasly-admin-secret` header before doing any work (no Oxylabs calls, no DB reads) on an unauthenticated request.
- Validate the optional request body with zod; reject malformed input with `400` rather than throwing.

## Acceptance criteria

- `POST /api/scrape` without the admin-secret header returns `401` and performs no scraping.
- `POST /api/scrape` with a valid header, no body, and Reuters as the only active source: fetches the Reuters homepage via Oxylabs, extracts candidate links, filters out non-article/category URLs, dedupes against existing `articles.original_url`, scrapes up to 5 detail pages, validates each, and inserts only the ones that pass the content gate.
- Response JSON matches the §9 summary shape: `status`, sources checked, candidates found/rejected, duplicates skipped, detail pages scraped, articles inserted/rejected/failed, total duration, and rejection reasons grouped by count.
- Running the route twice in a row does not insert duplicate rows for the same `original_url`.
- No article is ever saved without a non-null `image_url` and `published_at`.
- `npm run typecheck` and `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` only if it turns out route/config changes warrant it (thin route handler + server-only libs shouldn't, but will run if anything looks build-sensitive).

## Manual test steps (after implementation)

1. Fill in real Oxylabs credentials in `.env.local` (`OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`) and pick a value for `BIASLY_ADMIN_SECRET`.
2. Start the dev server and keep its terminal visible — scrape progress logs there:
   ```bash
   npm run dev
   ```
3. Confirm the Reuters source row exists (done automatically as part of this implementation, but to double check):
   ```bash
   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sources?select=*" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```
4. Trigger a scrape (all active sources, default limit of 5):
   ```bash
   curl -X POST http://localhost:3000/api/scrape \
     -H "x-biasly-admin-secret: <your BIASLY_ADMIN_SECRET>" \
     -H "Content-Type: application/json"
   ```
5. Trigger a scrape with an explicit limit:
   ```bash
   curl -X POST http://localhost:3000/api/scrape \
     -H "x-biasly-admin-secret: <your BIASLY_ADMIN_SECRET>" \
     -H "Content-Type: application/json" \
     -d '{"sourceNames": ["Reuters"], "limitPerSource": 3}'
   ```
6. Confirm the `401` path:
   ```bash
   curl -i -X POST http://localhost:3000/api/scrape
   ```
   Expect `401` and no dev-server scrape logs.
7. Re-run step 4 immediately after a successful run and confirm the summary shows 0 newly inserted articles for URLs already scraped (duplicates skipped), not duplicate rows.
8. Spot-check inserted rows have `image_url` and `published_at` set:
   ```bash
   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/articles?select=title,image_url,published_at&order=scraped_at.desc&limit=5" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
   ```
   Note: articles won't appear on the homepage UI yet — that requires `analyzed_at` to be set, which happens in the (separate, not-yet-built) AI analysis step.
