# Homepage UI — Bias Lens

## Goal

Implement the home page pixel-close to `img/02-homepage.png`: dark utility
bar, header with logo/nav/auth buttons, scrollable category chip row, a
"Top News" grid of article cards (image, category, title, bias meter, source
count), and a dark footer. Brand name is **Bias Lens** (not "biasly" — the
reference screenshot's brand text is replaced everywhere with Bias Lens).

This supersedes `prompts/design-system-foundation.md` (never approved/built)
— its token work (colors, type scale, radius, shadows, Poppins, shadcn-style
primitives) is folded into this prompt as a prerequisite, since the homepage
can't be built without it.

## Skills read

- `ui-ux-pro-max:design-system` — token architecture, component token
  patterns (still the basis for the token layer).
- `.agents/skills/impeccable` — craft-floor checklist (contrast, states,
  responsive composition, real shadows) applied while building.

## Existing code inspected

- `app/page.tsx` — currently `export default function Home() { return null }`
  (placeholder I added to unblock a 500 error; will be replaced entirely).
- `app/layout.tsx` — still Geist fonts, Create-Next-App metadata.
- `app/globals.css` — still only `--background`/`--foreground`, Arial
  fallback stack, no design tokens yet.
- No `components/`, `lib/`, or `components.json` — nothing from the earlier
  prompt was built.
- `img/02-homepage.png` — the reference screenshot for this task.

## Visual breakdown of the reference

- **Utility bar** (full-width, near-black `#171717`-ish bg, light gray
  text): "Browser Extension" + "Theme: Light Dark Auto" on the left;
  date + "Set Location" + globe-icon "International Edition ⌄" on the
  right. Static, non-functional in this pass.
- **Header** (white bg, hairline bottom border): hamburger icon (mobile
  only) · "Bias Lens" / "News" two-line logo lockup · nav (Home active +
  underlined, "For You" with a small red notification dot, Local,
  Blindspot in muted gray) · right side: black "Subscribe" button + white
  outlined "Login" button.
- **Category chips row**: horizontally scrollable pill chips (light gray
  `#F0F0F0` bg, dark text, trailing `+` icon) — World Cup, IPL, Social
  Media, Business & Markets, Health & Medicine, Soccer, Artificial
  Intelligence, Arsenal FC, Extreme Weather and Disasters — with a
  scroll-right chevron at the row's end.
- **"Top News" heading** — H1 scale, bold.
- **Article grid** — 3 columns desktop / 2 tablet / 1 mobile, 12 sample
  cards. Each card: image (rounded top corners, small circular semi-opaque
  "i" info button in the top-right corner of the image) → category ·
  region caption line → H3 title (2–3 lines) → BiasMeter (`L 20%` /
  `Center 31%` / `Right 49%` style segments, red/gray/blue, abbreviated
  "L" label in this compact size) → "{N} sources" caption.
- **Footer** (same near-black bg as utility bar): Bias Lens logo + tagline
  column; Company column (About, Careers, Press, Contact); Help column
  (Help Center, Guides, Privacy Policy, Terms of Service); Connect column
  (X, LinkedIn, Instagram, YouTube icon links). Divider, then
  "© 2026 Bias Lens. All rights reserved."

## Decisions / assumptions

1. **Placeholder data, not Supabase.** The `sources`/`articles`/
   `article_analyses` tables (§7) don't exist yet — no migration has run.
   I'll add a typed `lib/sample-articles.ts` with 12 sample entries shaped
   like the eventual `Article + AIAnalysis` join, clearly commented as
   placeholder data to be swapped for a real Supabase query in a follow-up
   prompt once the schema/pipeline exists. `app/page.tsx` stays a server
   component reading from this local constant — no client-side fetching.
2. **"{N} sources" has no home in the current schema.** §7's article model
   is one row per article, not a clustered "story" with a source count.
   I'm building the card to match the reference visually (a `sourceCount`
   field on the placeholder type), but flagging that wiring this to real
   data later needs either a schema addition (story clustering) or
   swapping this element for the brand board's original meta row
   (published date / read time) — a decision for the Supabase-wiring
   prompt, not this one.
3. **Utility bar controls are static.** Theme toggle, "Set Location", and
   "International Edition" render as shown but do nothing — no theming or
   localization system exists yet, and neither is in AGENTS.md §1's scope.
4. **Mobile nav is minimally functional**, not just decorative: the
   hamburger toggles a simple client-side dropdown with the same nav +
   auth links, so it's not a dead affordance on small screens.
