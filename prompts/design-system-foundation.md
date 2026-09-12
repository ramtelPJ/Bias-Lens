# Design System Foundation

## Goal

Implement the biasly design system from the attached UI reference board: brand
typography (Poppins), color tokens (primitive → semantic → component layers),
spacing/grid, shadows, radius, icons, and the core UI primitives shown on the
board (Button, Chip/Category, Bias Meter, Article Card) — as a reusable
token system + component library. No page is wired to live or placeholder
data in this pass; `app/page.tsx` stays untouched.

## Skills read

- `ui-ux-pro-max:design-system` — token architecture (primitive → semantic →
  component), component token patterns, Tailwind integration.
- `.agents/skills/impeccable` — craft-floor checklist (contrast, depth,
  spacing, type, states) applied while building the components.

## Existing code inspected

- `package.json` — Next 16.3.4, React 19.2.8, Tailwind v4 (`@tailwindcss/postcss`),
  no shadcn/ui, no icon library, no `components/` or `lib/` dirs yet.
- `app/layout.tsx` — loads Geist Sans/Mono via `next/font/google`, default
  Create-Next-App metadata.
- `app/globals.css` — Tailwind v4 CSS-first config (`@import "tailwindcss"` +
  `@theme inline`), only `--background`/`--foreground` tokens, no
  `tailwind.config.ts` (this project uses the v4 CSS-first pattern, not the
  v3 config-file pattern the design-system skill's reference examples show).
- `app/page.tsx` — currently empty (0 bytes).
- No `components.json`, no shadcn components, no icon package installed.

## Decisions / assumptions

1. **Tailwind v4 CSS-first tokens.** All tokens live in `app/globals.css` as
   `:root` CSS variables mapped through `@theme inline`, not a
   `tailwind.config.ts` (there isn't one, and v4 doesn't need one for this).
2. **Hand-authored shadcn-style primitives, not the shadcn CLI.** `npx
   shadcn@latest init` is interactive and would scaffold its own default
   palette (zinc/oklch) that we'd immediately overwrite. Instead: hand-write
   `components.json`, `lib/utils.ts` (`cn()` helper), and
   `components/ui/{button,card,badge}.tsx` in shadcn's own conventions
   (Radix `Slot` + `class-variance-authority` variants) but wired to our
   exact board palette. This keeps the project shadcn-compatible (future
   `shadcn add` commands will work) while matching the reference pixel-for-pixel.
3. **Fonts:** replace Geist Sans/Mono with Poppins (weights 400/500/600/700,
   `latin` subset) via `next/font/google`, matching the board's H1–H4/Body
   weight steps. Geist Mono is dropped (unused; no code/data display in
   scope yet).
4. **Icons:** install `lucide-react` (matches the board's "line style, 2px
   stroke, rounded caps" spec exactly — Lucide is 2px stroke with round
   linecap/linejoin by default) rather than hand-drawing an icon set.
5. **Spacing:** Tailwind v4's default spacing scale is already 4px-based
   (`1` = 4px … `16` = 64px), which matches the board's spacing system
   exactly. No custom `--space-*` tokens — use Tailwind's built-in scale and
   document the mapping in code comments only where non-obvious.
6. **Container/grid:** add a `--container-biasly: 1280px` theme token and use
   it for a `.container` utility (`max-width: 1280px; padding-inline: 24px`),
   12-column grid via Tailwind's native `grid-cols-12` + `gap-6` (24px).
7. **Colors** (hex from board, organized in three layers):
   - Primitive: `--color-black: #0D0D0F`, `--color-gray-600: #6B7280`,
     `--color-gray-100: #F6F6F6`, `--color-gray-50: #F0F0F0`,
     `--color-gray-200: #E5E7EB`, `--color-white: #FFFFFF`,
     `--color-red-700: #B42318`, `--color-blue-700: #1D4ED8`.
   - Semantic: `--color-foreground` (text primary), `--color-muted-foreground`
     (text secondary), `--color-surface`, `--color-background`,
     `--color-background-secondary`, `--color-border`, `--color-divider`,
     `--color-bias-left`, `--color-bias-center`, `--color-bias-right` (+
     matching `-foreground` pairs for on-color text contrast, e.g. white on
     red/blue, dark on light-gray center).
   - Component: button/chip/bias-meter/card tokens referencing the semantic
     layer (per `component-tokens.md` pattern), e.g. `--button-primary-bg`,
     `--chip-bg`, `--bias-meter-radius`.
8. **Radius:** `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`,
   `--radius-full: 9999px` (board's exact values).
9. **Shadows:** `--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)`,
   `--shadow-md: 0 4px 12px rgba(0,0,0,0.08)`,
   `--shadow-lg: 0 12px 24px rgba(0,0,0,0.12)` (board's exact values).
10. **Temporary QA route (needs your yes/no):** to visually verify the
    system in a browser (per impeccable's craft-floor — states must be
    checked on the real render, not assumed), I'd add a dev-only route at
    `app/style-guide/page.tsx` rendering every token and component state
    (button variants × states, chip variants, bias meter, the card example
    from the board). It's outside AGENTS.md §1's page list, so flagging it
    explicitly: **keep it** (easy to delete later, gives you something to
    look at) or **skip it** (I verify via typecheck/lint/build only, no
    visual route ships)? Defaulting to **keep it** unless you say otherwise
    in your approval reply — it's trivial to delete afterward and isn't
    linked from anywhere.

## Files likely to change

- `app/layout.tsx` — swap Geist → Poppins, update metadata.
- `app/globals.css` — full token rewrite (colors, type scale utilities,
  radius, shadows, container).
- `package.json` — add `lucide-react`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `@radix-ui/react-slot`.
- `components.json` — new, shadcn-compatible config.
- `lib/utils.ts` — new, `cn()` helper.
- `components/ui/button.tsx` — new, CVA variants: primary/secondary/text ×
  default/hover(handled by CSS `:hover`)/outline/disabled.
- `components/ui/card.tsx` — new, base card primitive.
- `components/ui/badge.tsx` — new, base badge primitive (chip builds on this).
- `components/chip.tsx` — new, category chip (default + with-icon + "more").
- `components/bias-meter.tsx` — new, three-segment left/center/right bar,
  takes `leftPercentage/centerPercentage/rightPercentage` props.
- `components/article-card.tsx` — new, matches the board's card example
  (image, category chips, title, description, bias meter, meta row).
- `app/style-guide/page.tsx` — new, temporary visual QA route (pending your
  confirmation above).

## Implementation requirements

- All components are pure/presentational: typed props only, no data
  fetching, no Supabase/Clerk/Oxylabs/AI imports (§5 — UI must display
  stored data only, must not mutate pipeline state; these primitives don't
  even reach that boundary yet).
- No hardcoded hex in component files — everything through CSS
  variables/Tailwind tokens (design-system skill's #1 best practice).
- `BiasMeter` renders left/center/right as proportional segment widths from
  the three percentage props; caller is responsible for ensuring they sum to
  100 (matches §19 framing rules — this is a display component, not where
  validation happens).
- Button `disabled` state uses `disabled:opacity-50 disabled:pointer-events-none`,
  not a separate disabled color token set, to stay consistent with standard
  shadcn/Radix conventions.
- Craft-floor checks to hold: contrast ≥4.5:1 for body/secondary text on all
  surfaces used (including on the red/blue bias segments), visible focus
  rings on all interactive elements (button, chip), real shadow
  offset+blur (no flat colored halos).

## Security requirements

None beyond standard — no secrets, no env vars, no server code touched. All
new files are client-safe presentational components.

## Acceptance criteria

- Poppins renders globally (verify via computed `font-family` in devtools).
- `app/globals.css` exposes usable Tailwind utilities for every token: e.g.
  `bg-surface`, `text-foreground`, `text-muted-foreground`, `bg-bias-left`,
  `bg-bias-center`, `bg-bias-right`, `rounded-sm/md/lg/full`,
  `shadow-sm/md/lg`.
- Button: 3 variants (primary/secondary/text) × 4 states render visually
  distinct and match the board (black primary default→darker hover, white
  secondary with border, blue text-only link, disabled = muted/50% opacity).
- Chip: pill shape, `#F0F0F0`-ish default background, optional trailing `+`
  icon variant, "More" variant with `+` icon — matches board spacing/radius.
- BiasMeter: three-segment bar with correct proportional widths and board
  colors/labels ("Left 25%", "Center 50%", "Right 25%" style), full-width
  0%/50%/100% scale labels underneath like the board.
- ArticleCard: reproduces the board's card layout — image (rounded, `shadow-sm`),
  category/region chips row, H3 title, body-medium description in
  `text-muted-foreground`, bias meter, meta row with clock+bookmark icons
  (lucide, `strokeWidth={2}`) and text.
- `npm run typecheck` and `npm run lint` pass with no new errors.
- `npm run build` succeeds (new route + font/layout changes affect the build).
- Responsive: card and style-guide route (if kept) don't overflow or
  horizontally scroll at 375px width.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (layout, globals.css, and a new route all affect the build)

## Manual test steps (after implementation)

1. `npm run dev`
2. If the style-guide route was kept: open `http://localhost:3000/style-guide`
   and visually compare against the reference board — typography scale,
   color swatches, button states (hover/disabled included), chips, bias
   meter, and the article card example.
3. Resize the browser to ~375px width and confirm no horizontal scroll and
   the card/components reflow sensibly.
4. Inspect a button/chip with devtools to confirm computed `font-family` is
   Poppins and focus-visible shows a ring when tabbing to it.
5. If the style-guide route was skipped: import `ArticleCard`/`Chip`/
   `BiasMeter`/`Button` ad hoc in any scratch file to eyeball render, or wait
   for the dedicated home-page prompt where they'll be wired to real data.
