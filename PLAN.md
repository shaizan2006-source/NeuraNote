# PLAN.md — Obsidian & Aurum Redesign

> Source of truth: `REDESIGN_MASTER_PROMPT.md` (§9 staged plan).
> One stage = one approval = one revert unit. Founder sign-off required before each stage's long run.

**Current stage: ✅ Stage 9 COMPLETE (harness-verified) 2026-06-27 — 9a–9h done. Whole-app Obsidian & Aurum redesign finished. ONE deferred item: authed-page visual screenshots, blocked by a pre-existing broken-signup infra bug (see NOTES). Baseline refreshed: 37 files / 513 hex (from 159 / 2299).**

---

## Stage checklist

- [x] **Stage 0 — Verification harness** — DONE 2026-06-11 (`05864ea`)
- [x] **Stage 1 — Design tokens + theme foundation** — DONE 2026-06-11 (adjusted gold `#D4AF6E` ramp; values locked in NOTES.md)
- [x] **Stage 2 — Brand identity (logo system)** — DONE 2026-06-12; **logo art §10 SIGNED OFF 2026-06-25** (mark refined to "Fused Spark" after critique panel found a stick-figure reading; icons/favicon regenerated)
- **Stage 3 ← NEXT (needs approval)**
- [x] **Stage 3 — Idle effect on Sage** — DONE 2026-06-12 (founder reopened §2.3: dust → **Constellation Notes**; allowlist-scoped to /ask-ai, /sage, /styleguide)
- [x] **Stage 4 — Rename ask-ai → Sage** — DONE 2026-06-12 (308 redirect, nav labels, title; /api/ask-ai contract untouched)
- [x] **Stage 5 — Sage page redesign** — DONE 2026-06-12 (SageMark hero, full token re-skin, ConfidenceBadge + DynamicFollowUps wired, SSE streaming bug fixed + live-verified)
- [x] **Stage 6 — Dashboard bento redesign** — DONE 2026-06-12 (founder picked **Option C — Constellation Grid**: tiles as star-nodes linked by a gold SVG underlay, Sage = "the spark" center; new PYQ Bank + Brain Map entry tiles; sidebar nav expanded)
- [x] **Stage 7 — Auth pages (Grok-style + custom logo)** — DONE 2026-06-25 (shared `AuthShell` split layout; login/signup/forgot/reset re-skinned; auth logic intact, probe-verified)
- [ ] **Stage 8 — Per-feature page upgrades** (8a–8h, one route-cluster per approval)
  - [x] **8a — /pyqs, /pyqs/[slug], /pyqs/practice** — DONE 2026-06-25 (token re-skin; list empty/loading/error states; MCQ + practice flow intact). NOTE: `/api/pyqs/search` 500s locally — `pyqs` table not in the connected Supabase (migration `20260517000011_pyqs.sql` unapplied); detail page unverifiable without data.
  - [x] **8b — /mock-test, /quiz/friday** — DONE 2026-06-25 (token re-skin; mock-test setup/running/result + friday verified via mocked data — `mock_tests` table also unprovisioned). NOTE: `/quiz` index (page.jsx) deferred — uses a separate `@/lib/styles` COLORS system + shared TopBar/Button/ContextualSidebar; needs a coordinated pass (Stage 9 or dedicated).
  - [x] **8c — /call-tutor** — DONE 2026-06-25 (voice orb refactored PHASE_CFG hex→rgb-triplet+helpers; phases mapped to O&A palette: idle=gold, listening=success, thinking/connecting=warning, speaking/greeting=info, ended=tertiary, summary=success; orb/glow/animation logic intact).
  - [x] **8d — /brain-map (+share)** — DONE 2026-06-25 (5 files + shared `lib/masteryColor.js`; **mastered = gold** per §2.2 "gold-standard mastery", strong=success, shaky=warning, unknown=tertiary; reactflow nodes/minimap/stats/panel consistent via rgb helper).
  - [x] **8e — /cohort** — DONE 2026-06-25 (leaderboard re-skin; "you" row + handle = gold identity, top-3 ranks gold, "studying now" success; cold-start + populated states verified).
  - [x] **8f — /pricing** — DONE 2026-06-25 (visuals only; Pro = gold hero card, gold annual toggle, success callout/checks; **mojibake fixed incl. ₹ rupee symbol**; Razorpay theme reads computed --accent; payment/plan logic untouched + verified).
  - [x] **8g — onboarding + welcome-back + exam-transition + post-exam + trial** — DONE 2026-06-25 (16 files re-skinned; onboarding single-select = gold-edge, CTAs gold, success/win moments gold; mojibake fixed). 6/7 pages render clean. **2 PRE-EXISTING bugs flagged (not re-skin):** /trial/decision crashes (client comp imports serverAuth via telemetry/events — server-only SERVICE_ROLE_KEY undefined in browser); exam-transition shows "in undefined days" with no exam date set.
  - [x] **8h — / landing** — DONE 2026-06-26 (founder picked **Hero A — Constellation Hero**: gold star-field backdrop + gold radial glow, centered LogoMark, gold-dot badge, headline "Your notes that **answer back.**" with gold accent; cleaned all residual `rgba(124,58,237,…)` purple literals + slate headline gradient hex; rupee symbols verified; full page social-proof/features/steps/testimonials/pricing/FAQ/CTA/waitlist all O&A. 🇮🇳 flag emoji removed — broke on Windows/Chromium → gold-dot SVG). Verified desktop + mobile.
