# Phase 0 — Baseline & Inventory

**Project:** Ask My Notes — AI study platform (Indian competitive-exam aspirants)
**Date:** 2026-06-28
**Author:** QA + Release Engineering pass
**Method:** Static inspection of the repo only. No database connection, no network calls, no production access. Secrets never read/echoed.

Legend: **[V]** = verified directly by me this pass · **[A]** = agent-reported from code excerpts, **must be confirmed in its target phase before any finding is filed.**

---

## 0. Headline conclusions

1. **[V] No staging environment exists.** No `.env.staging`/`.env.production`, no Supabase `config.toml`, no staging branch, no preview-specific Vercel config, no seed script. Per operating rules, **standing up an isolated staging env is the gating prerequisite** before any Phase 1+ functional/adversarial testing. This cannot be done without founder-supplied credentials and provisioning (see §7).
2. **[V] Stack is App Router + Supabase + OpenAI + Razorpay + AiSensy/WhatsApp + Vercel**, exactly as briefed. Next 16.1.6, React 19.2.3.
3. **[V] Auth gating is per-page (client) + per-API-route (server bearer token). There is NO Next.js middleware.** Client-side route guards are UX only; the real boundary is each API route's `getUser(token)` check + Supabase RLS. This must be probed directly in Phase 3 (UI redirect ≠ access control).
4. **[A] RLS appears broadly enabled (≈50/55 tables)** with owner-scoped policies in repo migrations, BUT a handful of tables ship **without RLS** (`payment_orders`, `family_invites`, `cancellation_reasons`, `coaching_institute_pilots`, `decompression_triggers`) and two storage buckets (`documents`, `recaps`) are used in code but **not defined in migrations**. RLS effectiveness is the #1 risk and must be proven table-by-table against PostgREST in Phase 3 — repo migrations are not proof the live DB matches.
5. **[A] Payment + WhatsApp webhook signature verification, idempotency, and server-derived entitlements appear present** — but these are the money/abuse paths and will be adversarially verified in Phase 3, not trusted from a read.

---

## 1. Stack & routing model **[V]**

| Layer | Detail |
|---|---|
| Framework | Next.js **16.1.6**, **App Router** (`src/app/`), React 19.2.3, `"type": "module"` |
| Hosting | **Vercel** (`vercel.json`); 10 cron jobs defined there |
| AI | `openai@^6.34.0` (gpt-4o vision, gpt-4o-mini chat, text-embedding-3-small, whisper-1, tts-1); `@anthropic-ai/sdk@^0.90.0` present **[A] reported unused**; Vercel `ai@^6` SDK present |
| FSRS | **`ts-fsrs@5.3.3` is installed** → scheduler may be real, not stubbed. **[A] one agent claimed "SM-2 only / FSRS deferred" — contradiction, must verify in Phase 1.** |
| DB/Auth/Storage | `@supabase/supabase-js@^2.99.1` (Postgres + pgvector + Auth + Storage) |
| Payments | `razorpay@^2.9.6` |
| WhatsApp | AiSensy (default) / Gupshup / Interakt via `src/lib/whatsapp/dispatch.js` |
| OCR | `tesseract.js@^7` + OpenAI vision fallback |
| UI | Tailwind v4, `framer-motion`, `reactflow` (Brain Map), `recharts`, `@react-pdf/renderer`, `markdown-it`/`react-markdown` |
| Errors | `@sentry/nextjs@^10.53.1` (client/server/edge configs, PII stripping) |

**No `middleware.(js|ts)` in app source** (confirmed via glob — only node_modules/build artifacts). Implication: there is no centralized/edge auth gate; protection is enforced page-by-page and route-by-route.

---

## 2. Route surface (pages) **[A — from routing agent, spot-check in Phase 1]**

~41 page routes under `src/app/`. Core feature → route map:

