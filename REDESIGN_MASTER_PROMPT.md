# MASTER PROMPT — Ask My Notes Full Frontend Redesign

> **Target executor:** Fable model, acting as a senior product engineer + design-systems lead.
> **Author:** Founder (shaizan2006). **Status:** Brand decisions locked; staged plan requires per-stage approval.
> This file is the single source of truth for the redesign. Read it fully before touching code.

---

## 0. OPERATING CONTRACT (read first — non-negotiable)

You are a **senior product engineer and design-systems lead**. Behave like one: opinionated, evidence-driven, no fluff. The product must look and feel like a **billion-dollar company** while staying **minimal and focus-first** — this is a study app; flashy UI that distracts from studying is a defect, not a feature.

**Five hard workflow rules:**

1. **Verification harness FIRST, implementation SECOND.** Do not write a single feature until Stage 0 (verification harness) exists and is green. Every later stage must be provable by that harness before it is called done.
2. **Staged plan, approved before long runs.** Work the stages in `PLAN.md`. Before starting any stage that involves more than ~30 minutes of edits, post the concrete sub-steps and **wait for founder approval**. Never chain multiple stages in one unattended run.
3. **Size every stage so a wrong assumption costs ONE stage.** Each stage is independently revertable. If a palette, name, or layout assumption is wrong, the blast radius is that stage only — never a cross-cutting rewrite. Prefer additive changes (new tokens, new components) over destructive edits until a stage is approved.
4. **File-based memory for anything multi-session.** Maintain `PLAN.md` (the plan + current stage + checkboxes), `NOTES.md` (decisions log, token values, gotchas, component inventory), and append design rules to the existing `CLAUDE.md`. Update them at the end of every work session. Assume your context will be wiped between sessions — these files are how you remember.
5. **Advisor duty.** You may add tweaks that make the product better. If a tweak is **minor** (spacing, copy, micro-interaction), just do it and log it in `NOTES.md`. If it is **major** (new dependency, new route, data-model change, anything that costs >1 stage to undo), **stop and ask the founder for approval** before doing it.

**Stop-and-ask triggers (always pause for sign-off):** adding any npm dependency, changing the database schema or any `/api/*` contract, deleting a route or feature, anything touching auth/payments behavior, or any change that can't be reverted inside its own stage.

---

## 1. PROJECT CONTEXT (facts you must not re-derive)

**Stack:** Next.js 16 App Router (`src/app/`), Turbopack dev. React 19 + React Compiler (`reactCompiler: true`). Supabase (auth + Postgres + pgvector). OpenAI for Q&A/OCR/embeddings. Tailwind present but most components use **inline-style objects** (`const styles = {...}`) and `framer-motion`. State via React Context (`DashboardContext.jsx`).

**Hard environment gotchas (already cost us hours — do NOT repeat):**
- **Supabase import:** only `@supabase/supabase-js` is installed. Use `createClient`, **never** `createBrowserClient`/`@supabase/ssr` (not installed).
- **Icons:** `lucide-react` is NOT installed. Use **inline SVG** components (see `DashboardSidebar.jsx` for the established pattern).
- **TypeScript:** project is mostly JS with a `jsconfig.json` (`@/* → ./src/*`). A `tsconfig.json` now exists for the few `.tsx` files (e.g. `AIDust/`). Keep `@/*` path alias working in both.
- **`viewport`/`themeColor`** must be a separate `export const viewport` in `layout.js`, never inside `metadata` (Next 16 warns otherwise).
- **Sentry:** `next.config.mjs` uses `withSentryConfig`; do not re-add the deprecated `disableLogger`.
- Server routes always use `SUPABASE_SERVICE_ROLE_KEY`; client uses the anon key.

**Routes that exist today** (`src/app/**/page.js`):
`/` (landing), `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/onboarding`, `/welcome-back`, `/dashboard`, `/ask-ai` (→ to be renamed **/sage**), `/chat`, `/call-tutor`, `/quiz/friday`, `/mock-test`, `/pyqs`, `/pyqs/[slug]`, `/pyqs/practice`, `/brain-map`, `/brain-map/share`, `/cohort`, `/pricing`, `/exam-transition`, `/post-exam`, `/trial/{decision,lapsed,success}`, `/admin/*`.

