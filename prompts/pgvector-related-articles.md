# pgvector embeddings + Related Articles section

## Goal

Implement AGENTS.md §20: enable pgvector, add an `embedding vector(1536)` column to `article_analyses`, update `/api/analyze` to also generate and save an OpenAI embedding per article, and add a Related Articles section to the news details page using cosine-similarity search — hidden when the current article has no embedding.

## Skills read

- `.agents/skills/supabase` (explicitly requested). Per its core principle #1, fetched current docs instead of relying on memory:
  - `supabase.com/docs/guides/ai/vector-columns` — extension enable syntax, `vector(n)` column type, confirms embeddings are inserted/read via supabase-js as **plain JS `number[]`** (not a special type).
  - `supabase.com/docs/guides/ai/vector-indexes/ivf-indexes` — exact IVFFlat syntax: `create index on t using ivfflat (col vector_cosine_ops) with (lists = N)`.
  - `supabase.com/docs/guides/ai/examples/nextjs-vector-search` — confirms similarity search over a dynamic query vector requires a **Postgres function called via `.rpc()`**, not the plain PostgREST query builder — `ORDER BY embedding <=> $param` isn't expressible through `.order()`/`.filter()`.
  - Re-confirmed the joined-table filter gotcha and the "views/functions bypass RLS, prefer SECURITY INVOKER" guidance from the security checklist — the new function is plain `SECURITY INVOKER` (default), since the service-role caller already has full DB access at the connection level; no privilege escalation is needed or added.
- `.agents/skills/ai-sdk` — checked the version-matched embedding docs (`node_modules/ai/docs/07-reference/01-ai-sdk-core/05-embed.mdx`, `node_modules/@ai-sdk/openai/docs/03-openai.mdx` § Embedding Models): `embed({ model: openai.embedding('text-embedding-3-small'), value })` returns `{ embedding: number[] }`. `text-embedding-3-small`'s default output is 1536-dimensional — matches AGENTS.md's column spec exactly, no `dimensions` override needed. `embed`/`embedMany` are already exported by the installed `ai` package; no new dependency required.

## Existing code inspected