| Feature | Route(s) | Auth-gated |
|---|---|---|
| Marketing / pricing preview | `/` | no |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` (route handler) | no |
| Onboarding (exam select) | `/onboarding` | yes |
| Dashboard | `/dashboard` | yes |
| Sage (AI Q&A) | `/sage`; `/ask-ai`,`/chat`,`/ai-coach`,`/aicoach` → 301 `/sage` | yes |
| Brain Map | `/brain-map`, `/brain-map/share` | yes |
| Mock-test simulator | `/mock-test` | yes |
| FSRS review | `/study` | yes |
| PYQ database | `/pyqs`, `/pyqs/practice`, `/pyqs/[slug]` | mixed (search public, attempt gated) |
| Quiz | `/quiz`, `/quiz/friday` | yes |
| Focus / Pomodoro | `/focus` | yes |
| Exams / countdown | `/exams`, `/exam-transition`, `/post-exam` | yes |
| Progress / analytics | `/progress` | yes |
| Cohort leaderboard | `/cohort` | no |
| Pricing / paywall | `/pricing`, `/trial/decision`, `/trial/lapsed`, `/trial/success` | mixed |
| Voice tutor | `/call-tutor` | yes |
| Admin | `/admin`, `/admin/{metrics,users,trial-segments,pyqs,sentry-test}` | yes (ADMIN_EMAILS) |
| Dev tools | `/dev/backfill`, `/dev/graph/[docId]` | yes (dev) |
| Styleguide | `/styleguide` | no |

- **Photo Doubt Cam**: API exists (`/api/photo-doubt`) but **[A] no dedicated page found** — likely a modal/drawer. Confirm surface in Phase 1.
- **Daily audio briefings / gamification**: surfaced inside dashboard/progress, not standalone pages.
- **No `loading.js`/`error.js`/`not-found.js`/`global-error.js` special files reported** → loading/error UX is client-state driven. Relevant to Phase 5 (skeletons) and the "no white screen" bar.

---

## 3. API surface (endpoints) **[A — from endpoints agent]**

**100+ route handlers under `src/app/api/`.** Auth model per route: bearer token → `supabase.auth.getUser(token)`; webhooks → signature; cron → `CRON_SECRET`; admin → `ADMIN_EMAILS`.

Critical/money/AI/abuse-relevant endpoints to carry into later phases:

| Endpoint | Methods | Auth | External | maxDuration | Notes |
|---|---|---|---|---|---|
| `/api/ask` | POST | bearer (optional?) | OpenAI, embeddings, Storage | 45s | **streaming Q&A**, RAG, budget gate, QA rate-limit, cache |
| `/api/ask-ai` | POST | bearer | OpenAI | 45s | deprecated non-streaming |
| `/api/process-pdf`, `/api/upload` | POST | bearer | OpenAI, Storage | 600s | extract→OCR→embed→concepts→cards |
| `/api/photo-doubt` | POST | bearer | OpenAI vision, Storage | — | **[A] no file-size check** (flag Phase 2/3) |
| `/api/mock-test/{create,submit,history}` | POST/GET | bearer | — | — | answers stored server-side; scoring |
| `/api/cards/[id]/review`, `/api/cards/{due,sr_due}` | POST/GET | bearer | — | — | FSRS scheduler |
| `/api/payments/create-order` | POST | bearer | Razorpay | — | **price from DB, not client [A]** |
| `/api/payments/verify` | POST | bearer | — | — | HMAC verify client callback |
| `/api/payments/webhook` | POST | **signature** | — | — | **Razorpay webhook; sig verify + idempotency [A]** |
| `/api/webhooks/whatsapp` | GET/POST | **signature** | AiSensy/Gupshup/Interakt | — | inbound + delivery status |
| `/api/voice/{start,transcribe,respond,speak,end}` | POST | bearer | OpenAI | — | budget + rate-limit gated |
| `/api/pyqs/{query,search,[slug]}` | POST/GET | bearer | OpenAI embeddings (query) | — | semantic + keyword |
| `/api/briefings/{today,listened}` | GET/POST | bearer | — | — | IST date logic |
| `/api/streak`, `/api/progress`, `/api/cohort/*` | GET/POST | bearer | — | — | gamification |
| `/api/health` | GET | none | OpenAI, Razorpay (reachability) | — | circuit-breaker status |
| `/api/cron/*` (10) | GET | CRON_SECRET | varies | up to 600s | see §5 |

**[A] No-auth endpoints (confirm intentional in Phase 1/3):** `/api/ai/focus-tip`, `/api/documents/sample`, `/api/events/embed`, `/api/waitlist`, `/api/health`. Webhooks rely on signature, not bearer (expected).

---

## 4. Data layer — tables, RLS, storage, RPC **[A — from schema agent; RLS effectiveness MUST be proven live in Phase 3]**

- **~55 tables** defined across `supabase/migrations/`. ~50 carry owner-scoped RLS policies (`user_id::text = auth.uid()::text` or direct uuid match); child tables (`document_chunks`, `messages`) scope via parent.
- **Read-only/append-only policies** on audit-ish tables (`learning_events`, `notification_log`, `daily_briefings`, `weekly_recaps`, `whatsapp_messages`, `growth_events`, `trial_segments`, `user_ai_spend_daily`); service-role-only on `qa_cache`; public-read on `pyqs`.
- **Tables WITHOUT RLS in repo (Phase 3 priority):** `payment_orders`, `family_invites`, `cancellation_reasons`, `coaching_institute_pilots`, `decompression_triggers`. `waitlist_emails` intentionally open-write.
- **Storage buckets:** `user-pdfs` (50MB, pdf), `briefings` (10MB, audio), `photo-doubts` (10MB, images) — all folder-scoped to `auth.uid()` in SQL. **`documents` and `recaps` buckets are used in code but NOT defined in migrations** → policy unknown, Phase 3 priority (URL-guessing test).
- **RPC:** `match_documents`, `match_documents_multi`, `search_pyqs_semantic`, `sr_next_due`, `match_learning_events`, `upsert_ai_spend_daily`, plus triggers (`handle_new_user`, notif-prefs). **`get_active_briefing_users` is called in code but not found in migrations** → may exist only in the live project.
- **Clients:** `src/lib/supabase.js` = anon key (`NEXT_PUBLIC_*`); `src/lib/supabaseServer.js` + `src/lib/serverAuth.js` = service-role (server only). **[V via §6]** no `NEXT_PUBLIC_` service-role exposure in env surface. Client-side import of the service-role client: **[A] none found — verify in Phase 3 bundle audit.**

> **Caveat (stated explicitly):** repo migrations prove *intent*, not the live DB state. RLS on / policies present must be re-proven against the actual (staging-clone) Supabase project in Phase 3 with two real user tokens.

---

## 5. Cron jobs **[V — from vercel.json]**

| Path | Schedule (UTC) | External |
|---|---|---|
| `/api/cron/generate-briefings` | `30 20 * * *` | OpenAI (TTS) |
| `/api/cron/dispatch-notifications` | `*/5 * * * *` | WhatsApp |
| `/api/cron/evaluate-streaks` | `0 19 * * *` | — |
| `/api/cron/generate-weekly-recaps` | `0 6 * * 0` | OpenAI |
| `/api/cron/cohort-leaderboard-snapshot` | `30 14 * * 0` | — |
| `/api/cron/cleanup-photo-doubts` | `0 1 * * *` | Storage |
| `/api/cron/fsrs-due-reminder` | `0 7 * * *` | — |
| `/api/cron/purge-deleted-accounts` | `0 2 * * *` | Storage |
| `/api/cron/trial-d3-segment` | `30 12 * * *` | WhatsApp |
| `/api/cron/trial-d5-warmup` | `30 12 * * *` | WhatsApp |

All gated by `CRON_SECRET`. Note schedules are UTC while product logic is IST — timezone correctness is a Phase 1 check (briefings, streaks, day boundaries).

---

## 6. Secrets & config hygiene **[V — env var NAMES only, no values read]**

- **Env files:** `.env.example` (committed, placeholders) + `.env.local` (git-ignored, on disk — treated as live, NOT read). `.env`/`.env*.local`/`.vercel`/`*.pem` are git-ignored.
- **`NEXT_PUBLIC_` vars** (ship to browser): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN`, `VERCEL_ENV`, `APP_URL`, `SITE_URL`, `ADMIN_EMAIL`, `VAPID_PUBLIC_KEY`, `VOICE_PROPLUS_ENABLED`. **None are sensitive** — no service-role/secret/API key carries the `NEXT_PUBLIC_` prefix. ✔
- **Server-only secrets:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SENTRY_AUTH_TOKEN`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`, `WHATSAPP_APP_SECRET`, `WHATSAPP_API_KEY`, `INTERNAL_CALL_SECRET`, AI budget caps.
- **Razorpay is documented test-mode for dev** (`rzp_test_...`). Live keys only in prod Vercel.
- **CI** (`.github/workflows/ci.yml`): lint + `npm test` + build on push/PR to main; secrets via GitHub Actions store. **[A]**
- Deferred to Phase 3: full client-bundle secret scan, git-history secret scan, response/log leakage.

