# News Details Page UI

## Goal

Implement the article detail page from `img/03-news-details-page.png`: a
two-column layout (article body + sticky-feeling sidebar) with a bias
distribution bar, article body, related stories, plus a sidebar with Bias
Analysis, AI Summary, and Source Breakdown cards, a newsletter CTA, and the
existing header/footer. Route: `app/article/[id]/page.tsx`, dynamic by the
same ids used in `lib/sample-articles.ts` so homepage cards can link into it.

## Skills read

Same as the prior two prompts — `ui-ux-pro-max:design-system` and
`.agents/skills/impeccable` (craft-floor) — no new skill guidance needed;
this reuses tokens and patterns already established.

## Existing code inspected

- `app/page.tsx`, `components/article-card.tsx`, `components/bias-meter.tsx`,
  `lib/sample-articles.ts` — the homepage built in the previous prompt.
  `BiasMeter` (non-`compact`) already renders exactly the "Bias Distribution"
  bar shown in the reference (`Left 20%` / `Center 31%` / `Right 49%`
  segments) — reused as-is, no changes needed.
- `components/layout/{utility-bar,site-header,site-footer}.tsx` — reused
  unchanged on this page.
- `app/globals.css` tokens (bias colors, radius, shadow, container) — reused,
  no new tokens needed.
- The reference article (id `"1"` in `SAMPLE_ARTICLES`) is the same Trump/Iran
  story already on the homepage grid, with matching 20/31/49 percentages and
  12 sources — confirms the two pages share one data source.

## Visual breakdown of the reference

- **Article column** (left, ~2/3 width): category · region line → H1 title
  (2 lines) → byline row (`By {author} | {date} | {readTime}` left, `Save`
  `Share` `•••` icon-buttons right) → hero image → small gray image caption
  → a bordered "Bias Distribution" box (heading + info icon, the full-size
  `BiasMeter`, "{N} sources" caption) → body paragraphs → hairline divider →
  "Related Stories" heading → 2-column grid of 6 horizontal cards (small
  square thumbnail left, category·region / title / date·readtime right).
- **Sidebar** (right, ~1/3 width), three stacked cards, each with a title +
  circular info-icon button header:
  - **Bias Analysis**: "Overall Bias" label, big bold colored `Right 49%`,
    "Based on 12 balanced sources" (blue text), divider, three label+percent+
    track-bar rows (Left/Center/Right, track fills to the percentage in the
    bias color), a methodology paragraph, "How We Analyze Bias" outline
    button (full width).
  - **AI Summary**: "Generated {date} · {readTime}" caption, 5-bullet list,
    "AI summaries can make mistakes." disclaimer, "Provide Feedback" outline
    button.
  - **Source Breakdown**: "{N} Total Sources" caption, the same three
    label+count+percent+track-bar rows, divider, "Top Sources"/"Bias"
    column headers, a list of source-name + colored bias-label rows, "View
    All Sources" outline button.
- **Newsletter band** (full width, below both columns): light gray rounded
  box, "Stay Informed. Stay Balanced." + subcopy on the left, email input +
  black "Subscribe" button on the right.
- Header/utility-bar/footer identical to the homepage.

## Decisions / assumptions

1. **Dynamic route, one bespoke article.** `app/article/[id]/page.tsx` looks
   up `id` in `SAMPLE_ARTICLES` (`notFound()` if missing — real 404, not a
   silent blank page) and merges in detail content from a new
   `lib/sample-article-details.ts`. Only id `"1"` gets hand-authored detail
   content matching the reference image exactly (byline, body paragraphs,
   AI summary bullets, 6 related stories, 8-source breakdown). Writing
   full unique bespoke "journalism" for the other 11 sample headlines is
   out of scope for a UI pass — see #2.
2. **Generic fallback for ids 2–12.** A `getArticleDetail(id)` helper
   returns the bespoke record for `"1"` and otherwise synthesizes one from
   the existing `SampleArticle` fields: a fixed 3-paragraph placeholder
   body (explicitly generic, not fabricated news), a fixed pool of 8 real
   outlet names with fixed bias labels (Fox News/Right, WSJ/Center,
   Reuters/Center, BBC/Center, CNN/Left, NYT/Center, WaPo/Center,
   Newsmax/Right — scaled to the article's existing `sourceCount` and
   L/C/R percentages), and up to 4 other `SAMPLE_ARTICLES` (excluding
   itself) reused as "Related Stories" so the section is never empty. This
   keeps every homepage card clickable without inventing 11 more fake news
   stories.
