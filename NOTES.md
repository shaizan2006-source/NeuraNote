# NOTES.md — Redesign decisions log

> Living memory for the Obsidian & Aurum redesign. Update at the end of every session.
> Companion files: `REDESIGN_MASTER_PROMPT.md` (spec), `PLAN.md` (stage tracker).

---

## Locked decisions (founder-approved)

- **Name:** AI Q&A experience = **Sage**, route `/sage`, `/ask-ai` becomes a permanent 308 redirect. Parent product stays Ask My Notes.
- **Palette:** **Obsidian & Aurum** — near-black base (`#08080A` family), platinum text, single champagne-gold accent (`#C8A45D` base), used sparingly. No violet, no cyan signature. Gold is never body text (AA contrast).
- **Hero:** lightweight 2D animated brand mark (breathing + cursor-parallax) on new Sage chat; extended `AIDustLayer` star-field as ambient. No WebGL.
- **Token values:** §7.1 of master prompt is the starting contract — final values to be tuned on `/styleguide` in Stage 1 and locked here.

## Stage 0 status (2026-06-11) — COMPLETE

- Harness built: `/styleguide` route, grep gate, Playwright screenshot script. Details + commands in `PLAN.md`.
- Grep gate is **baseline-aware**: current UI is full of legacy inline hex, so `scripts/grep-gate.baseline.json` records per-file hex counts (159 files, 2,299 hex); the gate fails only when a file's count *increases* or a *new* file introduces hex. Refresh baseline (`--update-baseline`) only at the end of an approved stage, after re-skinning reduces counts.
- No `package.json` changes were made (it already has uncommitted founder edits; harness scripts run via `node scripts/...` directly).
- Baseline screenshots: **32/32 captured, authenticated** as `test@example.com` (dev account from `scripts/setup-dev-accounts.mjs`) → `__screens__/stage-0-baseline/`.

### Pre-existing build breakage fixed during Stage 0 (the working tree did NOT build before)

All in founder's uncommitted WIP; minimal fixes applied so the harness could go green. **Left uncommitted** alongside the rest of the WIP:

1. `src/app/admin/metrics/page.js:266` — unescaped `>` in JSX text (`spend > $0` → `&gt;`); also fixed mojibake on the next line (`â‰¥` → `≥`). More mojibake exists elsewhere in that file's comments — cosmetic only.
2. `src/app/api/user/delete/route.js` + `src/app/api/user/export/route.js` — imported `createRouteHandlerClient` from `@supabase/auth-helpers-nextjs` (NOT installed; cookie-based auth can't work with this app's localStorage bearer tokens anyway). Switched to the standard `verifyAuth(req)` from `@/lib/serverAuth`. Delete-route signOut now revokes via `supabaseAdmin.auth.admin.signOut(token)`.
3. `src/lib/notifications/dispatcher.js` — added missing `sendNotification(userId, payload)` export (per-user ad-hoc push) that `api/cron/fsrs-due-reminder` imports.
4. `src/lib/notifications/dispatcher.js` + `src/lib/notifications/d6Push.js` — module-level `webpush.setVapidDetails()` crashed builds because `.env.local` has NO VAPID vars. Now guarded (warns, sends fail at call time). **Founder: add VAPID vars locally or to Vercel per `.env.example`.**
5. `src/components/focus/FocusAmbientBackground.tsx:54` — `removeEventListener` doesn't accept `{ passive: true }`.
6. `src/app/pyqs/page.js` + `src/app/pyqs/practice/page.js` — `useSearchParams()` without a `<Suspense>` boundary broke static generation. Wrapped (same pattern `ask-ai/page.js` already used).
7. `tsconfig.json` — `include: "**/*.ts(x)"` swept stray vendored dirs into type-checking (`src/next-app/` — a full scaffolded app with its own node_modules, partially committed; `src/ui-ux-pro-max-skill/`; `temp_superpowers/`). Narrowed include to `src/**` and excluded the vendored dirs. **Founder: `src/next-app/` and `src/ui-ux-pro-max-skill/` look accidental — decide whether to delete them.**

## Environment gotchas (do NOT relearn these the hard way)

1. **Supabase:** only `@supabase/supabase-js` installed → `createClient` only. NEVER `createBrowserClient` / `@supabase/ssr`.
2. **Icons:** `lucide-react` NOT installed → inline SVG components (pattern in `DashboardSidebar.jsx`).
3. **Puppeteer is NOT installed.** The old `scripts/capture-screenshots.mjs` (day-88, Product Hunt gallery) expects a manual puppeteer install. The redesign harness uses **`@playwright/test` 1.58.2** (already a devDependency) — `scripts/capture-route-screens.mjs`.
4. **Next 16:** `viewport`/`themeColor` must be `export const viewport` in `layout.js` (currently `themeColor: "#8B5CF6"` — changes to `#08080A` in Stage 1). Sentry via `withSentryConfig`; don't re-add `disableLogger`.
5. **Themes:** applied as `:root.theme-gradient|theme-dark|theme-light` classes by `ThemeContext.tsx` (`applyTheme`). `DEFAULT_THEME` lives in `src/types/theme`. Theme preference persists to localStorage `ask-my-notes:theme` + `user_profiles.theme_preference`.
6. **`AIDustLayer`** (`src/components/AIDust/AIDustLayer.tsx`, TSX) is mounted globally in `layout.js` — extend, don't reinvent (Stage 3 scopes it to Sage).
7. **JS + jsconfig:** `@/* → ./src/*`; a `tsconfig.json` exists for the few `.tsx` files. Keep alias working in both.
8. **playwright.config.js** auto-starts `npm run dev` for `tests/e2e` (webServer, `reuseExistingServer: true`, baseURL `http://localhost:3000`). The harness screenshot script expects the server already running and fails fast otherwise.
9. Server routes: `SUPABASE_SERVICE_ROLE_KEY`; client: anon key.

## Component inventory (grows per stage)

| Surface | Files |
| --- | --- |
| Tokens | `src/styles/variables.css` (3 theme classes; gradient = default purple/cyan) |
| Theme plumbing | `src/context/ThemeContext.tsx`, `src/types/theme`, `src/styles/theme-animation.css` |
| Root layout | `src/app/layout.js` (Geist Sans/Mono vars, ThemeProvider, AIDustLayer, PushInit, InstallPrompt, UtmCapture) |
| Styleguide | `src/app/styleguide/page.js` (Stage 0 harness — token swatches + component previews) |
| Dashboard | `src/app/dashboard/page.js`, `src/components/Dashboard/BentoGrid.jsx`, `src/components/dashboard/DashboardSidebar.jsx` (inline-SVG icon pattern), `components/dashboard/modes/` (5 time-of-day modes) |
| Idle effect | `src/components/AIDust/AIDustLayer.tsx` |
| Auth | `src/app/login/page.js`, `signup`, `forgot-password`, `reset-password` |

## Screenshot diff notes

- **stage-0-baseline:** captured from the current (pre-redesign) UI — purple/cyan gradient theme. Auth-gated routes captured as anonymous unless TEST_EMAIL/TEST_PASSWORD provided (they show the login redirect — noted per file in script output).

## Open questions for founder

- Final gold hue lock happens on `/styleguide` in Stage 1 (§10).
- Logo final art in Stage 2; bento arrangement proposal before Stage 6; landing hero direction before 8h.