---

## 7. Staging environment — status & plan **[V: does not exist]**

### What exists that helps
- ~40 migration SQL files (the schema source).
- Razorpay already defaults to test-mode in config.
- Per-plan AI budget caps (`AI_BUDGET_*_USD`) — can be set very low in staging to cap OpenAI spend.
- WhatsApp dispatch has provider abstraction + quiet hours — amenable to a dry-run flag.
- An existing test foundation: node `--test` unit suite + Playwright e2e (`auth`, `pricing`, `dashboard`, `progress`) + load test.

### What is missing / blocking
- **No isolated Supabase project** for staging (would need its own URL/anon/service-role keys).
- **No `supabase/config.toml`** → no turnkey local Supabase; migrations must be applied manually/in order.
- **Migration ordering hazard:** several non-timestamped files (`migrations.sql`, `voice_migration.sql`, `quickchat_migration.sql`, `concept_graph_migration.sql`, `spaced_repetition_cards.sql`, `weak_topics_tables.sql`, `learning_events.sql`, `match_learning_events.sql`, `generated_artifacts.sql`, `add_*`, `20260429_*`, `20260504*`, `20260515_*`, `enable_realtime_*`) interleave with the timestamped baseline; **[A]** `quickchat_migration.sql` reportedly conflicts with the baseline `conversations` table. Reproducing the schema cleanly on a fresh project needs a curated, ordered apply list. (This is itself a release-risk to confirm: can the schema be rebuilt from git alone?)
- **No seed script** for test students/content.
- **No test-mode third-party creds wired** for a non-prod target.