**Key existing surfaces to redesign:**
- `src/app/dashboard/page.js` → sidebar + `GreetingRow` + `BentoGrid`, with 5 time-of-day modes (`Morning/Slump/Night/Active/Standard` in `components/dashboard/modes/`).
- `src/components/Dashboard/BentoGrid.jsx` → study-mode 2-col grid: `AskAIHeroCard` (65%) + `CallTutorCard` (35%) | `FocusModeCard` (40%) + `QuizCard` (25%) + `ExamsCard` (35%); progress-mode → `ProgressLayout`.
- `src/components/dashboard/DashboardSidebar.jsx` → collapsible, `NAV_ITEMS = [Dashboard, Ask AI]`. Inline-SVG icon pattern lives here.
- `src/styles/variables.css` → theme tokens (`theme-gradient` default, `theme-dark`, `theme-light`) consumed via `ThemeContext` + `useTheme`.
- **Already exists:** `src/components/AIDust/AIDustLayer.tsx` — an idle-triggered particle ("star dust") canvas, wired in `layout.js`. The Grok-style idle effect is **partly built**; extend it, don't reinvent it.
- `src/app/login/page.js` → plain dark card, emoji logo, blue gradient button. Target: Grok-style split auth with the new custom logo.

---

## 2. BRAND DECISIONS (LOCKED — founder-approved)

These are decided. Do not re-litigate; build to them.

### 2.1 Naming
- The AI Q&A experience is named **Sage**. Route `/sage`. Page title "Sage — Ask My Notes". Product vocabulary: users "ask Sage", "a Sage session", "new Sage chat".
- Keep `/ask-ai` as a **permanent redirect → /sage** so existing links/bookmarks survive.
- Parent product remains **Ask My Notes**. "Sage" is the assistant persona inside it.

### 2.2 Visual language — **"Obsidian & Aurum"**
Premium near-black base, platinum text, a **single restrained champagne-gold accent**. **No violet. No cyan/teal as the signature** (both read as generic AI). Gold = achievement / gold-standard mastery / luxury — on-narrative and distinctive. Gold is used **sparingly** (key CTAs, focus rings, the AI "thinking" shimmer, hairline highlights), never as large fills.

### 2.3 Hero moment
New Sage chat shows a **lightweight 2D animated brand mark** at center: a "breathing" logo with subtle cursor-parallax/tilt. No WebGL, no heavy deps, mobile-safe. Plus the idle star-field (extended `AIDustLayer`) as ambient.

---

## 3. GOAL

Deliver a cohesive, premium-minimal redesign of the entire Ask My Notes frontend on the **Obsidian & Aurum** design system, such that:
- Every route shares one token-driven design language (premium black base, gold signature, platinum text).
- The dashboard has a **distinctive, branded bento layout** where every tile is a working entry point that routes to its upgraded feature page.
- **Sage** (renamed `/ask-ai`) is a flagship Q&A surface with an idle star-field and an animated 2D hero mark on new chat.
- Auth pages feel like a premium product (Grok-style split + ambient effect) and carry the new custom logo.
- A **custom Ask My Notes logo** (favicon → sidebar mark → hero mark) exists as a reusable SVG system.
- Nothing is left half-wired: every link, empty state, loading state, and mobile breakpoint is handled.
- The result is sellable — it should make a first-time visitor believe this is a funded, polished product.

---

## 4. CONSTRAINTS

- **Minimal & focus-first.** Motion is subtle and purposeful; never animate the study surface during reading. Respect `prefers-reduced-motion` everywhere (the existing `AIDustLayer` already does).
- **No new heavy dependencies without approval.** `framer-motion` is allowed (already used). No three.js/R3F, no UI kit, no icon library — continue the inline-SVG pattern.
- **Token-driven only.** All color/spacing/type/radius/shadow come from CSS variables defined once. No hard-coded hex in components after Stage 1 (except inside the token file and the logo SVG).
- **Don't break working behavior.** Auth, payments, the ask/streaming pipeline, tracking (streak/progress/weak-topics), and Supabase RLS patterns must keep working. Preserve all `/api/*` contracts.
- **Performance budget.** No layout-shift on load; keep the idle effect ≤ the current particle budget; lazy-load anything non-critical. Mobile (<768px) must be first-class — the sidebar already has a mobile drawer; honor it.
- **Accessibility.** AA contrast on all text against black (gold-on-black for body text fails contrast — gold is accent only, never body copy). Focus-visible rings (gold) on all interactive elements. Keyboard reachable.
- **Code style** (from `CLAUDE.md`): modify only what's needed, no full-file rewrites unless a file is being intentionally replaced; inline-style + framer-motion idiom; `@/*` imports.

---

## 5. NON-GOALS (explicitly out of scope unless founder asks)

