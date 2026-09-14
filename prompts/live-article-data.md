# Wire real Supabase data into the homepage and article details page

## Goal

Replace the hardcoded sample data (`lib/sample-articles.ts`, `lib/sample-article-details.ts`) on the homepage and article details page with the real, AI-analyzed articles now sitting in Supabase (16 analyzed Reuters articles). Card and details-page fields must match AGENTS.md §19's required display fields exactly. UI must display stored data only (§5) — no scraping/analysis triggers in these pages.

## Skills read

None of the frontend taste/polish skills (`design-taste-frontend`, `impeccable`, `apple-design`, `ui-ux-pro-max`) apply here — this task doesn't introduce new visual design or polish; it rewires already-designed, already-styled components to a real data source and removes the couple of sections built around a data model the real schema doesn't have. No new layout, spacing, typography, or motion decisions are being made.

## Existing code inspected

- `app/page.tsx` — Client-agnostic Server Component rendering `SAMPLE_ARTICLES` through `ArticleCard`.
- `app/article/[id]/page.tsx` — looks up the sample article by id, merges in `getArticleDetail()` mock content, renders a 2-column layout: main article body + Related Stories, and a sidebar with Bias Analysis / AI Summary / Source Breakdown cards.
- `lib/sample-articles.ts`, `lib/sample-article-details.ts` — **the mock data's own comments already say this**: *"It will be replaced with real scraped and AI-analyzed article text once the Supabase pipeline is wired up"* and *"topSources"/"relatedStories" are illustrative only"*. This confirms the intended real-data mapping and that the multi-source aggregation concepts were always placeholders, not a designed feature.
- `lib/supabase/queries/articles.ts` — `getArticles({limit, offset})` and `getArticleById(id)` already exist, already query only `analyzed_at IS NOT NULL` rows via the public client, and already return the exact shape needed: `ArticleWithAnalysis` = article row + `source` (full `SourceRow`) + `analysis` (full `AnalysisRow`, i.e. every §19 field: summary, sentiment_score/label, bias_score/label, left/center/right_percentage, confidence, framing_notes, loaded_terms, disclaimer, model). **No new query code is needed.**
- `components/article-card.tsx`, `components/bias-meter.tsx`, `components/stat-bar.tsx`, `components/sidebar-card.tsx` — all data-shape-agnostic already (take primitives/percentages), reusable as-is.
- `components/related-story-card.tsx` — only consumer is the mock `relatedStories` list; becomes dead code once that's removed.
- `components/ui/badge.tsx` — has `left`/`center`/`right` variants already; no `mixed`/`unclear` variant exists (not currently used anywhere).
- `next.config.ts` — `images.remotePatterns` only allows `images.unsplash.com`. Real article images are `https://www.reuters.com/resizer/v2/...` — **`next/image` will throw at request time without adding this host.**
- `app/layout.tsx` — not affected.

## Decisions / assumptions