- `supabase/schema.sql` — confirms the append-ALTER-statements-below pattern already used for this project's schema evolution.
- `lib/supabase/types.ts` — `article_analyses` Row/Insert/Update need an `embedding` field; `Functions` is currently a `Record<string, never>` placeholder (added earlier to satisfy postgrest-js's `GenericSchema` structural typing) and needs the real `match_related_articles` signature to type `.rpc()` correctly.
- `lib/pipeline/analyze.ts`, `lib/supabase/queries/pending-articles.ts`, `lib/supabase/queries/pipeline-analyses.ts` — the existing pending-detection/orchestrator from the AI-analysis prompt. Confirmed the current `getPendingArticles` only checks "does an `article_analyses` row exist" — it does **not** yet handle "row exists but `embedding IS NULL`", which §20 explicitly requires as a backfill case (relevant here since all 16 existing analyzed articles predate this column and will start out with `embedding = NULL`).
- `lib/supabase/queries/articles.ts` — `getArticleById` already embeds the full `article_analyses` row via `analysis:article_analyses(*)`, so once `embedding` is added to the Row type, it's already available on `article.analysis.embedding` with no query change needed for the "hide section if no embedding" check.
- `app/article/[id]/page.tsx` — current layout after the last prompt: main column ends after body paragraphs, sidebar has Bias Analysis + AI Analysis cards. `components/related-story-card.tsx` was deleted in that same prompt (it was mock-data-only) — a new, real-data version is needed here.
- No Supabase CLI/MCP is linked in this project (confirmed in an earlier prompt) — I cannot execute DDL (`CREATE EXTENSION`, `ALTER TABLE ADD COLUMN`, `CREATE INDEX`, `CREATE FUNCTION`) myself; per this project's established pattern (§7, §20), this SQL is provided for you to run once in the Supabase Dashboard → SQL Editor, same as every prior schema change.

## Decisions / assumptions

- **Embeddings are generated from `analysis.summary`**, not raw `raw_text`: shorter (cheaper), already cleaned/normalized by the LLM step, and — critically — it's the one piece of text available in *both* code paths below (a fresh analysis has just produced it; a backfill only has the already-saved summary, not a re-fetch of the article body).
- **Pending detection now has two cases**, both driven by the same LEFT-JOIN-style query (§20's explicit instruction): (a) no `article_analyses` row → run full analysis **and** embedding, insert everything together, then set `analyzed_at`; (b) row exists but `embedding IS NULL` → generate **only** the embedding from the existing `summary` and `UPDATE` it in place — no LLM re-analysis, no `analyzed_at` change (it's already set from the original analysis).
- **`getRelatedArticles` uses the service-role client**, per §20's explicit wording ("using the service role client") — even though it's called from a Server Component at render time, same as every other pipeline read in this codebase. The service-role key never leaves the server (Server Components execute server-side only), so this doesn't violate the "never expose service role key to browser" rule.
- **New Postgres function `match_related_articles(current_article_id, query_embedding, match_count default 5)`** does the join+filter+order+limit from §20 in one `SECURITY INVOKER` SQL function (required because dynamic vector-distance ordering isn't expressible through the plain PostgREST query builder). Returns just enough fields to render a related-article card: id, title, image_url, published_at, source name, bias_label, sentiment_label.
- **IVFFlat `lists = 100`** (the docs' own default example) — fine at any table size; recall/speed tuning is a later concern, not something to over-engineer for a 16-row table today.
- A new `components/related-article-card.tsx` replaces the deleted mock `related-story-card.tsx`, same visual footprint (thumbnail + title + meta line), now driven by real fields (source name + bias badge instead of category/region).
- Retry policy for embedding generation mirrors the existing analysis retry (1 retry, then mark failed via the same `failedIds`/circuit-breaker machinery already in `lib/pipeline/analyze.ts` — no new failure-handling design needed).

## Files likely to change

New:
- `lib/ai/embed-article.ts` — `generateEmbedding(text: string): Promise<number[]>` via `embed()`.
- `components/related-article-card.tsx` — small presentational card for one related article.

Changed:
- `supabase/schema.sql` — append the pgvector section (extension, column, index, function) as a clearly-marked manual-SQL block, consistent with existing ALTER-statement precedent.
- `lib/supabase/types.ts` — add `embedding: number[] | null` to `article_analyses` Row/Insert/Update; replace the `Functions: Record<string, never>` placeholder with the real `match_related_articles` signature.
- `lib/supabase/queries/pending-articles.ts` — return which of the two pending cases each article is in (needs-full-analysis vs. needs-embedding-only), including the existing `summary` for the backfill case.
- `lib/supabase/queries/pipeline-analyses.ts` — add `updateAnalysisEmbedding(articleId, embedding)` for the backfill path; extend the full-insert path to include `embedding`.
- `lib/pipeline/analyze.ts` — branch per pending case; add an `embeddingsBackfilled` counter to the run summary alongside the existing ones.
- `lib/pipeline/types.ts` — add `embeddingsBackfilled` to `AnalysisRunSummary`.
- `lib/supabase/queries/articles.ts` — add `getRelatedArticles(articleId, embedding)`.
- `app/article/[id]/page.tsx` — render a "Related Articles" section (up to 5) when `article.analysis.embedding` is present; omit entirely otherwise.

## Visual interpretation

- Related Articles section sits where the mock's "Related Stories" section used to be — main column, after body paragraphs, own `<h2>` heading, a responsive `grid-cols-1 sm:grid-cols-2` grid of cards, same spacing (`mt-6`/`gap-4`) as the rest of the page.
- Each card: same footprint as the old `RelatedStoryCard` (small `size-20` thumbnail + text stack), but the meta line becomes "{source name} · {formatted published date}" and a small bias-label `Badge` (reusing the existing left/center/right/neutral variants) replaces the old category/region line.
- Section is fully omitted (no heading, no empty grid) when the current article has no embedding — never shows a broken/empty state.
- No new colors, tokens, or layout patterns — everything reuses existing `Badge`, `formatDate`, and the card/border/shadow classes already established.

## Implementation requirements

- Manual SQL (provided to you to run once, Dashboard → SQL Editor, before testing):
  1. Enable the `vector` extension (Database → Extensions, or `create extension if not exists vector with schema extensions;`).
  2. `alter table article_analyses add column if not exists embedding vector(1536);`
  3. `create index if not exists article_analyses_embedding_idx on article_analyses using ivfflat (embedding vector_cosine_ops) with (lists = 100);`
  4. `create or replace function match_related_articles(...)` as described above.
- `/api/analyze` must, for every article it fully analyzes, also generate and save the embedding in the same `article_analyses` insert (one row write, not two).
- `/api/analyze` must also backfill embeddings for existing analyzed articles that have `embedding IS NULL`, without re-running the LLM analysis call, per the pending-detection change above.
- `getRelatedArticles` filters to `embedding is not null`, `analyzed_at is not null`, excludes the current article, orders by cosine distance, limits to 5 — all inside the SQL function, not reconstructed in JS.
- The details page must never call `getRelatedArticles` when `article.analysis.embedding` is null/absent, and must not render the section in that case.
- No `any` types; `Database["public"]["Functions"]` properly typed for `.rpc()` type safety.

## Security requirements

- No new secrets. `OPENAI_API_KEY` (embeddings) and `SUPABASE_SERVICE_ROLE_KEY` stay server-only, same as the existing analysis pipeline.
- `match_related_articles` is `SECURITY INVOKER` (the default) — no privilege escalation; it relies on the caller's own access (service role, which already bypasses RLS at the connection level).

## Acceptance criteria

- After you run the manual SQL and I re-run `POST /api/analyze`, all 16 existing articles get a backfilled embedding without duplicate LLM analysis calls (verified via the run summary's `embeddingsBackfilled` count and by confirming `article_analyses.summary`/`model` are unchanged for those rows).
- Any newly scraped-and-analyzed article gets its embedding saved as part of the same analysis run.
- The details page for an article with an embedding shows up to 5 real related articles (own bias badge, source, date); an article with no embedding shows no Related Articles section at all.
- `npm run typecheck` and `npm run lint` pass; `npm run build` succeeds.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Manual test steps (after implementation)

1. Run the 4 manual SQL statements above in the Supabase Dashboard → SQL Editor (I'll give you the exact final SQL block once implemented).
2. `curl -X POST http://localhost:3000/api/analyze -H "x-biasly-admin-secret: <secret>"` — confirm the summary shows `embeddingsBackfilled: 16` (or however many still need it) and `articlesAnalyzed: 0` for a repeat run with no new articles.
3. Visit an article's details page in the browser (signed in) and confirm a "Related Articles" section appears with up to 5 other real Reuters articles.
4. Spot-check via SQL that `article_analyses.embedding` is populated (non-null, 1536 floats) for existing rows.
