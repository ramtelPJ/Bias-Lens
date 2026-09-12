# Clerk Authentication

## Goal

Add Clerk authentication to Biasly and gate the entire site behind sign-in: every page except the sign-in/sign-up flow requires a signed-in user. Replace the static "Login" control in the header with real Clerk auth UI (sign in/up when signed out, `UserButton` when signed in).

## Skills read

- `.agents/skills/clerk/SKILL.md` (router) → pointed to `clerk-setup` for a fresh install.
- `.agents/skills/clerk-setup/SKILL.md` — framework detection, `ClerkProvider` placement, `proxy.ts` naming for Next.js 16+, shadcn theme steps, common pitfalls table.
- Fetched current Clerk docs (WebFetch, since the skill instructs following live quickstart docs, not memorized APIs):
  - `nextjs/getting-started/quickstart` — confirms `proxy.ts` on Next.js 16+, `ClerkProvider` inside `<body>`.
  - `references/nextjs/clerk-middleware` — **`createRouteMatcher()` is deprecated.** Current guidance: `clerkMiddleware()` still must run (via `proxy.ts`) to populate auth context, but route-level allow/deny logic no longer belongs in middleware.
  - `guides/secure/authorization-checks` — current protection pattern is `await auth.protect()` called from `@clerk/nextjs/server`, as close to the resource as possible (in the page/route handler itself, not in a shared layout, since layouts don't re-render on client-side navigation).
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — confirms `proxy.ts` is the Next.js 16 replacement for `middleware.ts` (this project is on Next 16.3.4).

This is a deviation from the training-data-era "middleware + `createRouteMatcher`" pattern AGENTS.md warns about — implementing it that way would trigger a deprecation warning and isn't the currently recommended approach.

## Existing code inspected

- `package.json` — Next 16.3.4, React 19, no Clerk package installed, no auth of any kind.
- `app/layout.tsx` — root layout, no provider wrapping, Poppins font only.
- `app/page.tsx` — synchronous Home page, renders `SiteHeader`, `CategoryChips`, sample article cards, `SiteFooter`.
- `app/article/[id]/page.tsx` — already an async Server Component with `generateStaticParams` (statically prerendered at build time from `SAMPLE_ARTICLES`).
- `components/layout/site-header.tsx` — client component (`"use client"`) with a static `Button variant="secondary"` labeled "Login" (desktop + mobile nav) and a "Subscribe" button (unrelated, out of scope).
- `components.json` — shadcn/ui is configured (`new-york` style, `neutral` base color) → shadcn Clerk theme must be applied per the skill.
- No `middleware.ts`/`proxy.ts` exists yet. No `.env.example` exists yet. `.env.local` exists and is empty.
- `npm view` confirms `@clerk/nextjs@7.9.2` and `@clerk/ui@1.32.3` are current (not Core 2), so current-SDK patterns apply throughout.

## Decisions / assumptions (confirmed with user)

- **Revised after initial implementation**: the home page (`/`) is public — anyone can browse the news list without signing in. Only the article detail page (`/article/[id]`) requires a signed-in user; signed-out visitors there are redirected to `/sign-in`. `/sign-in` and `/sign-up` remain public. The header (`components/layout/site-header.tsx`) now renders both states via `<SignedIn>`/`<SignedOut>` since it's shown on the public home page too.
- **Real keys**: user will paste their own `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` into `.env.local` themselves (no `clerk` CLI is installed locally, so keys aren't auto-provisioned). Placeholders will be left in `.env.local` and documented in `.env.example`.
- Protection is implemented with `await auth.protect()` inside each top-level page (`app/page.tsx`, `app/article/[id]/page.tsx`), not via middleware route-matching — this matches Clerk's current recommendation and correctly re-runs on client-side navigation between pages (a shared-layout check would not).
- `proxy.ts` still runs `clerkMiddleware()` with Clerk's current recommended default matcher — required for `auth()`/`auth.protect()` to work at all, independent of the route-matching deprecation.
- `app/article/[id]/page.tsx` currently uses `generateStaticParams` for static prerendering; adding `auth.protect()` makes the page dynamic per-request (can't be statically prerendered while gated). This is an intended, necessary side effect of gating it — `generateStaticParams` becomes a no-op and can stay (harmless) or be removed; removing it is the cleaner choice since it no longer does anything.
- Header: since every page that renders `SiteHeader` is already behind the auth gate, the header will only ever render in the signed-in state in practice. Replace the "Login" button with `<UserButton />` (desktop + mobile). Leave "Subscribe" untouched (unrelated feature, out of scope).
- Sign-in/sign-up pages are minimal, centered, chrome-free (no `SiteHeader`/`SiteFooter`) — they must render without triggering the auth gate.
- Apply the shadcn theme to Clerk components per the skill, since `components.json` is present.

## Files likely to change

- `package.json` / `package-lock.json` — add `@clerk/nextjs`, `@clerk/ui`.
- `proxy.ts` (new, project root) — `clerkMiddleware()`.
- `app/layout.tsx` — wrap in `<ClerkProvider appearance={{ theme: shadcn }}>` inside `<body>`.
- `app/globals.css` — `@import '@clerk/ui/themes/shadcn.css';`.
- `app/page.tsx` — make async, add `await auth.protect()`.
- `app/article/[id]/page.tsx` — add `await auth.protect()`; drop `generateStaticParams`.
- `app/sign-in/[[...sign-in]]/page.tsx` (new) — `<SignIn />`.
- `app/sign-up/[[...sign-up]]/page.tsx` (new) — `<SignUp />`.
- `components/layout/site-header.tsx` — swap the "Login" button for `<UserButton />` (desktop + mobile nav).
- `.env.local` — add placeholder Clerk env vars (no real secrets committed; file is gitignored).
- `.env.example` (new) — document the Clerk vars (canonical list per AGENTS.md §21).

## Implementation requirements

- Use `@clerk/nextjs` (current, not `@clerk/clerk-react` naming).
- `proxy.ts`, not `middleware.ts` (Next.js 16 project).
- `ClerkProvider` placed inside `<body>`, not wrapping `<html>`.
- `auth.protect()` imported from `@clerk/nextjs/server`, called with `await` at the top of each protected page's Server Component body.
- No `createRouteMatcher` usage (deprecated).
- Env vars written to `.env.local` (placeholders) and documented in `.env.example`:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- Do not touch any API routes, Supabase, or scraping/analysis code — out of scope for this prompt.

## Visual interpretation (sign-in / sign-up pages)

- Full-height centered layout (`min-h-full flex items-center justify-center`), matching the app's existing off-white background and Poppins font — no new fonts/colors introduced.
- `Logo` component above the Clerk card for brand continuity.
- Clerk's own card chrome (via the shadcn appearance theme) provides the form styling — no custom form building.
- Responsive by default (Clerk's card is already mobile-friendly); verify at ~375px width doesn't overflow.
- No `SiteHeader`/`SiteFooter`/`UtilityBar`/`CategoryChips` on these two routes.

## Security requirements

- `CLERK_SECRET_KEY` never referenced from a client component or exposed to the browser.
- No Clerk secret committed to git (`.env.local` is already gitignored; `.env.example` gets placeholder values only, never real keys).
- Every existing page route is unreachable without a valid session (verified manually per test steps below).

## Acceptance criteria

- Visiting `/` or `/article/<id>` while signed out redirects to `/sign-in`.
- Signing in redirects back and renders the page normally.
- Signed-in state shows `UserButton` in the header (desktop and mobile); no more static "Login" button.
- `/sign-in` and `/sign-up` render without requiring auth and without infinite redirect loops.
- Clerk components visually match the shadcn `new-york`/neutral theme already in use.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (routes and root layout are changing)

## Exact manual test steps (after implementation)

1. Add real Clerk keys to `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```
2. `npm run dev`
3. Open `http://localhost:3000/` in an incognito window → expect a redirect to `/sign-in`.
4. Open `http://localhost:3000/article/<any-sample-id>` signed out → expect a redirect to `/sign-in`.
5. Sign up for a new account at `/sign-up`, or sign in at `/sign-in` → expect a redirect back to `/` and the homepage to render with `UserButton` visible in the header (desktop and, at narrow width, the mobile menu).
6. Click `UserButton` → confirm the Clerk account menu opens and "Sign out" works, after which `/` redirects to `/sign-in` again.
7. Resize to ~375px width and confirm `/sign-in` and `/sign-up` render without horizontal overflow.

Is this good to execute?
