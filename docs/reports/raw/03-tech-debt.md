# Phase 3 — Technical Debt (Re-Audited 2026-05-27)

*Reconciled against original `TECH_DEBT_AUDIT.md` (2026-05-16) and live verification of the codebase.*

> **What changed since the May 16 audit:** all 3 CRITICAL security issues fixed, OPS-1 (Sentry) fixed, OPS-2 (CI/CD) fixed, OPS-5 (health endpoint) fixed, DB-1 (13 missing migrations) effectively fixed, DB-2 (missing RPCs) fixed, MEDIUM-2 (webhook idempotency) fixed via `payment_orders` table. Audit's "Tier 1" emergency list is largely closed. New debt has emerged from the rapid feature delivery since.

---

## 3.1 Severity Summary

| Severity | Count | Trend vs audit |
|----------|-------|----------------|
| 🔴 CRITICAL (must fix before scale) | **3** (was 4) | Original 3 security CRITICALs closed; 1 new (cost runaway) |
| 🟠 HIGH (fix in 30 days) | **8** (was 7) | Mixed — some closed, new ones emerged |
| 🟡 MEDIUM (fix in 90 days) | **11** (was 10) | Stable |
| 🟢 LOW (nice-to-have) | **9** (was 8) | Stable |

**Carried-forward open debt total: 31 items** (down from 29 in audit; the audit number was understated due to new features adding new debt).

---

## 3.2 🔴 CRITICAL — Block Scaling

### CRIT-1 (NEW): No monthly $-budget per user → cost runaway risk
- **Where:** all AI endpoints, voice pipeline most acute
- **Why critical:** A single abusive Pro user using voice tutor at the daily-call cap (15 × 10-min calls/day) can cost ~₹11,250/mo against ₹399/mo revenue. No circuit breaker is wired.
- **Fix:** Add `user_ai_spend_month` table; daily aggregator; hard cutoff at e.g. ₹500/mo per Pro user with grace email; soft-warn at ₹300.
- **Effort:** 2-3 days
- **Impact if not fixed:** Margin collapse on viral spikes; single bad actor = lots of $ leak.

### CRIT-2 (CARRY-FORWARD): Pricing data drift between `planLimits.js` and `pricing.js`
- **Where:** `src/lib/planLimits.js:21-26` shows Student `price: 299` and Pro `price: 599`; `src/lib/pricing.js` (the order-creation source of truth) shows ₹199 / ₹399 / ₹4499.
- **Why critical:** Any UI surface reading `PLANS[plan].price` (probably the pricing page upgrade prompts) **shows the wrong number**. Revenue at risk if customers see ₹299 then are charged ₹199 (or vice versa).
- **Fix:** Make `pricing.js` the single source of truth. Delete the `price` field from `PLANS` in `planLimits.js`, or derive it from `pricing.js`. Add a unit test that asserts UI prices match Razorpay order amounts.
- **Effort:** 1-2 hours
- **Impact if not fixed:** Trust-breaking pricing inconsistency; chargebacks.

### CRIT-3 (NEW): `/dev/*` routes + `/api/concepts/backfill` still callable in production
- **Where:** `src/app/dev/{graph/[docId],backfill}/page.jsx`, `src/app/api/concepts/backfill/route.js`
- **Why critical:** Audit's CQ-8 still applies. `/api/concepts/backfill` can trigger expensive gpt-4o concept extraction across all docs in the DB. `/dev/graph/[docId]` leaks concept graphs for any doc UUID an attacker can guess. There is a `lib/devGuard.js` — verify it is actually wired into these handlers.
- **Fix:** Add `NODE_ENV !== "development"` 404 in each handler, OR `devGuard.js` import at the top of each — verify it actually returns 404.
- **Effort:** 1 hour
- **Impact if not fixed:** Cost-leak vector (backfill) + information disclosure (graphs).

---

## 3.3 🟠 HIGH — Fix in next 30 days

### HIGH-1 (CARRY-FORWARD): No root-level auth middleware (`src/middleware.ts`)
- **Status:** Partially mitigated. A `verifyAuth(req)` helper exists in `@/lib/serverAuth` and is used in newer routes (verified in `/api/conversations`, `/api/delete-pdf`, `/api/upload`). But legacy routes likely still have inline copy-pasted auth.
- **Action:** Audit all 96+ routes to confirm none use the old inline pattern. Then move public-route guarding to `src/middleware.ts` for defense-in-depth.
- **Effort:** 2-3 days
- **Risk:** A forgotten legacy route accidentally accepting unauthenticated requests.