5. **Footer/nav links are `href="#"` placeholders** (About, Careers, Help
   Center, etc.) — no such routes exist; real hrefs come later if those
   pages get built.
6. **Tokens** — same palette/scale as the earlier prompt (still accurate,
   cross-checked against the screenshot): primitive → semantic → component
   CSS variables in `app/globals.css` via Tailwind v4's `@theme inline`
   (no `tailwind.config.ts`), Poppins via `next/font/google`, hand-authored
   shadcn-style primitives (`components.json`, `lib/utils.ts`, CVA-based
   `components/ui/button.tsx` / `badge.tsx`) rather than the interactive
   `shadcn` CLI, `lucide-react` for icons (2px stroke matches the spec).
7. **Logo lockup**: "Bias Lens" (bold, larger) over "News" (regular,
   smaller, muted) — same two-line construction as the reference's
   "biasly / News", just re-worded.

## Files likely to change

- `app/layout.tsx` — Poppins fonts, updated metadata (title "Bias Lens",
  description "Balanced news coverage, powered by AI.").
- `app/globals.css` — full token system (colors, radius, shadows,
  container, type scale utilities).
- `app/page.tsx` — full rewrite: assembles the sections below.
- `package.json` — add `lucide-react`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `@radix-ui/react-slot`.
- `components.json`, `lib/utils.ts` — new.
- `components/ui/button.tsx`, `components/ui/badge.tsx` — new primitives.
- `components/logo.tsx` — Bias Lens wordmark (size prop for header vs
  footer, light/dark color prop).
- `components/chip.tsx` — category chip with trailing `+`.
- `components/bias-meter.tsx` — segmented bar, `compact` size for cards.
- `components/article-card.tsx` — the homepage card variant described above.
- `components/layout/utility-bar.tsx`, `site-header.tsx`,
  `category-chips.tsx`, `site-footer.tsx` — new, composed in `app/page.tsx`.
- `lib/sample-articles.ts` — new, typed placeholder data (12 entries).

## Implementation requirements

- Server component page (`app/page.tsx`); only the mobile-menu toggle and
  the chip row's scroll behavior need `"use client"` (isolated to their own
  small components — keep the page itself server-rendered per §5's UI
  layering).
- No data fetching, no Supabase/Clerk/Oxylabs/AI imports anywhere in this
  pass (§5, §21) — everything reads from `lib/sample-articles.ts`.
- No hardcoded hex in components — tokens/Tailwind utilities only.
- `BiasMeter` segment widths are proportional to the three percentages;
  `compact` variant abbreviates "Left" → "L", keeps "Center"/"Right" in full
  (matches the reference).
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, 24px gap, inside the
  1280px container.
- Chip row: `overflow-x-auto` with a visible scroll affordance (chevron
  button that scrolls the row, or native scroll — decide during build,
  should feel usable via touch/trackpad without the chevron alone).
- Craft-floor: focus-visible rings on every interactive element (nav
  links, buttons, chips, hamburger, chevron), contrast ≥4.5:1 for body/caption
  text on both white and near-black surfaces, real shadow offset+blur on
  cards (no flat halos), responsive at 375px with no horizontal scroll
  except the intentionally-scrollable chip row.

## Security requirements

None — no secrets, no server modules, no external calls. Pure presentational
components and static placeholder data.

## Acceptance criteria

- Visually matches `img/02-homepage.png`'s layout, spacing, and color use
  at desktop width (utility bar, header, chips, 3-col grid, footer).
- All brand text reads "Bias Lens" (logo, `<title>`, footer copyright) —
  no "biasly" strings remain in rendered output.
- Responsive: 1 column at 375px, 2 at tablet, 3 at desktop; header collapses
  to hamburger + logo on mobile; no unintended horizontal scroll.
- Bias meter segments render correct proportional widths and colors for
  each of the 12 sample articles, summing visually to 100%.
- `npm run typecheck` and `npm run lint` pass with no new errors.
- `npm run build` succeeds.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Manual test steps

1. `npm run dev`, open `http://localhost:3000`.
2. Compare against `img/02-homepage.png` at desktop width (~1440px):
   utility bar, header, chip row, "Top News" grid, footer.
3. Resize to ~375px: confirm the header collapses to hamburger, the grid
   goes single-column, and the chip row still scrolls horizontally without
   the page scrolling horizontally.
4. Click the hamburger on mobile width and confirm the nav menu opens/closes.
5. Tab through the header and a card with the keyboard — confirm visible
   focus rings on nav links, buttons, and the chip "+" affordances.
6. Check one card's bias meter segment widths roughly match its
   left/center/right percentages.