### Recommended staging shape (smallest safe path)
1. **Separate Supabase project** ("ask-my-notes-staging") — fresh DB, run migrations in curated order, copy/verify RLS + buckets (`documents`/`recaps` included), define `get_active_briefing_users`.
2. **Razorpay test mode** keys + a test webhook endpoint pointed at staging.
3. **Dedicated low-budget OpenAI key** with `AI_BUDGET_*_USD` set to a few cents.
4. **WhatsApp dry-run** (provider stub / no real sends) unless an AiSensy sandbox is available.
5. **Seed data** (I will author the script): test students in each state — free, on-trial, paid (₹199/₹399/₹4,499), trial-expired — plus per-exam sample content (JEE/NEET/UPSC/GATE/CA), mock tests, PYQs, due FSRS cards.
6. **Run target:** Vercel preview deploy *or* `next dev` locally against the staging Supabase project.
7. **Baseline capture:** record happy-path screenshots/responses once seeded, so Phase 1+ regressions are obvious.

I can build items #1 (ordered migration runbook), #5 (seed script), and #7 (baseline harness) now **without any secrets or external calls**. Items #2–#4 and actually creating the Supabase project require founder action/credentials.

---

## 8. To-verify register (carried into later phases — NOT findings yet, no repro)

| # | Item | Phase | Why it matters |
|---|---|---|---|
| TV-1 | Is route protection enforced server-side, or only client redirects? | 1/3 | client guard ≠ access control |
| TV-2 | Razorpay webhook signature verify + idempotency actually correct | 3 | free-access / double-grant |
| TV-3 | RLS proven per-table with 2 user tokens against PostgREST | 3 | #1 data-leak risk |
| TV-4 | `payment_orders` / `family_invites` no-RLS → cross-user read? | 3 | billing/PII leak |
| TV-5 | `documents` & `recaps` buckets: policies + URL-guess test | 3 | doubt-image/recap leak |
| TV-6 | FSRS real (`ts-fsrs`) vs stubbed; IST day-boundary correctness | 1/2 | corrupts every schedule silently |
| TV-7 | Mock-test scoring across all-correct/wrong/partial/skipped/timeout | 1 | wrong scores = S1 |
| TV-8 | photo-doubt file size/type validation | 2/3 | cost/DoS |
| TV-9 | Per-user AI rate limits + token caps under flood | 3/4 | OpenAI bill runaway |
| TV-10 | `get_active_briefing_users` exists in live DB | 1/4 | cron would 500 if missing |
| TV-11 | Schema rebuildable from git (migration order) | 0/3 | staging + DR |
| TV-12 | `@anthropic-ai/sdk`, `@shadcn/ui` actually unused | 4/5 | bundle size |

---

## 9. Findings count (Phase 0)

Phase 0 is inventory, not testing → **0 confirmed findings filed** (every item above is a to-verify with no repro yet). Structural observations (no middleware, no-RLS tables, undefined buckets/RPC, migration ordering) are logged as TV-items to be reproduced in their proper phase before any severity is assigned.

**Verdict:** Inventory complete. **Blocker to proceed past Phase 0: no isolated staging environment exists**, and creating one requires founder-supplied credentials/provisioning. Recommend authorizing the staging plan in §7 (and letting me build the migration runbook + seed script + baseline harness now) before Phase 1.