- No backend/API/schema redesign. No new AI features or model changes.
- No light theme work (light mode stays "coming soon"); ship the premium dark/black as the single default.
- No WebGL/3D engine. No marketing-site rebuild beyond the landing page's visual alignment.
- No admin-panel visual polish beyond making it not-broken on the new tokens (admin is internal).
- No copywriting overhaul beyond surfaces being redesigned. No i18n.
- No payment/pricing logic changes (pricing *page* visuals are in scope; plan logic is not).

---

## 6. ACCEPTANCE CRITERIA (global — every stage inherits these)

A stage is **done** only when ALL hold, proven via the Stage 0 harness:
1. `npm run build` passes; dev server starts clean (no module-not-found, no Next metadata warnings).
2. No hard-coded colors introduced in components (grep gate — see harness). All visuals trace to tokens.
3. The route(s) in the stage render on desktop **and** mobile (<768px) with no overflow/CLS, screenshots captured before/after.
4. Every interactive element is keyboard-focusable with a visible gold focus ring; `prefers-reduced-motion` disables non-essential motion.
5. Every link/CTA on the touched surface navigates to a real, existing route (no dead `#` links).
6. `PLAN.md` checkbox ticked; `NOTES.md` updated with decisions + any gotchas; screenshots saved.
7. Founder visual sign-off recorded before moving to the next stage.

---

## 7. DESIGN SYSTEM SPEC — "Obsidian & Aurum"

Define these as the canonical tokens (replace `src/styles/variables.css` `:root` with a single premium-black theme; keep the class hook so theme switching still works, but default everything to this). **All values below are the starting contract — refine on `/styleguide`, then lock in `NOTES.md`.**

### 7.1 Color tokens
```
/* Base — premium near-black with a faint cool tint, layered elevation */
--bg-base:        #08080A;   /* app background */
--bg-elevated:    #0E0E11;   /* page sections */
--bg-surface:     #131317;   /* cards */
--bg-surface-2:   #1A1A1F;   /* nested / hover */
--bg-inset:       #050506;   /* wells, inputs */

/* Hairlines & dividers */
--border-hairline: rgba(255,255,255,0.06);
--border-strong:   rgba(255,255,255,0.12);

/* Text — platinum, never gold for body */
--text-primary:   #F5F5F4;   /* warm platinum white */
--text-secondary: #A1A1A6;
--text-tertiary:  #6B6B70;
--text-disabled:  #46464B;

/* Signature accent — champagne gold (sparing) */
--accent:         #C8A45D;   /* base gold */
--accent-bright:  #E4C77B;   /* hover / highlight */
--accent-dim:     #8A7233;   /* pressed / borders */
--accent-grad:    linear-gradient(135deg, #E4C77B 0%, #C8A45D 100%);
--accent-glow:    0 0 24px rgba(200,164,93,0.18);

/* Semantic (sparing, only for state) */
--success: #34D399;   /* emerald — correct / streak up */
--warning: #F5B544;
--error:   #F0584F;
--info:    #8AA0B4;   /* muted steel, NOT blue-bright */

/* AI signal — replace old cyan with a soft gold shimmer */
--ai-signal: #E4C77B;
```
> Tailwind users: map these to `theme.extend.colors` so utility classes and inline styles agree. Keep the `:root.theme-*` classes present for ThemeContext, but make the premium-black palette the active default.

### 7.2 Typography
- Keep Geist Sans (already loaded) for UI; Geist Mono for code/numbers (scores, timers).
- Scale (rem): 12 / 13 / 14 (body) / 16 / 20 / 24 / 32 / 44 (hero). Line-height 1.5 body, 1.15 headings.
- Weights: 400 body, 500 labels, 600 emphasis, 700 headings. Avoid 800+/black weights (feels shouty, not premium).
- Letter-spacing: -0.01em on headings ≥24px for a tighter, premium read.

### 7.3 Space / radius / shadow / motion
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Radius: 8 (inputs/chips), 12 (cards), 16 (modals/hero), 999 (pills/avatars).
- Elevation: shadows are **soft and dark**, not glowy — `0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.45)`. Gold glow (`--accent-glow`) ONLY on the primary CTA hover and the AI hero.
- Motion: durations 120–280ms, `ease-out` for enters, `ease-in` for exits (match existing framer variants). Hover scale ≤1.01. No bouncy spring on study surfaces.

### 7.4 Core components (build once in `/styleguide`, reuse everywhere)
Button (primary gold-grad / secondary outline / ghost), Card (surface + hairline), Input/Textarea (inset well + gold focus ring), Pill/Chip, Badge (incl. existing ConfidenceBadge restyled), Tooltip (reuse sidebar's), Skeleton (existing pulse, retinted), Modal/Drawer, EmptyState, Avatar, Nav item (reuse sidebar's), Toast (existing MilestoneToast retinted), SectionHeader. Each must read only from tokens.