3. **Related-story cards are not links** in this pass (static, matching
   the reference which doesn't demonstrate their click behavior) — avoids
   building a second layer of nested detail-page plumbing for stories that
   only exist as teaser data. Easy to wrap in `Link` later.
4. **Homepage cards now link to `/article/[id]`** (title + image become a
   `Link`) — small, obviously-needed addition so the two pages connect.
5. **New shared components**: `components/stat-bar.tsx` (label + value +
   colored track-fill row, used 6× across the two sidebar bias breakdowns),
   `components/sidebar-card.tsx` (title + info-icon-button header + body,
   used 3×), `components/related-story-card.tsx` (horizontal teaser card,
   used 6×). The "Bias Distribution" box, byline action buttons, and
   newsletter band are single-use and stay inline in the page — no
   one-off component files for markup used once.
6. **Info-icon buttons** (the small circular `i` on each card header) are
   static/non-functional in this pass, same treatment as the homepage's
   utility-bar controls — no tooltip/modal system exists yet.
7. **Save / Share / •••** byline actions are static (no bookmarking,
   share-sheet, or menu wired up) — visual only, per the "minimal UI, no
   unrequested features" scope.

## Files likely to change

- `app/article/[id]/page.tsx` — new, the detail page.
- `lib/sample-article-details.ts` — new: bespoke record for id `"1"` +
  `getArticleDetail(id)` fallback generator.
- `components/stat-bar.tsx` — new.
- `components/sidebar-card.tsx` — new.
- `components/related-story-card.tsx` — new.
- `components/article-card.tsx` — wrap image/title in `Link` to
  `/article/${article.id}`.

## Implementation requirements

- Server component page; no client state needed here (no interactivity to
  wire up per the decisions above).
- No data fetching, no Supabase/Clerk/Oxylabs/AI imports (§5, §21) —
  everything from the two `lib/` sample files.
- No hardcoded hex — tokens/Tailwind utilities only, same as prior prompts.
- Layout: `grid grid-cols-1 gap-8 lg:grid-cols-3` inside `.container-biasly`,
  article `lg:col-span-2`, sidebar `lg:col-span-1`; sidebar stacks below the
  article on mobile/tablet (natural DOM order, no reordering needed).
- `StatBar` track uses `bg-surface`, fill uses the matching
  `bg-bias-{left,center,right}` token at the row's percentage width.
- Craft-floor: focus-visible rings on every button/link, ≥4.5:1 contrast for
  body/caption text, real shadow offset+blur on cards, body copy measure
  kept reasonable (not full 1280px width — constrain the article column's
  paragraph text), responsive at 375px with no horizontal scroll.

## Security requirements

None — no secrets, no server modules, static placeholder data only.

## Acceptance criteria

- Visually matches `img/03-news-details-page.png`'s structure at desktop
  width: two-column layout, Bias Distribution box, sidebar's three cards,
  newsletter band.
- `/article/1` renders the bespoke Trump/Iran content matching the reference
  (title, byline, body paragraphs, AI summary bullets, related stories,
  source breakdown).
- `/article/2` through `/article/12` render without error using the generic
  fallback (no blank sections, no crashes).
- An unknown id (e.g. `/article/does-not-exist`) triggers Next's `notFound()`
  (404), not a blank or broken page.
- Homepage cards' title/image link to their detail page.
- Responsive: single column at 375px, sidebar cards stack below the article,
  related-stories grid goes to 1 column.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/article/1` and compare against
   `img/03-news-details-page.png` at desktop width.
2. From `http://localhost:3000`, click a card's title/image and confirm it
   navigates to that article's detail page.
3. Visit `http://localhost:3000/article/5` (or any id 2–12) and confirm the
   generic fallback content renders cleanly (body paragraphs, sources,
   related stories from other sample articles).
4. Visit `http://localhost:3000/article/nope` and confirm a 404 page.
5. Resize to ~375px: confirm the sidebar stacks below the article, the
   related-stories grid goes single column, and nothing scrolls horizontally.
6. Tab through the byline actions, sidebar buttons, and related-story cards
   to confirm visible focus rings.