- **"Top Sources" / "Source Breakdown" sidebar card is removed, not adapted.** The real pipeline analyzes one article from one source at a time — there's no multi-outlet clustering ("62 sources covered this story") anywhere in the schema or AGENTS.md. This was always mock-only scaffolding (confirmed by the sample file's own comments), not a real feature being deferred.
- **"Related Stories" section is removed for now, not adapted.** AGENTS.md §20 explicitly plans a real "Related Articles" section once pgvector embeddings exist, and explicitly says *"Do not show the section when the current article has no embedding."* Since no article has an embedding yet (§20 isn't built), the correct current state is to not show this section at all — it comes back for real once that prompt is implemented.
- **"AI Summary" sidebar card becomes "AI Analysis"**, showing the real `summary` paragraph, `framing_notes`, `loaded_terms` (as small tag chips), and the `disclaimer` — replacing the fake bulleted "AI summary" and its fake `generatedAt`/`readTime`, matching §19's required detail-page fields (summary, framing notes, loaded terms, disclaimer) that the mock never actually rendered.
- **Card and details-page top metadata become "source name · published date"**, replacing the mock's "category · region" (no such fields exist) and the details page's "By {author} | {date} | {readTime}" (no author or read-time is scraped or generated). Image captions are dropped (no caption data exists).
- **Cards gain a visible AI-estimated framing-label badge and a sentiment/confidence line** — §19 requires cards to show the framing label, sentiment label, and confidence, none of which the mock card actually displayed (it only showed the raw bias-percentage bar). `left`/`center`/`right` bias labels use the existing badge variants; `mixed`/`unclear` use a new neutral `Badge` variant (reusing existing tokens, no new colors).
- **"Overall Bias" in the details-page sidebar uses the AI's own `bias_label`** (which can be `mixed`/`unclear`) instead of recomputing a dominant side from percentages — the mock's `getDominantBias()` can't represent those two states and the real pipeline already made this judgment call.
- Now-unused files are deleted rather than left as dead code: `lib/sample-articles.ts`, `lib/sample-article-details.ts`, `components/related-story-card.tsx`.
- `CategoryChips` stays exactly as-is (static, decorative, unrelated to article data) — building real category filtering isn't part of this task.

## Visual interpretation (for this data-wiring change)

- No new layout, spacing, color, or typography decisions — every component keeps its current visual style and class names.
- Removing the "Source Breakdown" sidebar card leaves 2 sidebar cards (Bias Analysis, AI Analysis) instead of 3; the existing `flex flex-col gap-6` sidebar stack handles this with no layout fix needed.
- Removing "Related Stories" leaves the article body's `<hr>` divider before it also removed, so the main column ends cleanly after body paragraphs, directly into the existing newsletter CTA band lower on the page — no dangling empty section.
- Card bottom row goes from "{N} sources" to a small `Badge` (framing label) plus a line of sentiment label + confidence percentage, in the same footer position/spacing the source count occupied.
- Responsive behavior is unchanged (same grid/flex classes throughout).

## Files likely to change

- `next.config.ts` — add `www.reuters.com` to `images.remotePatterns` (required for images to load at all).
- `lib/utils.ts` — add a small `formatDate(iso: string)` helper (e.g. "Sep 13, 2026") shared by the card and details page.
- `components/article-card.tsx` — accept `ArticleWithAnalysis` instead of `SampleArticle`; render source/date, bias badge, sentiment+confidence line.
- `components/ui/badge.tsx` — add a `neutral` variant for `mixed`/`unclear` framing labels.
- `app/page.tsx` — Server Component, `await getArticles()`, render real cards, minimal empty state if zero analyzed articles exist.
- `app/article/[id]/page.tsx` — `await getArticleById(id)`, `notFound()` if null; remove Source Breakdown and Related Stories sections; repurpose AI Summary → AI Analysis with real fields; adjust header metadata and Bias Analysis card as described above.

Deleted:
- `lib/sample-articles.ts`
- `lib/sample-article-details.ts`
- `components/related-story-card.tsx`

## Implementation requirements

- UI reads only via the existing `getArticles`/`getArticleById` public-client queries — no direct Supabase calls from components, no scrape/analyze triggers anywhere in these pages (§5).
- Article cards show: title, source, image, published date, sentiment label, AI-estimated framing label, left/center/right percentages, confidence when available (§19).
- Details page shows: full summary, sentiment, framing percentages, confidence, framing notes, loaded terms, and disclaimer (§19), clearly presented as AI-estimated, not objective fact.
- No fabricated data anywhere (no invented author, read time, source count, or related articles).
- `next/image` must not error on real article images (`next.config.ts` fix).
- Keep existing `auth.protect()` gate on the details page as-is.

## Security requirements

- No new server actions or API calls are introduced; this is read-only Server Component rendering of already-fetched, already-service-validated data. No secrets touched.

## Acceptance criteria

- Homepage renders the 16 real analyzed Reuters articles (title, image, source, date, framing badge, sentiment+confidence) with no console/runtime image-host errors.
- Clicking a card opens `/article/[id]` showing that article's real summary, sentiment, bias percentages + label, confidence, framing notes, loaded terms, and disclaimer — no mock "Top Sources" or "Related Stories" sections present.
- No remaining imports of the deleted sample-data files or `RelatedStoryCard` anywhere in the codebase.
- `npm run typecheck` and `npm run lint` pass; `npm run build` succeeds (route/page structure and `next.config.ts` changed).

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Manual test steps (after implementation)

1. `npm run dev` (or reuse the already-running dev server).
2. Visit `http://localhost:3000` — confirm the grid shows real Reuters articles with working images, a framing-label badge, and a sentiment/confidence line.
3. Click into any article — confirm the details page shows the real summary, bias distribution + label (including `mixed`/`unclear` styling if any article landed there), confidence, framing notes, loaded terms, and the disclaimer text, and that there is no "Source Breakdown" or "Related Stories" section.
4. Confirm no Next.js image-host or hydration errors appear in the terminal or browser console.