### HIGH-2 (CARRY-FORWARD): `DashboardContext.jsx` monolith
- **Status:** No evidence of decomposition since audit. Still presumed ~1,500 LOC.
- **Action:** Extract `ExamContext` first (lowest risk), then `QuizContext`, `FocusContext`, `AnalyticsContext`.
- **Effort:** 5-7 days
- **Risk:** Adding any new feature requires reading through 1,500 lines.

### HIGH-3 (NEW): No production-grade rate limiting cache
- **Where:** `lib/planLimits.js` counts via DB query on every request (`countTodayQA`, `countUserPDFs`).
- **Why high:** Every Q&A round-trips Supabase before reaching OpenAI. At 1,000 concurrent users this is 1,000 DB queries before any real work. Audit PERF-1 still applies.
- **Fix:** Sliding-window counter in Supabase (or Upstash Redis at ~$10/mo); 5-minute TTL cache for plan tier per user.
- **Effort:** 2 days
- **Impact:** ~50-100ms saved per request, DB hot-path eliminated.

### HIGH-4 (NEW): WhatsApp send-side coverage unclear
- **Where:** `/api/webhooks/whatsapp/route.js` exists for inbound; outbound send paths through AiSensy not yet inventoried. The trial-D3/D5 segment crons may not be wired to actually message users.
- **Action:** Inventory the send-side flow; confirm message templates approved with Meta; verify `WHATSAPP_APP_SECRET` is set in Vercel prod.
- **Effort:** 1 day investigation + delivery
- **Impact:** Trial conversion experience depends on this — if it's not actually sending, the whole D3/D5 funnel is silent.

### HIGH-5 (NEW): No test coverage for the ~30 new features shipped May 17-23
- **Where:** `tests/unit/` has 23 files but only ~8 added since audit. Photo doubts, briefings, cohorts, PYQ, mock tests, family plan, decompression, push notifications — mostly untested at unit OR e2e level.
- **Fix:** Prioritize integration tests for: payment idempotency, family-plan redemption, account deletion purge cron, photo-doubt cleanup cron, decompression detector logic.
- **Effort:** 5-7 days
- **Impact:** Regression risk at high feature velocity.

### HIGH-6 (NEW): `pg_cron` data purge for `qa_cache` / `qa_usage` still pending
- **Status:** Audit DB-3 was planned for Sprint 1; the migration list does not show a `pg_cron` setup migration.
- **Fix:** Add migration setting up `cron.schedule('purge-qa-cache', ...)` and `purge-qa-usage`. Or run via existing Vercel cron pattern.
- **Effort:** 2 hours
- **Impact:** Table bloat over 6-12 months → slower queries.

### HIGH-7 (CARRY-FORWARD): Custom streaming protocol still unversioned (`__META__` / `__CONV__`)
- **Status:** Unchanged from audit ARCH-3.
- **Fix:** Add `"v": 1` to META payload, frontend honors it; later migrate to SSE.
- **Effort:** 3 days
- **Impact:** Silent client breakage on any prompt-format change.

### HIGH-8 (NEW): FSRS vs SM-2 coexistence — canonical scheduler unclear
- **Where:** Both `lib/sm2Scheduler.js` and `lib/fsrs/scheduler.js` exist. `ts-fsrs@5.3.3` was added.
- **Risk:** New cards may use FSRS, old cards may still expect SM-2 ease-factor fields. Migration logic needed.
- **Fix:** Document which is canonical; if FSRS, write a migration that initializes FSRS state from existing SM-2 state.
- **Effort:** 1-2 days
- **Impact:** Inconsistent SRS scheduling → worse review accuracy.

---

## 3.4 🟡 MEDIUM — Fix in next 90 days

