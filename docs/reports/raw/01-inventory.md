# Phase 1 — Codebase Inventory

*Generated: 2026-05-27 | Source: live filesystem scan + reconciled with prior audit docs (2026-05-15 → 2026-05-23)*

> **Note on freshness.** The prior strategic docs (`PROJECT_PROGRESS_REPORT.md`, `TECH_DEBT_AUDIT.md`, `FEATURE_STATUS_MATRIX.md`, `SYSTEM_ARCHITECTURE_MAP.md`) were generated 2026-05-15/16. Between then and now, **22 new migrations and ~30 new API routes** have shipped (PYQ marketplace, Mock Tests, Photo Doubt Cam, Cohorts + Leaderboard, Family Plan, Daily Briefings + cron generation, Weekly Friday Quiz, Streak Freeze, WhatsApp webhooks, Web Push VAPID, Trial Conversion ("decompression"), Account Deletion + Privacy + Data Export, UTM/referral tracking, Sentry now wired up). This inventory captures the *current* state as of 2026-05-27.

---

## 1.1 Directory Structure (top-level)

```
ask-my-notes/
├── src/
│   ├── app/                  ← Next.js 16 App Router (35 pages + 96+ API routes)
│   │   ├── (root pages)      ← landing, login, signup, onboarding, pricing
│   │   ├── dashboard/        ← main hub with study/progress modes
│   │   ├── ask-ai/, quiz/, focus/, study/, exams/, progress/, call-tutor/
│   │   ├── brain-map/        ← NEW: graph visualization on production (was /dev only)
│   │   ├── cohort/           ← NEW: leaderboard
│   │   ├── pyqs/             ← NEW: PYQ marketplace + practice
│   │   ├── mock-test/        ← NEW: full-length mock exam
│   │   ├── admin/            ← NEW: admin (pyqs, trial-segments, sentry-test)
│   │   ├── trial/            ← NEW: decision/lapsed/success funnel
│   │   ├── welcome-back/     ← NEW: re-engagement page
│   │   ├── exam-transition/  ← NEW: post-exam transition flow
│   │   ├── post-exam/        ← NEW: post-exam screen
│   │   ├── dev/              ← still present (graph, backfill — dev-only)
│   │   └── api/              ← 96+ route handlers (see §1.4)
│   ├── components/           ← ~100 components (see §1.5)
│   ├── context/              ← DashboardContext, ThemeContext, FocusSessionContext, DrawerContext
│   ├── hooks/                ← useProgressData, useRealtimeProgress, useExamReminders, …
│   └── lib/                  ← ~100 utility modules (see §1.6)
├── supabase/
│   └── migrations/           ← 38 SQL files (see §1.3)
├── tests/
│   ├── unit/                 ← 23 .test.mjs files (Node native test runner)
│   ├── e2e/                  ← 3 Playwright specs (auth, dashboard, pricing, progress)
│   └── load/                 ← load-test.mjs
├── docs/, scripts/, public/
├── instrumentation.js        ← Sentry instrumentation
├── sentry.client.config.js, sentry.server.config.js, sentry.edge.config.js
├── next.config.mjs           ← Sentry wrapper, React Compiler, security headers, redirects
├── vercel.json               ← 10 active cron jobs
├── playwright.config.js
└── ~15 strategic markdown docs in repo root
```

### File counts (rough — `node_modules`, `.next`, `.git`, `.worktrees`, `tsconfig.tsbuildinfo` excluded)

| Type | Count | Notes |
|------|-------|-------|
| API routes (`src/app/api/**/route.{js,ts}`) | **96+** (Glob truncated) | Was 58 at 2026-05-15 audit → +30+ in 12 days |
| Pages (`src/app/**/page.{js,jsx}`) | **35** | Was ~17 → roughly doubled |
| Components | **~100** | Audit said ~50; doubled |
| Lib modules | **~100** | Audit said ~40; doubled |
| Migrations | **38 SQL files** | Was 17 → +22 |
| Unit tests | **23** | Was 15 → +8 |
| E2E tests | **3 specs** (auth, dashboard, pricing, progress) | Was "unknown coverage" |
| Strategic md docs | ~15 | Heavy in-repo documentation culture |

### Unusual / notable directories

- `.worktrees/dashboard-redesign/` — active worktree for the in-flight Ambient Intelligence System redesign
- `.agents/`, `.superpowers/`, `temp_superpowers/` — superpowers/agents tooling
- `src/next-app/` — secondary Next.js project (worktree leftover or sub-experiment — investigate; could be dead code)
- Many large root-level markdown docs (44KB `CLAUDE_CODE_GROWTH_SPRINT_PROMPT.md`, 54KB `PROJECT_PROGRESS_REPORT.md`) — should likely live under `docs/`