---

## 8. LOGO SYSTEM (custom — premium, unique, on-brand)

**Concept direction (refine, don't treat as final art):** a monoline geometric mark that reads simultaneously as a **folded page/notebook corner** and an upward **spark/node** — "your notes that answer back." Single gold spark point at the apex on otherwise platinum/white strokes. Must work at 16px (favicon), 28px (sidebar), and as the large breathing hero. Provide it as a clean `<svg>` React component with `currentColor` strokes + one `--accent` spark, so it inherits theme.

**Deliverables:**
- `src/components/brand/Logo.jsx` — sizes `sm|md|lg`, optional wordmark "Ask My Notes" (Geist, -0.01em).
- `src/components/brand/SageMark.jsx` — the **animated 2D hero mark** for new Sage chat: idle "breathing" (scale 1↔1.02, opacity shimmer on the gold spark), cursor-parallax tilt (±6° max, disabled under reduced-motion / on touch). No deps beyond framer-motion.
- Favicon/PWA icons regenerated from the mark (replace `/icons/*`, `manifest.json` theme color → `#08080A`).

**Starter SVG (a concrete artifact to refine on `/styleguide`):**
```jsx
// strokes inherit currentColor (platinum); spark uses var(--accent)
<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <path d="M8 26V8a2 2 0 0 1 2-2h9l5 5v9" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M19 6v5h5" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M12 26l4-7 4 7" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="16" cy="13.5" r="1.6" fill="var(--accent)"/>
</svg>
```

---

## 9. STAGED PLAN (work top-to-bottom; one stage = one approval = one revert unit)

> Each stage lists: **Goal · Files · Acceptance · Blast radius if assumption wrong.** Post sub-steps and wait for approval before any stage's long run.

### Stage 0 — Verification harness (BUILD FIRST)
- **Goal:** make every later change provable.
- **Build:** (a) a `/styleguide` route rendering all tokens + core components on the black canvas; (b) a Playwright (or Puppeteer) screenshot script capturing each key route at desktop 1440px + mobile 390px into `__screens__/<stage>/`; (c) a grep gate script that fails if a component introduces a raw hex outside the token file/logo; (d) confirm `npm run build` + dev start are clean.
- **Acceptance:** harness runs green on the *current* UI and produces baseline screenshots.
- **Blast radius:** none (additive tooling only).

### Stage 1 — Design tokens + theme foundation
- **Goal:** install Obsidian & Aurum tokens as the active default.
- **Files:** `src/styles/variables.css`, Tailwind config color extend, `ThemeContext`/`useTheme` default, `manifest.json` theme color, `layout.js` `viewport.themeColor → #08080A`.
- **Acceptance:** `/styleguide` shows correct palette/type/spacing; every existing page still renders (may look transitional); no raw-hex regressions beyond known files.
- **Blast radius:** token file only; revert = restore one CSS file.

### Stage 2 — Brand identity (logo system)
- **Goal:** `Logo`, `SageMark`, favicons.
- **Files:** `src/components/brand/*`, `public/icons/*`, sidebar mark swap (`DashboardSidebar.jsx` ✦ → `<Logo/>`).
- **Acceptance:** mark renders crisp at 16/28/large on `/styleguide`; animated `SageMark` breathes + tilts and respects reduced-motion/touch.
- **Blast radius:** new components + icon assets.

### Stage 3 — Idle star-field on Sage
- **Goal:** extend existing `AIDustLayer` to a premium gold/platinum star-field, scoped to the Sage surface.
- **Files:** `src/components/AIDust/*` (retint via tokens, scope selectors), ensure it's mounted on Sage.
- **Acceptance:** idle triggers the effect on Sage; disabled on reduced-motion/low-end/mobile per existing guards; no perf regression.
- **Blast radius:** the AIDust component.

### Stage 4 — Rename ask-ai → Sage
- **Goal:** route + vocabulary rename with redirect.
- **Files:** move `src/app/ask-ai/` → `src/app/sage/`; add `redirects()` `/ask-ai → /sage` in `next.config.mjs`; update `NAV_ITEMS`, `AskAIHeroCard` link, page `<title>`, any hard links.
- **Acceptance:** `/sage` works, `/ask-ai` 308-redirects, nav highlights correctly, no broken imports.
- **Blast radius:** routing + nav strings.

### Stage 5 — Sage page redesign
- **Goal:** flagship Q&A surface.
- **Files:** `src/app/sage/page.js` + chat/input/answer components (`AnswerSection`, `DynamicFollowUps`, `ConfidenceBadge`, `AskInput` etc., retinted to tokens).
- **Acceptance:** new-chat hero shows `SageMark` centered; sending a question still streams an answer (pipeline intact); follow-ups, rating, export all work; premium-minimal look; mobile clean.
- **Blast radius:** Sage surface only.

### Stage 6 — Dashboard bento redesign
- **Goal:** a distinctive Ask-My-Notes bento where every tile routes to its feature.
- **Files:** `BentoGrid.jsx`, the 5 mode wrappers, the cards (`AskAIHeroCard`→Sage, `FocusModeCard`, `QuizCard`, `CallTutorCard`, `ExamsCard`), `GreetingRow`, sidebar nav (add the now-real destinations).
- **Acceptance:** new signature grid (not the current generic 2-col); each tile is a working entry point to its real route; time-modes still switch; progress mode intact; mobile stacks cleanly.
- **Blast radius:** dashboard composition + cards.

### Stage 7 — Auth pages (Grok-style + custom logo)
- **Goal:** premium split auth with ambient effect.
- **Files:** `login`, `signup`, `forgot-password`, `reset-password` pages.
- **Acceptance:** split layout (brand/ambient panel + form panel), new `<Logo/>`, gold focus rings; **email+password, Google OAuth, rate-limit, validation all still work** (do not touch `lib/auth` logic, only presentation).
- **Blast radius:** auth presentation only.

### Stage 8 — Per-feature page upgrades (sub-staged; one route-cluster per approval)
Upgrade each to the system, with real wiring, empty/loading/error states, mobile:
- 8a `/pyqs`, `/pyqs/[slug]`, `/pyqs/practice`
- 8b `/mock-test`, `/quiz/friday`
- 8c `/call-tutor`
- 8d `/brain-map`, `/brain-map/share`
- 8e `/cohort`
- 8f `/pricing` (visuals only — no plan logic)
- 8g `/onboarding`, `/welcome-back`, `/exam-transition`, `/post-exam`, `/trial/*`
- 8h `/` landing — align to the premium system; first-impression hero.
- **Acceptance (each):** route matches the system, all CTAs route correctly, states handled, mobile clean, screenshots diffed.
- **Blast radius:** one route-cluster per sub-stage.

### Stage 9 — Wire-up audit + polish
- **Goal:** nothing left behind.
- **Do:** crawl every route for dead links/CTAs; verify all dashboard tiles + sidebar items resolve; consistent empty/loading/error states; mobile pass; a11y pass (contrast, focus order, reduced-motion); perf pass (no CLS, lazy-load idle effect & heavy panels); admin pages not-broken on new tokens.
- **Acceptance:** full harness green across all routes; founder final sign-off.
- **Blast radius:** polish only.

---

## 10. DECISIONS REQUIRING FOUNDER SIGN-OFF (surface these as you reach them)

- Exact final gold hue + how sparingly it's applied (lock on `/styleguide` in Stage 1).
- Final logo art (Stage 2) — the starter SVG is a direction, not final.
- The dashboard bento's specific tile arrangement (Stage 6) — propose 1–2 layouts with ASCII/preview before building.
- Landing page hero direction (Stage 8h) — highest marketing impact.
- Any tweak that trips a "stop-and-ask" trigger in §0.

---

## 11. FILE-BASED MEMORY (create/maintain these)

**`PLAN.md`** — the §9 stages as a checklist with current-stage marker and per-stage sub-steps once approved.

**`NOTES.md`** — living log:
- Locked decisions (name=Sage, palette=Obsidian & Aurum, hero=2D animated mark).
- Final token values once tuned.
- Component inventory + where each lives.
- Gotchas (the §1 environment list + any new ones discovered).
- Screenshot diff notes per stage.

**`CLAUDE.md`** — append a "DESIGN SYSTEM" section: tokens-only rule, inline-SVG icons, no-new-deps rule, Sage naming, `@supabase/supabase-js` `createClient` rule, so future sessions inherit them.

> At the end of every session: update all three, commit screenshots, leave the next stage's sub-steps drafted but unstarted.

---

## 12. KICKOFF INSTRUCTION (what to do right now)

1. Read this file + skim the §1 key files to ground yourself.
2. Create `PLAN.md`, `NOTES.md`, and the `CLAUDE.md` design section.
3. Build **Stage 0 (verification harness)** only. Produce baseline screenshots of the current UI.
4. Then **stop** and post Stage 1's concrete sub-steps for founder approval. Do not proceed past Stage 0 unattended.