| # | Item | Source | Effort | Notes |
|---|------|--------|--------|-------|
| MED-1 | Light-mode CSS still incomplete | Audit UX-3 | 3 days | `theme-light` not in globals.css; toggle visible but renders broken |
| MED-2 | Mobile sidebar → bottom nav | Audit UX-4 | 3 days | Memory notes "Ambient Intelligence" design + "Lamp Navigation (bottom tabs + desktop rail)" recent commits — may be in-flight |
| MED-3 | Empty state for new user dashboard | Audit UX-1 | 1-2 days | High activation impact |
| MED-4 | PDF processing status UI | Audit UX-2 | 1 day | Realtime publication exists; UI surface needs verification |
| MED-5 | Quiz difficulty selector + history | Audit | 2 days | New feature; pure frontend + small DB read |
| MED-6 | Manual SRS card creation | Audit | 2 days | Often-requested |
| MED-7 | Progress date range filter + export | Audit | 3 days | High value for power users |
| MED-8 | TypeScript migration (API routes first) | Audit ARCH-4 | 2-3 weeks | Only ~5 TS files exist; little progress since audit |
| MED-9 | Inconsistent API response envelope | Audit CQ-3 | 1 week | Zod schemas + adapter |
| MED-10 | Centralize duplicate components (`Buttons`/`Button`, two `WeeklyRecapCard`, etc.) | New | 1 day | Identified in Phase 1.7 |
| MED-11 | `src/next-app/` dead directory + checked-in build artifacts (`tsconfig.tsbuildinfo`, `test-output.txt`) | New | 1 hour | Housekeeping |

---

## 3.5 🟢 LOW — Backlog

| # | Item | Effort |
|---|------|--------|
| LOW-1 | Remove `pdf-parser` (keep `pdf-parse`) | 30 min |
| LOW-2 | Remove `marked` + `markdown-it` (keep `react-markdown`) | 1 hour |
| LOW-3 | **Remove `@anthropic-ai/sdk`** — confirmed zero usage anywhere in `src/` | 5 min |
| LOW-4 | Dynamic import `reactflow` and `recharts` | 1 hour |
| LOW-5 | Move root-level strategic md docs to `docs/` | 30 min |
| LOW-6 | Stream protocol v2 (SSE) | 3 days |
| LOW-7 | HNSW vector indexes when stable | 2 days |
| LOW-8 | Unified API response envelope refactor | 1 week |
| LOW-9 | Error message sanitization (audit LOW-1) | 1 day |

---

## 3.6 Closed since audit (audit-text-to-fixed mapping)

| Audit ID | Description | Fixed by |
|----------|-------------|----------|
| CRITICAL-1 | `/api/conversations` unauth bypass | `verifyAuth()` adoption in route handler |
| CRITICAL-2 | `/api/delete-pdf` no ownership check | Ownership check + 404-on-mismatch added |
| HIGH-1 | `/api/upload` userId from FormData | Now uses `user.id` from token; comment confirms intent |
| MEDIUM-2 | Webhook double-activation risk | `payment_orders` table + migration `20260517000009` |
| OPS-1 | No error monitoring | Sentry config files + `instrumentation.js` + `withSentryConfig` |
| OPS-2 | No CI/CD pipeline | `.github/workflows/ci.yml` present |
| OPS-5 | No `/api/health` | `src/app/api/health/route.js` present |
| DB-1 | 13 tables without migrations | `20260517000001_baseline_schema` + `20260519000007_missing_tables` |
| DB-2 | Missing RPC definitions | `20260517000002_rpcs` |
| ARCH-5 | `adaptivePlanner.js` missing | Now exists at `src/lib/adaptivePlanner.js` |

---

## 3.7 Total debt cost re-estimate

| Bucket | Audit estimate | Now |
|--------|----------------|-----|
| Security fixes | 2 days | **0 days** (closed) |
| Missing migrations | 5 days | **0 days** (closed) |
| Auth middleware | 3 days | 2-3 days (helper exists, full middleware not built) |
| Error monitoring + CI | 2 days | **0 days** (closed) |
| UX gaps | 5 days | 5 days (light mode + mobile nav + empty states) |
| Context decomposition | 7 days | 7 days (no change) |
| TypeScript migration | 15 days | 15 days (no change) |
| Test coverage | 7 days | **10 days** (new features added more surface) |
| Performance optimization | 5 days | 5 days |
| **NEW: monthly budget per user** | — | 2-3 days |
| **NEW: pricing source-of-truth fix** | — | 1-2 hours |
| **NEW: FSRS/SM-2 reconciliation** | — | 1-2 days |
| **NEW: WhatsApp send-side verification** | — | 1 day |
| **Total to "scale-ready"** | ~51 days | **~38 working days** |

The audit projected 51 dev-days of debt; the current backlog is ~38 days — the team has burned down ~13 days of debt while adding ~5 days of new debt over the same 12 days. **Net debt reduction: ~8 days in 12 days.** This is a strong trajectory but the codebase is still ~7 weeks of focused debt work from being scale-ready.