---

## 1.2 Configuration & Build

### `package.json`
- Name: `ask-my-notes`, version `1.0.0`, `"type": "module"`
- Scripts: `dev`, `build`, `start`, `lint`, `test` (19 unit files), `test:unit`, `test:e2e`, `test:e2e:ui`, `test:load`, `test:all`
- **Dependencies (32 prod + 6 dev):**
  - Framework: `next@16.1.6`, `react@19.2.3`, `react-dom@19.2.3` + `babel-plugin-react-compiler@1.0.0`
  - AI: `openai@^6.34.0`, `@anthropic-ai/sdk@^0.90.0` (still unclear whether actively used), `ai@^6.0.116` (Vercel AI SDK), `langchain@^1.2.33`, `@langchain/core`, `@langchain/textsplitters`, `tesseract.js@^7.0.0`
  - DB / Storage: `@supabase/supabase-js@^2.99.1`
  - Payments: `razorpay@^2.9.6`
  - SRS: `ts-fsrs@^5.3.3` ← **NEW** since audit (FSRS algorithm, replacing/augmenting SM-2)
  - Observability: `@sentry/nextjs@^10.53.1`
  - Notifications: `web-push@^3.6.7` (VAPID)
  - Docs / parsing: `pdf-parse@^1.1.4`, `pdf-parser@^1.0.5` (still duplicated), `@react-pdf/renderer@^4.3.2`, `docx@^9.6.1`, `markdown-it@^14.1.1`, `marked@^17.0.4`, `react-markdown@^10.1.0`, `remark-gfm@^4.0.1` (all four markdown stacks still installed → duplication debt unchanged)
  - UI: `framer-motion@^12.38.0`, `@shadcn/ui@^0.0.4`, `@vercel/og@^0.11.1`, `reactflow@^11.11.4`, `recharts@^3.8.0`
  - Utilities: `uuid@^13.0.0`, `fs-extra@^11.3.4`
- **Dev deps:** `@playwright/test@^1.58.2`, ESLint v9 flat config, Tailwind v4, React Compiler babel plugin