- [ ] **Stage 9 — Wire-up audit + polish** (audit: 53 findings; founder sign-off 2026-06-26 — P0 via /api/telemetry, full re-skin all 5 pages, wire orphans + delete dead-code)
  - [x] **9a — P0 + a11y foundation + dead links** — DONE 2026-06-26. `/trial/decision` blank-crash fixed (telemetry/events.js now client-safe — server branch dynamic-imports serverAuth, client branch POSTs new `/api/telemetry`); app-wide gold `:focus-visible` ring + `prefers-reduced-motion` guard in globals.css; globals violet rgba(124,58,237) → accent color-mix; dead links: /welcome-back /library→/dashboard + dropped dead reset fetch; next.config /ai-coach,/aicoach→/sage (was missing /coach) + /chat→/sage redirect. Verified: build clean, gate green, /trial/decision renders (auth gate, no crash).
  - [x] **9b — palette regressions on finished pages** — DONE 2026-06-26. 8 shared comps re-skinned (~84 literals, parallel workflow): QuickChatDrawer (26), QuickChatVortex (2), DashboardSidebar (11, +1 legit gold hex in SVG attr), UserProfile (7), ProgressLayout (7), MorningMode (5), BriefingPlayer (11), EmptyState (15). All banned violet/cyan → O&A tokens/color-mix. Gate green (1352 hex, −51 net), build clean. Visual capture of auth-gated /dashboard + /sage deferred to 9h full-route sweep.
  - [x] **9c — state coverage + exams prop bug** — DONE 2026-06-26. **/exams WeakTopicsSection prop bug fixed** (was `weakTopics=` → component wants `topics`+`selectedExam`; verified contract; wired onPractice/onAskAI/onStartQuiz to canonical /quiz·/sage routes; same fix in ExamsHeroCard; aligned onPractice→/quiz to match ExamCard). Error/retry states added: /progress (refetch via useProgressData), /quiz/friday (catch + retry), /mock-test (try/catch/finally — buttons no longer stick; running-view !q guard; alert→inline banner), /pyqs + /pyqs/practice (error vs misleading-empty), /pyqs/[slug] (DB-error → friendly fallback vs raw boundary). Build clean, gate green, 6 routes HTTP 200.
  - [x] **9d — mobile fixes** — DONE 2026-06-26. ExamsSidebar now collapses to a hamburger + slide-in drawer ≤768px (mirrors DashboardSidebar). Responsive grids (isMobile ? 1fr : …): /exams (1fr1fr), /quiz active + QuizSkeleton (3fr2fr), /focus FocusSessionActive (1fr1fr + TimerRing 220→160). /pricing Family/Institute → auto-fit (stack). **Caught+fixed a 9e regression**: ExamsSidebar NavItem active bg/border used `activeColor.replace(")"…)` string hacks that broke once activeColor became hex (`rgba(D4AF6E`/`D4AF6E22` invalid) → color-mix. Build clean, gate green, /pricing mobile verified (cards stack).
  - [x] **9e — full re-skin 5 pages** — DONE 2026-06-26. Central `lib/styles.js` COLORS/SHADOWS → literal O&A gold (literal, not var, because consumed in canvas e.g. TimerRing) + TimerRing track gold. Fanned out 37 components (356 literals) across /exams (+ExamsSidebar +5 dashboard/exams cards +ExamsHeroCard), /study, /focus (+5 focus comps), /progress (+13 progress cards +CohortWidget), /quiz (+shared ContextualSidebar/Card/Buttons/QuizSkeleton +quiz comps). 4 files use literal gold for canvas/SVG (ExamsSidebar, FocusScoreCard, Celebration, ProgressRing). Gate green (hex 1352→1024, −328), build clean, all 5 routes HTTP 200. **Authenticated visual sweep deferred to 9h** (no test creds in .env.local; `scripts/shot-9e.mjs` ready once creds provided).
  - [x] **9f — a11y finish + dead-code deletion** — DONE 2026-06-26. a11y: Sage icon buttons (HoverActionBtn/AIMsgBtn shared + attach/send-stop/copy/remove) now `aria-label`'d; Sage textarea labelled; 4 auth pages label↔input `htmlFor`/`id` (8 pairs); FAQ accordion `aria-expanded`/`aria-controls`/`aria-hidden`. **Deleted 10 verified-orphan dead-code files** (grep-confirmed zero live/dynamic imports): dashboard/{BrainSection,AnalyticsSection,QuizSection,ExamReadinessShareCard}, qa/{FollowUpCTAs,SourceChips,ConceptChip}, answer/{SessionCallout,AnswerRating}, AskAI/ModelSwitcher. parseAnswerSections: removed 43 dead `accent` hex (AnswerSection only consumes icon+label; 135 unit tests pass). Hex 1024→812. Build clean, gate green.
  - [x] **9g — wire orphan routes + admin pass** — DONE 2026-06-26. DashboardSidebar NAV_ITEMS gained **Exams** (CalendarIcon), **Progress** (new ProgressIcon), **Review→/study** (new ReviewIcon) — the 3 zero-inbound orphans are now reachable from the main app nav. /chat→/sage redirect already in 9a. Admin not-broken pass: /admin, /admin/{users,metrics,pyqs,trial-segments} all HTTP 200 (render, don't crash; don't import serverAuth in client → not the trial/decision class). **Deferred (need product logic, risk of breakage — flagged for founder):** lifecycle entry gates (/welcome-back, /exam-transition, /post-exam) and /brain-map/share Share button (needs snapshot-generation flow). Admin pages keep old palette (internal, out of approved re-skin scope). Build clean.
  - [x] **9e-completeness — remaining live banned-color sweep** — DONE 2026-06-26. Strict gate revealed the audit's per-page lists were non-exhaustive; 35 more live components still carried banned violet/cyan (LibraryItem, Upload*, VoiceCallSection, StudyPlanSection, FocusModeSection, dashboard WeeklyRecapCard/CohortPresence, exams ExamCountdownSection/StudyPlanModal/WeakTopicsSection/ExamSection, banners, settings, artifacts modals, progress Spaced/Streak/Accuracy/StudyTime/LiveIndicator cards, modes Night/Slump, shared Button/DashboardSkeleton/DeleteConfirmationModal, ErrorBoundary, etc.). 339 literals → O&A; semantic urgency colors + black scrims correctly preserved. Dead token files (lib/tokens.js, design/tokens.js, types/theme.ts) confirmed unimported → left. Hex 812→513. Build clean, gate green.
  - [x] **9h — final harness** — DONE 2026-06-27. Strict gate reviewed: **zero banned violet/cyan in ALL live UI** (only admin/dev internal pages + server-side PDF/image generation retain old hex; dead token files lib/tokens.js·design/tokens.js·types/theme.ts confirmed unimported). Grep baseline refreshed → 37 files / 513 hex (orig 159 / 2299, −78%). Final build clean. Public routes visually verified (landing, login, signup, pricing — desktop+mobile). **Deferred: authed-page screenshots** (dashboard, Sage, exams/study/focus/progress/quiz) — infra-blocked: the connected Supabase has a broken signup trigger (zero users exist, can't create one without SQL access). `scripts/shot-9e.mjs` (tolerant login) + `scripts/create-test-account.mjs` + `scripts/probe-tables.mjs` ready to run the moment a working login exists.

---

## Stage 0 — Verification harness (DONE)

- [x] Read master prompt + skim §1 key files
- [x] `PLAN.md` / `NOTES.md` / `CLAUDE.md` design section created
- [x] `/styleguide` route — renders all active tokens + core component previews on the app canvas
- [x] `scripts/grep-gate.mjs` — baseline-aware raw-hex gate (fails on NEW hex in components; green on current UI via `grep-gate.baseline.json`)
- [x] `scripts/capture-route-screens.mjs` — Playwright screenshots, desktop 1440×900 + mobile 390×844 → `__screens__/<stage>/`
- [x] `npm run build` clean + dev start clean
- [x] Baseline screenshots captured → `__screens__/stage-0-baseline/`

**Harness commands** (no package.json changes — run directly):

```
node scripts/grep-gate.mjs                  # fail on new raw hex vs baseline
node scripts/grep-gate.mjs --update-baseline # refresh baseline (end of approved stage only)
node scripts/grep-gate.mjs --strict          # full report, no baseline (Stage 9)
node scripts/capture-route-screens.mjs <stage-name>   # dev server must be running
```

---

## Stage 1 — Design tokens + theme foundation (DRAFTED — needs founder approval)

Goal: install Obsidian & Aurum tokens (§7) as the active default. Blast radius: token file only.

1. Rewrite `src/styles/variables.css`: add the §7.1 Obsidian & Aurum palette as the new default theme values. Keep `:root.theme-gradient/.theme-dark/.theme-light` class hooks alive (ThemeContext keeps working) but point the default (`theme-gradient`, the DEFAULT_THEME) at the new black/gold palette. Keep old var names (`--color-brand`, `--bg-surface-alt`, …) as aliases to new tokens so existing inline styles don't break mid-migration.
2. Add new token names (`--bg-base/-elevated/-surface/-surface-2/-inset`, `--border-hairline/-strong`, `--text-primary/-secondary/-tertiary/-disabled`, `--accent/-bright/-dim/-grad/-glow`, semantic, `--ai-signal`) + §7.2 type scale vars + §7.3 space/radius/shadow/motion vars.
3. Map tokens into Tailwind v4 (`@theme` in globals.css or config equivalent) so utilities agree with inline styles.
4. `layout.js` → `viewport.themeColor: "#08080A"`; `manifest.json` theme/background color → `#08080A`.
5. Update `/styleguide` token list to display the new token set; tune gold hue on `/styleguide`; lock final values in `NOTES.md`.
6. Verify: build clean, grep gate green, screenshots `__screens__/stage-1-tokens/`, every route still renders (transitional look OK). Founder sign-off on the gold.

---

## Later stages

Per master prompt §9 — sub-steps to be drafted at each stage start and approved before the long run.