### `next.config.mjs`
- `reactCompiler: true` (React Compiler enabled — significant — auto-memoizes components, reduces need for `useMemo`/`useCallback`)
- `serverExternalPackages: ["pdf-parse"]`
- Security headers globally: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=()`
- Static asset caching: `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/*`
- Redirects: `/ai-coach`, `/aicoach` → `/coach` (permanent)
- Images: avif + webp formats, 24h cache
- Sentry wrapper applied via `withSentryConfig`

### `vercel.json`
- 10 active cron jobs (up from 0 in audit):

| Cron Path | Schedule (UTC) | Schedule (IST equivalent) | Purpose |
|-----------|----------------|---------------------------|---------|
| `/api/cron/generate-briefings` | `30 20 * * *` | 2:00 AM | Generate next-day Daily Briefings |
| `/api/cron/dispatch-notifications` | `*/5 * * * *` | every 5 min | Push notification dispatch |
| `/api/cron/evaluate-streaks` | `0 19 * * *` | 12:30 AM | Day-end streak evaluation |
| `/api/cron/generate-weekly-recaps` | `0 6 * * 0` | 11:30 AM Sun | Weekly Recap generation |
| `/api/cron/cohort-leaderboard-snapshot` | `30 14 * * 0` | 8:00 PM Sun | Weekly cohort snapshot |
| `/api/cron/cleanup-photo-doubts` | `0 1 * * *` | 6:30 AM | Photo doubt cleanup (privacy) |
| `/api/cron/fsrs-due-reminder` | `0 7 * * *` | 12:30 PM | FSRS due-card push reminder |
| `/api/cron/purge-deleted-accounts` | `0 2 * * *` | 7:30 AM | DPDP-compliant account purge |
| `/api/cron/trial-d3-segment` | `30 12 * * *` | 6:00 PM | Trial Day 3 segmentation |
| `/api/cron/trial-d5-warmup` | `30 12 * * *` | 6:00 PM | Trial Day 5 warmup |

### `.env.example` — required environment variables (28 keys)
- Supabase: URL, anon key, service role key
- OpenAI: API key
- Razorpay: key id, secret, webhook secret
- Sentry: DSN, auth token, org, project
- App: APP_URL, SITE_URL, ADMIN_EMAILS, ADMIN_EMAIL_PUBLIC, RAG_CONFIDENCE_THRESHOLD (default 0.75)
- Cron: CRON_SECRET
- Web Push: VAPID public/private, VAPID_SUBJECT
- WhatsApp: PROVIDER (default aisensy), API_KEY, PHONE_NUMBER_ID, BUSINESS_ACCOUNT_ID, VERIFY_TOKEN, APP_SECRET

### `middleware.ts/js` at project root
- **Still absent** (only Next.js compiled artifacts in `node_modules` / `.next`). Auth duplication across 96+ routes is **the single largest unaddressed architecture debt** from the May 15 audit.

### `tsconfig` / `jsconfig`
- `jsconfig.json` only — TypeScript not adopted broadly. `@/*` alias points to `src/*`. A few TS files exist (`ThemeContext.tsx`, `FocusAmbientBackground.tsx`, `AIDustLayer.tsx`, `useIdleDetection.ts`, `ai-dust.config.ts`, `ambient-background.config.ts`). No `tsconfig.json` at root (only `tsconfig.tsbuildinfo` in build artifacts).

### Sentry config files
- `instrumentation.js` (Next.js 16 instrumentation hook)
- `sentry.client.config.js`, `sentry.server.config.js`, `sentry.edge.config.js`
- Closes the OPS-1 critical gap from the audit.

---

## 1.3 Database Schema — Migrations Inventory (38 files)

### Pre-2026-05-17 (legacy, partial coverage — present in May 15 audit)

| File | Purpose |
|------|---------|
| `concept_graph_migration.sql` | concepts, concept_edges, mastery_state, cards, questions |
| `voice_migration.sql` | voice_calls |
| `quickchat_migration.sql` | conversations |
| `migrations.sql` (root) | early consolidated baseline |
| `migrations/weak_topics_tables.sql` | weak_topics + topic_attempts |
| `migrations/learning_events.sql` | learning_events + pgvector |
| `migrations/match_learning_events.sql` | RPC |
| `migrations/generated_artifacts.sql` | artifact storage |
| `migrations/spaced_repetition_cards.sql` | SM-2 / FSRS cards table |
| `migrations/add_active_time_to_focus_progress.sql` | ALTER |
| `migrations/add_document_columns_to_focus_progress.sql` | ALTER |
| `migrations/enable_realtime_for_progress.sql` | Realtime publication for 7 tables |
| `migrations/20260429_add_subject_to_exams.sql` | ALTER exams |
| `migrations/20260429_enable_realtime_weak_topics.sql` | Realtime |
| `migrations/20260504120000_add_theme_preference.sql` | profile.theme_preference |
| `migrations/20260515_create_mastery_topics.sql` | mastery_topics CREATE |

### Post-audit (≥ 2026-05-17) — the schema-reproducibility fix + 12 new features

| File | Purpose |
|------|---------|
| `20260517000001_baseline_schema.sql` | **THE big one** — likely fills the 13 missing tables flagged in audit (documents, document_chunks, focus_progress base, study_streaks, exams, pdfs_metadata, etc.) |
| `20260517000002_rpcs.sql` | match_documents, match_documents_multi, increment_memory_weight (audit's missing RPC migrations) |
| `20260517000003_doc_processing_realtime.sql` | Realtime for documents.concept_extraction_status — enables PDF processing status indicator |
| `20260517000004_pricing_v2.sql` | New pricing tier structure |
| `20260517000005_push_notifications.sql` | push_subscriptions, notification preferences |
| `20260517000006_daily_briefings.sql` | daily_briefings storage + listen tracking |
| `20260517000007_cohorts_full.sql` | cohorts, cohort_members, leaderboard snapshots, handles |
| `20260517000008_photo_doubts.sql` | photo_doubts with TTL purge |
| `20260517000009_payment_orders.sql` | **Idempotency layer** for Razorpay webhooks (closes MEDIUM-2 debt) |
| `20260517000010_streak_freeze.sql` | streak_freezes |
| `20260517000011_pyqs.sql` | pyqs, pyq_problems, pyq_attempts, slug index |
| `20260519000001_rls_core_tables.sql` | RLS hardening on legacy core tables |
| `20260519000002_storage_buckets.sql` | photo-doubts bucket, briefings audio bucket |
| `20260519000003_waitlist_emails.sql` | waitlist_emails |
| `20260519000004_account_deletion.sql` | account_deletions queue + DPDP-compliant purge |
| `20260519000005_utm_referral_tracking.sql` | utm_visits, parent_referrals |
| `20260519000006_concept_graph.sql` | Concept graph hardening / re-CREATE |
| `20260519000007_missing_tables.sql` | Final mop-up of audit's "13 missing tables" list |
| `20260520000001_streak_eval_idempotency.sql` | cron streak eval idempotency keys |
| `20260520000002_race_condition_constraints.sql` | Critical: race-condition guards on streak / pricing |
| `20260520000003_privacy_columns.sql` | DPDP privacy flags |
| `20260523000001_activation_schema.sql` | First-7-day activation funnel tracking |

**Verdict:** the audit's most critical migration debt (`DB-1: 13 tables without migrations`) appears **largely closed**. Reproducibility should now be possible from `supabase/migrations/` alone — but this needs a verification step (run a clean `supabase db reset` against a scratch project).

### Storage buckets (per migrations)
- `documents` (PDFs)
- `photo-doubts` (photo doubt images, TTL-purged)
- `briefings` (daily briefing audio)

### Tables present (consolidated, ~35+)
Auth-adjacent: `profiles`, `user_plans`
Q&A: `qa_cache`, `qa_usage`, `answer_feedback`, `conversations`
Documents & RAG: `documents`, `document_chunks`, `pdfs_metadata`
Knowledge graph: `concepts`, `concept_edges`, `mastery_state`, `cards`, `questions`
Learning: `learning_events`, `mastery_topics`, `weak_topics`, `topic_attempts`, `spaced_repetition_cards`, `generated_artifacts`, `revision_topics`, `syllabus_topics`, `user_memory`
Study: `focus_progress`, `study_streaks`, `streak_freezes`, `exams`
Voice: `voice_calls`
**NEW since audit:**
- `payment_orders` (Razorpay idempotency)
- `push_subscriptions`, `notification_preferences`
- `daily_briefings`, `briefing_listens`
- `cohorts`, `cohort_members`, `cohort_leaderboard_snapshots`
- `photo_doubts`
- `pyqs`, `pyq_problems`, `pyq_attempts`
- `waitlist_emails`
- `account_deletions`
- `utm_visits`, `parent_referrals`
- Activation funnel tables

### RPC functions (confirmed present in migration files)
- `match_documents(query_embedding, match_count, doc_id)`
- `match_documents_multi(query_embedding, match_count, doc_ids)`
- `match_learning_events(...)`
- `sr_next_due(user_id)` (FSRS-aware SRS due date)
- `increment_memory_weight(...)`
- `handle_new_user()` (auto-create profiles row)

### Realtime publications
- Tables broadcasting: `learning_events`, `focus_progress`, `mastery_topics`, `weak_topics`, `exams`, `spaced_repetition_cards`, `study_streaks`, `documents` (status field)

---

## 1.4 API Endpoints Inventory (96+ confirmed routes, Glob truncated)

### By domain

**Core Q&A (5)**
- `POST /api/ask` — streaming Q&A (main path; custom `__META__`/`__CONV__` protocol)
- `POST /api/ask-ai` — non-streaming Q&A (legacy)
- `POST /api/quick-chat` — fast RAG without persistence
- `POST /api/progress/ask` — progress-tracked Q&A wrapper
- `POST /api/answer-feedback` — 👍/👎 + flag

**PDF Pipeline (10)**
- `POST /api/process-pdf` — full pipeline (chunk + embed + concepts + cards)
- `POST /api/upload` — simple upload
- `POST /api/parse-pdf` — text-only
- `POST /api/store-pdf-only` — store w/o processing
- `POST /api/save-pdf` — bookmark
- `GET /api/documents`, `GET /api/documents/sample`
- `GET/PATCH/PUT /api/user-pdfs`, `GET /api/get-pdfs`
- `POST /api/delete-document`, `DELETE /api/delete-pdf` (**SECURITY: still has ownership-check issue per audit unless quietly fixed**)

**Conversations & Chat (4)**
- `GET /api/conversations` — **SECURITY: audit flagged unauth bypass; needs verification it was fixed**
- `GET/PATCH/DELETE /api/conversations/[id]`
- `POST /api/chat/send`, `GET /api/chat/history` (legacy)

**Progress & Events (5)**
- `GET /api/progress/summary` — single aggregation endpoint (12+ metrics)
- `GET /api/progress`
- `POST /api/events`, `POST /api/events/embed`
- `POST /api/activity`

**Spaced Repetition (3)**
- `GET /api/cards/due`, `GET /api/cards/sr_due`
- `POST /api/cards/[id]/review`

**Quiz (4)**
- `POST /api/generate-quiz`
- `POST /api/quiz-results`
- `POST /api/quiz/ai-coach`
- `POST /api/quiz/friday/generate` — **NEW**: Weekly Friday quiz feature

**Mock Tests (3)** — **NEW**
- `POST /api/mock-test/create`
- `GET /api/mock-test/history`
- `POST /api/mock-test/submit`

**AI Helpers (5)**
- `POST /api/ai/evaluate-answer` — grading
- `POST /api/ai/generate-questions`
- `GET /api/ai/search-topics`
- `GET /api/ai/focus-tip`
- `POST /api/artifacts/generate`

**Focus Mode (2)**
- `POST /api/generate-focus-tasks` — 2-pass gpt-4o + gpt-4o-mini
- `GET/POST /api/focus-progress`

**Study Plan (3)**
- `POST /api/study-plan/generate`
- `GET /api/study-plan/adaptive`
- `POST /api/daily-plan`

**Voice Tutor (5)**
- `POST /api/voice/start`, `transcribe`, `respond`, `speak`, `end`

**Exams (2)**
- `GET/POST/PATCH /api/exam`
- `GET /api/exam/phase` — **NEW** post-exam transition state

**Weak Topics & Mastery (3)**
- `GET/POST /api/weak-topics`
- `GET /api/mastery/get`, `POST /api/mastery/update`

**Streak (3)**
- `GET/POST /api/streak`
- `GET /api/streak/status` — **NEW** freeze-aware

**Brain Map (2)** — **NEW** (graph promoted from /dev)
- `GET /api/brain-map`
- `POST /api/brain-map/snapshot` — shareable snapshot

**Cohort & Leaderboard (3)** — **NEW**
- `GET /api/cohort/me`
- `GET /api/cohort/leaderboard`
- `POST /api/cohort/regenerate-handle`

**PYQ Marketplace (4 + admin)** — **NEW**
- `GET /api/pyqs/[slug]`
- `POST /api/pyqs/search`
- `POST /api/pyqs/query`
- `POST /api/admin/pyqs/ingest`, `GET/PATCH/DELETE /api/admin/pyqs/[id]`

**Trial Conversion (1)** — **NEW**
- `POST /api/decompression` (cognitive load / trial conversion detector)
- `GET /api/trial/status`
- `GET /api/admin/trial-segments` (admin page)

**Photo Doubt Cam (1)** — **NEW**
- `POST /api/photo-doubt` — image OCR + Q&A pipeline

**Daily Briefings (2)** — **NEW**
- `GET /api/briefings/today`
- `POST /api/briefings/listened`

**Push Notifications (3)** — **NEW**
- `POST /api/push/subscribe`, `/unsubscribe`
- `GET/POST /api/notifications/preferences`

**Subscription Lifecycle (2)** — **NEW**
- `POST /api/subscription/cancel`
- `POST /api/subscription/pause`

**Family Plan (2)** — **NEW**
- `POST /api/family/invite`
- `POST /api/family/redeem`

**Referrals & Growth (3)** — **NEW**
- `POST /api/parent-referral`
- `GET /api/admin/referrals`
- `POST /api/waitlist`

**Payments (3)**
- `POST /api/payments/create-order`
- `POST /api/payments/verify`
- `POST /api/payments/webhook` — now idempotency-protected via `payment_orders` table

**User Data / DPDP (2)** — **NEW**
- `POST /api/user/export` — full data export
- `POST /api/user/delete` — account deletion request

**Concept Graph (2 dev)**
- `POST /api/concepts/backfill` (dev — needs production gate)
- `GET /api/graph/[docId]`

**Webhooks (1)** — **NEW**
- `POST /api/webhooks/whatsapp` — AiSensy/Meta webhook with HMAC verification

**Onboarding (1)** — **NEW**
- `POST /api/onboarding/complete`

**Memory & Syllabus (2)**
- `POST /api/memory/weak-topic`
- `GET /api/syllabus`

**Document Generation (1)**
- `POST /api/generate-document`

**Health (1)**
- `GET /api/health` (closes OPS-5 from audit)

**Cron Jobs (10)** — listed in §1.2

### Auth pattern
**Still inline-duplicated** across all routes (~19 lines per route × 96 routes = ~1,800 lines of duplicated auth). No `middleware.ts/js` at root. No `withAuth` wrapper found in `src/lib/`. **ARCH-1 from audit is unaddressed.**

### Rate limiting
- Plan-based: `src/lib/planLimits.js`
- Voice-specific: `src/lib/voiceLimits.js`
- Internal bypass: `src/lib/internalAccess.js`
- **NEW since audit:** `src/lib/circuitBreaker.js`, `src/lib/retry.js` (resilience patterns added)

### Endpoints lacking documented rate limiting or validation (high-risk for cost runaway)
- `POST /api/photo-doubt` — calls gpt-4o vision; verify daily caps per plan
- `POST /api/decompression` — calls LLM on every detection; verify caching
- `POST /api/briefings/today` — should be read-only (briefings generated by cron); confirm
- `POST /api/admin/*` — verify gated by admin-role check, not just `internal_dev` flag
- `POST /api/concepts/backfill` — still callable in prod per audit; verify NODE_ENV gate

---

## 1.5 Pages Inventory (35 pages)

**Public / pre-auth (8)**
- `/` landing
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/pricing`
- `/auth/callback` (route handler, not page)
- `/post-exam` (publicly accessible? — verify)

**Onboarding (1)**
- `/onboarding`

**Core app (10)**
- `/dashboard`, `/ask-ai`, `/quiz`, `/focus`, `/study`, `/exams`, `/progress`, `/call-tutor`, `/chat` (legacy), `/brain-map`

**New product surfaces (NEW since audit, 11)**
- `/brain-map`, `/brain-map/share` — public Brain Map share page
- `/cohort` — leaderboard
- `/pyqs`, `/pyqs/[slug]`, `/pyqs/practice` — PYQ marketplace
- `/mock-test` — mock test simulator
- `/quiz/friday` — weekly Friday quiz
- `/welcome-back` — re-engagement
- `/exam-transition`, `/post-exam` — pre/post-exam flows

**Trial funnel (3)**
- `/trial/decision`, `/trial/lapsed`, `/trial/success`

**Admin (3)**
- `/admin/pyqs` — PYQ admin
- `/admin/trial-segments` — trial cohort viewer
- `/admin/sentry-test` — Sentry verification

**Dev (2)**
- `/dev/graph/[docId]`, `/dev/backfill`

### Page gaps vs. audit notes
- Admin dashboard remains **partial** — three narrow admin pages exist but no general user-management dashboard
- `/admin/sentry-test` is the only Sentry verification surface
- Account settings / profile editing page — **still missing**
- No `/admin/users` for plan management
- `/account` or `/settings` page for user-controlled privacy / data export — verify routing target of new `user/export` and `user/delete` APIs

---

## 1.6 Libraries & Utilities (`src/lib/`, ~100 modules)

### Domain libraries

**Auth & access**
- `auth.js`, `serverAuth.js`, `supabase.js`, `supabaseServer.js`, `internalAccess.js`, `devGuard.js`, `tokens.js`

**AI Q&A pipeline**
- `rag.js`, `queryClassifier.js`, `llmClassifier.js`, `promptAssembler.js`, `postProcessor.js`, `answerTemplates.js`, `normalizeMarkdownTables.js`, `parseAnswerSections.js`, `detectExportIntent.js`, `detectTopic.js`, `chunkText.js`
- `prompts/coach.js`, `prompts/base.js`, `prompts/domains/{cs,physics,math,biology,chemistry,medical,law,finance,electrical,mechanical,business,general,index}.js` (11 domains)

**Learning & SRS**
- `mastery.js`, `sm2Scheduler.js`, `fsrs/scheduler.js` (NEW — ts-fsrs adapter), `topicClusters.js`, `adaptivePlanner.js` (audit said missing → **fixed**), `focusPlanner.js` + `focusPlanner.test.js`

**Plan limits & resilience**
- `planLimits.js`, `voiceLimits.js`, `pricing.js` (NEW — pricing v2 tier system)
- `retry.js`, `circuitBreaker.js` (NEW — resilience)
- `sessionCounter.js`

**Notifications & engagement (NEW)**
- `push.js` (web push helpers)
- `notifications/copy.js`, `notifications/dispatcher.js`, `notifications/guardrails.js` (anti-spam)
- `briefings/prompt.js` (Daily Briefing prompt builder)
- `decompression/detector.js` (Trial Conversion Experience detection)

**Cohorts & social (NEW)**
- `cohorts/handles.js`, `cohorts/assignment.js`

**PYQ pipeline (NEW)**
- `pyqs/slugGenerator.js`

**Exam lifecycle (NEW)**
- `exam/transitions.js`, `examUtils.js`

**Privacy & GDPR/DPDP (NEW)**
- `privacy/anonymize.js`

**Analytics**
- `analytics/computeFocusScore.js`, `computeTrends.js`, `computeStreak.js`, `computeProgress.js`, `computeAccuracy.js`, `computeStudyDepth.js`, `generateInsights.js` (each with `__tests__` colocated)

**Ingest pipeline**
- `ingest/extractConcepts.js`, `validateConcepts.js`, `persistGraph.js`, `generateCards.js`, `persistCards.js`

**Misc utilities**
- `imageCompression.js`, `india-locations.js`, `utmCapture.js`, `format/date.js`, `wordSegmenter.js`, `track.js`, `eventRegistry.js`, `realtimeDebounce.js`, `chatStorage.js`, `subjectOptions.js`, `dashboardMode.js`, `progressUtils.js`, `progressBackend.js`, `artifactGenerator.js`, `askWithDownload.js`, `useChatMessages.js`, `useFocusSessionChat.js`, `useDocumentProgress.js`, `memory.js`, `styles.js`, `skeletonStyles.js`

### Dead-code candidates (worth verifying)
- `chat/send`, `chat/history` API + `chatStorage.js` flagged as "legacy" — confirm if still referenced
- `pdf-parser` dependency (duplicate of `pdf-parse`) — audit still applies
- `marked` + `markdown-it` (both still installed alongside `react-markdown`)
- `@anthropic-ai/sdk` — audit's "uncertain usage" status still pending verification
- `src/next-app/` directory — likely worktree artifact, possibly dead
- `temp_superpowers/` — should be cleaned

---

## 1.7 Components Inventory (~100 components)

### By domain
- **Dashboard:** `BentoGrid`, `GreetingRow`, `DynamicGreeting`, `StudyModeCards`, `AskAIHeroCard`, `StudyPlanSection`, `QuizSection`, `ProgressLayout`, `BrainSection`, `ExamSection`, `ExamsHeroCard`, `VoiceCallSection`, `AnalyticsSection`, `FocusModeSection`, `WeeklyRecapCard`, `ExamReadinessShareCard`, `AskAISection`, `DashboardSidebar`, `UploadSection`, `UploadModal`
- **Exams (sub-cluster):** `AddExamModal`, `EmptyState`, `ExamCard`, `ExamCountdownSection`, `StudyPlanModal`, `StudySuggestion`, `WeakTopicCard`, `WeakTopicsSection`, `ExamsSidebar`
- **Progress (15):** `AccuracyCard`, `AnimatedNumber`, `Celebration`, `CognitiveProgressCard`, `ExamCountdownCard`, `FocusScoreCard`, `InsightsPanel`, `LiveIndicator`, `MiniBarChart`, `ProgressQuestionsPanel`, `ProgressRing`, `SessionDepthCard`, `SpacedRepetitionCard`, `StreakCard`, `StudyPlanCard`, `StudyTimeCard`, `WeeklyRecapCard`, `useChangePulse`, two error-boundaries
- **Focus:** `FocusInlineChat`, `FocusAmbience`, `FocusAmbientBackground` (TS), `FocusModeLoader`, `FocusSessionActive`, `FocusSessionSetup`, `ambient-background.config.ts`
- **Quiz:** `QuestionSkeleton`, `QuizPDFSelector`
- **Answer display:** `AnswerSection`, `ConfidenceBadge`, `DiagramBlock`, `DynamicFollowUps`, `QuickSummary`, `SessionCallout`, `StructuredAnswer`, `AnswerRating`
- **Artifacts:** `ArtifactModal`, `FlashcardViewer`, `QuizViewer`
- **AskAI:** `AskAISidebar`, `ModelSwitcher`, `ModeSwitcher`
- **QuickChat:** `QuickChatDrawer`, `QuickChatVortex`
- **Theme:** `ThemeToggle.tsx`
- **AI Dust (TS):** `AIDustLayer.tsx`, `useIdleDetection.ts`, `ai-dust.config.ts`
- **Layout / shared:** `Sidebar`, `RightPanel`, `AppLayout`, `TopBar`, `ProgressBar`, `Avatar`, `Button`, `Buttons`, `Card`, `TimerRing`, `DashboardSkeleton`, `QuizSkeleton`, `ContextualSidebar`, `DeleteConfirmationModal`, `UserProfile`
- **Other:** `ThinkingAnimation`, `MilestoneToast`, `ErrorBoundary`, `BrainCard`, `AskInput`, `AISuggestionCard`, `TrackingProvider`

### Likely consolidation opportunities (DRY targets)
- `Button` + `Buttons` co-exist — confirm one isn't dead
- Two `WeeklyRecapCard` files (root + progress subfolder) — confirm one is dead
- Two `UploadModal` files (root + dashboard subfolder)
- Two `WeakTopicCard` (exams subfolder + plain)
- `ErrorBoundary` + `ProgressErrorBoundary` + `CardErrorBoundary` — fine if scoped; flag if overlapping

---

## 1.8 Strategic Markdown Documentation in Repo Root

| File | Size | Date | Notes |
|------|------|------|-------|
| `PROJECT_PROGRESS_REPORT.md` | 54 KB | 2026-05-15 | Most comprehensive — partial source for this analysis |
| `CLAUDE_CODE_GROWTH_SPRINT_PROMPT.md` | 44 KB | 2026-05-23 | Most recent growth strategy prompt |
| `SYSTEM_ARCHITECTURE_MAP.md` | 38 KB | 2026-05-16 | Architecture diagrams |
| `system_map.md` | 31 KB | 2026-05-04 | Older overlapping doc |
| `TECH_DEBT_AUDIT.md` | 24 KB | 2026-05-16 | Debt inventory (mostly addressed) |
| `LAUNCH_COPY_AND_ASSETS.md` | 23 KB | 2026-05-19 | Brand/copy library |
| `NEXT_DEVELOPMENT_ROADMAP.md` | 21 KB | 2026-05-16 | Sprint plan |
| `FEATURE_STATUS_MATRIX.md` | 18 KB | 2026-05-16 | Per-feature checklist |
| `market_research_report.md` | 12 KB | Apr 2026 | Geo + WTP analysis |
| `TEST_SUMMARY_TASKS_13_16.md` | 13 KB | 2026-05-04 | Test history |
| `TASKS_11_17_COMPLETION_REPORT.md` | 10 KB | 2026-05-04 | Task completion log |
| `marketing_strategy_debate.md` | 8 KB | 2026-05-04 | SM × CA dialectical analysis |
| `project_documentation.md` | 7 KB | 2026-05-04 | Older doc |
| `IMPLEMENTATION_COMPLETE.md` | 6 KB | 2026-05-04 | Snapshot |
| `marketing_roadmap.md` | 5 KB | 2026-05-04 | 8-week marketing plan |
| `qa-framework.md` | 4 KB | 2026-04-07 | QA framework |
| `tasks.md`, `execution.md` | small | various | Older task lists |
| `fine_tuning_dataset.jsonl` | 47 KB | 2026-05-04 | Fine-tuning data |

**Documentation observation:** the project has unusually deep internal documentation. The risk is *drift* — the May 15 docs are already stale by 12 days because of the rapid feature delivery cadence (PYQ, Mock Tests, Cohorts, etc., all shipped after the audit). A monthly cadence to re-run this kind of analysis is warranted.

---

## 1.9 Build & Operational Surface

- **Vercel deployment** with security headers, image optimization, 10 active crons
- **Sentry** wired up for client/server/edge runtimes via `withSentryConfig`
- **No GitHub Actions** still — `.github/` directory exists but content was not deeply inspected; OPS-2 verification needed
- **Playwright** configured (chromium + mobile-chrome) — 3 e2e specs present
- **Load tests** — `tests/load/load-test.mjs` exists with no documented baselines
- **Build artifacts:** `tsconfig.tsbuildinfo` (122 KB) and `test-output.txt` (103 KB) checked into the working tree — should be `.gitignore`d
- **`build_output.txt`, `dev_server.log`** — also working-tree artifacts; minor housekeeping
- **`.worktrees/`** — git worktrees in use for parallel branches (e.g. `dashboard-redesign`)

---

## 1.10 Phase 1 Headline Numbers (for executive summary)

| Metric | Value |
|--------|-------|
| Total **API routes** | 96+ |
| Total **pages** | 35 |
| Total **components** | ~100 |
| Total **lib modules** | ~100 |
| Total **migrations** | 38 (+22 since 2026-05-15 audit) |
| Total **DB tables** (consolidated) | ~35 |
| Total **RPCs** | 6 documented |
| Total **active cron jobs** | 10 |
| Total **unit tests** | 23 |
| Total **e2e tests** | 4 spec files |
| **External integrations** | OpenAI, Anthropic SDK (unused?), Supabase, Razorpay, Sentry, web-push (VAPID), WhatsApp (AiSensy) |
| **AI models in use** | gpt-4o, gpt-4o-mini, text-embedding-3-small (Claude TBD) |
| **Pricing tiers (Pricing v2)** | Free, Student (₹199), Pro (₹399), Annual (₹4,499) per user memory — verify against `pricing.js` |
| **Plan tiers in code** | Free / Student / Pro / School + Internal Dev bypass |

---

## 1.11 Inventory-Level Open Questions (for Phase 2-3 follow-up)

1. **Has the `/api/conversations` auth bypass actually been patched?** Audit flagged it CRITICAL — file still exists; verify auth code.
2. **Has `/api/delete-pdf` ownership check been added?** Same.
3. **Is `@anthropic-ai/sdk` now used?** Audit said no — check for imports across `src/`.
4. **Is `pdf-parser` (vs `pdf-parse`) actually called anywhere?** Verify before removing.
5. **Is `src/next-app/` directory dead code?** Likely worktree artifact, but confirm.
6. **Are admin routes (`/api/admin/*`) properly gated?** Audit said admin tooling missing — three admin pages now exist; verify auth model.
7. **Does Sentry receive errors from cron handlers?** Edge config exists; confirm coverage.
8. **What is the actual `pricing.js` tier shape?** Memory says ₹199/₹399/₹4499; CLAUDE.md says ₹299/₹599; need source of truth.
9. **GitHub Actions workflow file** — does `.github/workflows/` contain a CI gate? (Audit said no; verify since.)
10. **Light mode CSS** — has `.theme-light` been populated since the audit's UX-3 finding?

These 10 questions will be resolved in Phase 2 (feature analysis) and Phase 3 (tech debt re-assessment).
