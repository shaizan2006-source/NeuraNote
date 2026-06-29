# Phase 2 — Feature Catalog, AI Cost & Performance

*Generated: 2026-05-27 | Reconciled with FEATURE_STATUS_MATRIX.md (2026-05-16) and live codebase scan*

> **Legend**
> ✅ Production-ready · 🟡 Working, rough edges · 🔴 Stub / not usable · 🧪 Dev-only · ⚠️ Has known issue
> Completeness: 0-100% (functional + edge cases + mobile parity).

---

## 2.1 Feature catalog (37 user-facing features)

### A. Core learning loop

| # | Feature | Status | % | Tier | Files (primary) | Dependencies | Notable gaps |
|---|---------|--------|---|------|-----------------|--------------|--------------|
| 1 | **PDF upload (text)** | ✅ | 90 | Free 1 / Student 10 / Pro ∞ | `/api/upload`, `/api/process-pdf`, `/api/parse-pdf`, `/api/store-pdf-only`, `documents` + `document_chunks` + Storage bucket | OpenAI embeddings, pdf-parse | No drag-drop multi-file; no folder org |
| 2 | **PDF upload (scanned/OCR)** | ✅ | 85 | same | `/api/process-pdf` (gpt-4o vision fallback) | OpenAI gpt-4o | High cost on long scanned PDFs |
| 3 | **PDF processing status indicator** | 🟡 | 60 | all | `useDocumentProgress.js`, Realtime publication on `documents` | Supabase Realtime | Audit said missing → migration `20260517000003_doc_processing_realtime` added; UI surface needs verification |
| 4 | **Multi-PDF Q&A** | ✅ | 95 | all | `/api/ask`, `rag.js`, RPC `match_documents_multi` | pgvector | — |
| 5 | **PDF deletion (with ownership check)** | ✅ | 95 | all | `/api/delete-pdf` (verifyAuth + ownership + cascade delete + storage cleanup) | — | Audit's CRITICAL-2 fixed; uses 404-on-mismatch to prevent enumeration |
| 6 | **PDF library management** | 🟡 | 55 | all | `/api/user-pdfs`, `/api/get-pdfs`, `/api/documents` | — | No rename / tag / folder / search UI |
| 7 | **Q&A (streaming RAG)** | ✅ | 95 | all | `/api/ask`, `queryClassifier`, `promptAssembler`, `rag.js`, `qa_cache` | OpenAI gpt-4o-mini, pgvector | Custom `__META__` protocol fragile (versioning todo) |
| 8 | **Q&A (general knowledge, no PDF)** | ✅ | 95 | all | same; cache hit path | — | — |
| 9 | **AI Coach Mode (Socratic)** | ✅ | 90 | all | `/api/ask` (coach branch), `prompts/coach.js` | gpt-4o-mini | No Q&A limit on coach mode — abuse vector for free tier? verify |
| 10 | **Conversation history** | ✅ | 90 | all | `/api/conversations`, `/api/conversations/[id]`, JSON-array storage | — | Auth bypass fixed; pagination not yet |
| 11 | **Follow-up suggestions** | ✅ | 90 | all | `DynamicFollowUps.jsx`, inline LLM extraction | — | — |
| 12 | **Answer rating + flag** | ✅ | 90 | all | `/api/answer-feedback`, `AnswerRating.jsx` | — | — |
| 13 | **Confidence badge** | ✅ | 85 | all | `ConfidenceBadge.jsx` | — | Heuristic; not user-visibly calibrated |
| 14 | **Source citation (top-5 chunks)** | ✅ | 85 | all | `__META__` payload | — | UI presentation could be clearer |

### B. Quiz & evaluation

| # | Feature | Status | % | Tier | Files | AI Cost (per use) | Notes |
|---|---------|--------|---|------|-------|-------------------|-------|
| 15 | **Quiz generation (MCQ from PDF)** | ✅ | 85 | all | `/api/generate-quiz`, `questions` table | ~2k tokens gpt-4o-mini ≈ $0.0003 | — |
| 16 | **AI answer evaluation** | ✅ | 85 | all | `/api/ai/evaluate-answer` | ~1.5k gpt-4o-mini ≈ $0.0002 | — |
| 17 | **Quiz difficulty selector** | 🔴 | 0 | — | — | — | Audit gap — not yet built |
| 18 | **Quiz history / past attempts** | 🔴 | 0 | — | — | — | Audit gap — not yet built |
| 19 | **Quiz session resume** | ✅ | 85 | all | sessionStorage in `/quiz/page.jsx` | — | — |
| 20 | **Friday weekly quiz** | ✅ | 80 | Pro+ | `/api/quiz/friday/generate`, `/quiz/friday` page | ~2k gpt-4o-mini | NEW — verify cron triggers it |
| 21 | **Mock test simulator** | ✅ | 80 | Pro+ | `/api/mock-test/{create,history,submit}`, `/mock-test` page | ~5-10k gpt-4o-mini per mock ≈ $0.001-0.002 | NEW — full-length simulated paper |

### C. Spaced repetition

| # | Feature | Status | % | Tier | Files | Notes |
|---|---------|--------|---|------|-------|-------|
| 22 | **FSRS-backed cards (NEW)** | ✅ | 85 | all | `ts-fsrs@5.3.3`, `lib/fsrs/scheduler.js`, `sm2Scheduler.js` (legacy) | Audit had SM-2; now ts-fsrs added — both present? verify migration path |
| 23 | **SRS card review (keyboard)** | ✅ | 90 | all | `/study/page.jsx`, `/api/cards/[id]/review` | Keys 1-4, spacebar |
| 24 | **FSRS due reminder push** | ✅ | 80 | all | `cron/fsrs-due-reminder` | NEW — daily push at 7am UTC |
| 25 | **Manual SRS card creation** | 🔴 | 0 | — | — | Audit gap — still missing |
| 26 | **SRS card editing** | 🔴 | 0 | — | — | Audit gap — still missing |

### D. Study planning

| # | Feature | Status | % | Files | AI Cost |
|---|---------|--------|---|-------|---------|
| 27 | **Daily plan (AI-ranked, exam-aware)** | ✅ | 85 | `/api/daily-plan`, `adaptivePlanner.js` (audit said missing — now present) | ~2k gpt-4o-mini |
| 28 | **Adaptive study plan** | ✅ | 80 | `/api/study-plan/adaptive` | — |
| 29 | **LLM study plan generation** | ✅ | 80 | `/api/study-plan/generate` | ~3k gpt-4o-mini |

### E. Focus & deep work

| # | Feature | Status | % | Files | AI Cost |
|---|---------|--------|---|-------|---------|
| 30 | **Focus Mode (Pomodoro + AI tasks)** | ✅ | 85 | `/focus/page.jsx`, `/api/generate-focus-tasks` (2-pass) | ~4-8k tokens, gpt-4o + gpt-4o-mini ≈ $0.005-0.01 (expensive!) |
| 31 | **Focus inline chat** | ✅ | 85 | `FocusInlineChat.jsx` | — |
| 32 | **Focus ambient background** | ✅ | 95 | `FocusAmbientBackground.tsx` (parallax + breathing CSS) | — |
| 33 | **Focus session recovery** | ✅ | 90 | localStorage, 24h expiry | — |
| 34 | **Focus timer pause** | 🔴 | 0 | — | Audit gap — still missing |

### F. Voice tutor

| # | Feature | Status | % | Cost / call | Notes |
|---|---------|--------|---|-------------|-------|
| 35 | **Voice AI Tutor pipeline (5-phase)** | ✅ | 80 | Free 0 / Student 5 / Pro 15 calls/day | Whisper (~$0.006/min) + gpt-4o-mini (~$0.001/turn) + TTS (~$0.015 per 1k chars). 10-min call ≈ $0.20-0.40 per session — **most expensive feature per minute** |
| 36 | **Voice multi-language** | 🟡 | 70 | EN/HI/FR | Other languages untested |
| 37 | **Voice transcript download** | 🔴 | 0 | — | Audit gap — still missing |

### G. Progress & analytics

| # | Feature | Status | % | Files |
|---|---------|--------|---|-------|
| 38 | **12-metric progress dashboard** | ✅ | 90 | `/progress/page.jsx`, `/api/progress/summary`, `progressUtils.js`, `analytics/*` |
| 39 | **Realtime updates (7 tables, 500ms debounce)** | ✅ | 95 | `useRealtimeProgress.js`, `realtimeDebounce.js` |
| 40 | **AI insights panel** | ✅ | 85 | `InsightsPanel.jsx`, `generateInsights.js` |
| 41 | **Weekly recap card** | ✅ | 80 | `WeeklyRecapCard.jsx`, `cron/generate-weekly-recaps` |
| 42 | **Date range filter** | 🔴 | 0 | — Audit gap |
| 43 | **Progress export PDF/CSV** | 🟡 | 40 | `/api/generate-document` works for PDF/DOCX export, but no UI on progress page |

### H. NEW since audit — engagement loops

| # | Feature | Status | % | Files | Notes |
|---|---------|--------|---|-------|-------|
| 44 | **Daily Briefing (audio + TTS)** | ✅ | 80 | `cron/generate-briefings` (8 PM UTC = 2 AM IST), `/api/briefings/today`, `/api/briefings/listened`, `briefings/prompt.js`, briefings storage bucket | ~3-5k gpt-4o-mini + TTS (~$0.015 per minute generated). Probably the highest *per-active-user* recurring cost outside voice. |
| 45 | **Brain Map (production)** | ✅ | 80 | `/brain-map/page.js`, `/brain-map/share/page.js`, `/api/brain-map`, `/api/brain-map/snapshot` | NEW — graph promoted from /dev. Shareable. |
| 46 | **Cohort + Leaderboard** | ✅ | 80 | `/cohort/page.js`, `/api/cohort/{me,leaderboard,regenerate-handle}`, `cron/cohort-leaderboard-snapshot` (Sundays 8 PM IST) | NEW |
| 47 | **PYQ marketplace + practice** | ✅ | 75 | `/pyqs/{[slug],practice}`, `/api/pyqs/{[slug],search,query}`, admin `/admin/pyqs`, `/api/admin/pyqs/{[id],ingest}` | NEW — content marketplace. Admin tooling included. |
| 48 | **Photo Doubt Cam** | ✅ | 75 | `/api/photo-doubt`, `cron/cleanup-photo-doubts`, `imageCompression.js` | NEW — image OCR + Q&A. Privacy: nightly cleanup. |
| 49 | **Streak Freeze** | ✅ | 80 | `/api/streak/status`, `streak_freezes` table, `cron/evaluate-streaks` idempotency | NEW |
| 50 | **Web Push notifications** | ✅ | 85 | `/api/push/{subscribe,unsubscribe}`, `notifications/preferences`, `cron/dispatch-notifications` (every 5 min), `lib/notifications/*`, `lib/push.js` | NEW — VAPID-based. Anti-spam guardrails in `notifications/guardrails.js`. |
| 51 | **WhatsApp integration** | 🟡 | 65 | `/api/webhooks/whatsapp` (HMAC verified) | NEW — receive webhook implemented; send-side coverage unclear from inventory alone |
| 52 | **Trial Conversion Experience (decompression)** | ✅ | 80 | `/api/decompression`, `lib/decompression/detector.js`, `/trial/{decision,lapsed,success}` pages, crons `trial-d3-segment` + `trial-d5-warmup`, admin `/admin/trial-segments` | NEW — cognitive-load aware trial funnel |
| 53 | **Family plan (₹4,499/yr)** | ✅ | 75 | `/api/family/{invite,redeem}`, `pricing.js` | NEW — covers ≥1 student in a family |
| 54 | **Parent referral** | 🟡 | 60 | `/api/parent-referral`, `/api/admin/referrals` | NEW — verify completeness of parent-side UX |
| 55 | **UTM + referral attribution** | ✅ | 75 | `lib/utmCapture.js` (tested), `utm_visits` table, migration `20260519000005` | NEW |
| 56 | **Waitlist** | ✅ | 85 | `/api/waitlist`, `waitlist_emails` table | NEW |

### I. User system & data control

| # | Feature | Status | % | Notes |
|---|---------|--------|---|-------|
| 57 | Email + password signup | ✅ | 90 | Email verification not enforced (audit finding) |
| 58 | Google OAuth | ✅ | 90 | — |
| 59 | 4-step onboarding wizard | ✅ | 90 | `/onboarding`, `/api/onboarding/complete` |
| 60 | Plan management (Free/Student/Pro/Family/School) | 🟡 | 75 | `planLimits.js` PLANS object has STALE prices (₹299/₹599); `pricing.js` is current truth (₹199/₹399/₹4499). **Data drift bug.** |
| 61 | Account deletion (DPDP) | ✅ | 80 | `/api/user/delete`, `cron/purge-deleted-accounts` (daily) |
| 62 | User data export | ✅ | 80 | `/api/user/export` |
| 63 | Privacy controls | ✅ | 75 | `lib/privacy/anonymize.js`, migration `privacy_columns` |
| 64 | Subscription cancel | ✅ | 75 | `/api/subscription/cancel` |
| 65 | Subscription pause | ✅ | 75 | `/api/subscription/pause` |
| 66 | 2FA / MFA | 🔴 | 0 | Audit gap — still missing |
| 67 | Account lockout (backend) | 🔴 | 0 | Audit gap — still missing |

### J. Admin

| # | Feature | Status | % | Notes |
|---|---------|--------|---|-------|
| 68 | Admin: PYQ management | ✅ | 75 | `/admin/pyqs`, `/api/admin/pyqs/*` — first real admin surface |
| 69 | Admin: Trial segments viewer | ✅ | 70 | `/admin/trial-segments` |
| 70 | Admin: Referral viewer | 🟡 | 60 | `/api/admin/referrals` exists; UI status unclear |
| 71 | Admin: General user management | 🔴 | 0 | Still missing — must edit DB directly |
| 72 | Admin: Plan override | 🔴 | 0 | Still missing |

---

## 2.2 AI Cost Analysis

Token costs as of OpenAI pricing for `gpt-4o-mini` ($0.15/M input, $0.60/M output) and `gpt-4o` ($2.50/M input, $10/M output). Embedding `text-embedding-3-small` $0.02/M tokens. Whisper $0.006/min. TTS $15/M chars.

### Per-event cost estimates

| Feature | Model | Tokens / event (est.) | Cost / event (USD) | INR (₹83/$) |
|---------|-------|------------------------|--------------------|-------------|
| Streaming Q&A (cached) | — | 0 | $0.0000 | ₹0.00 |
| Streaming Q&A (fresh, no PDF) | gpt-4o-mini | 2,500 in / 800 out | $0.0009 | ₹0.07 |
| Streaming Q&A (RAG, 5 chunks) | gpt-4o-mini | 4,500 in / 1,000 out | $0.0014 | ₹0.12 |
| Quiz generation (5 MCQs) | gpt-4o-mini | 2,000 in / 1,500 out | $0.0012 | ₹0.10 |
| Answer evaluation | gpt-4o-mini | 1,500 in / 500 out | $0.0005 | ₹0.04 |
| Daily plan | gpt-4o-mini | 2,000 in / 800 out | $0.0008 | ₹0.07 |
| Focus tasks (2-pass) | gpt-4o + gpt-4o-mini | 4,000 / 2,000 | $0.011 | ₹0.91 |
| Daily Briefing text | gpt-4o-mini | 3,000 in / 1,500 out | $0.0014 | ₹0.12 |
| Daily Briefing audio (TTS, 2 min) | tts-1 | ~1.5k chars | $0.023 | ₹1.91 |
| PDF processing (OCR fallback per page) | gpt-4o vision | 1,500 in/page | $0.004/page | ₹0.33/page |
| PDF concept extraction | gpt-4o | 5,000 in / 2,000 out | $0.033 | ₹2.74 |
| Voice turn (transcribe + respond + TTS) | Whisper + 4o-mini + tts-1 | per turn | ~$0.03 | ₹2.49 |
| Voice 10-min call | combined | ~20 turns | ~$0.30 | ₹24.90 |
| Photo Doubt | gpt-4o vision | 2,000 in / 800 out | $0.013 | ₹1.08 |
| Mock test (50 questions) | gpt-4o-mini | ~10k total | $0.005 | ₹0.42 |
| Embedding per PDF (avg 30 chunks) | text-embed-3-small | 30,000 tokens | $0.0006 | ₹0.05 |

### Monthly cost-per-active-user model

Assumptions for a moderately active Pro user during a study month:
- 30 days × 10 Q&A/day = 300 Q&A. 70% cache hit rate → 90 fresh queries × ₹0.10 ≈ **₹9**
- 2 PDFs uploaded × ₹3 concept extraction ≈ **₹6**
- 1 daily briefing × 30 × ₹2 = **₹60**
- 1 focus session/day × 50% conversion × ₹1 = **₹15**
- 3 voice calls/week × 5 min × ₹12.5 = **₹150**
- 2 quizzes/week + evaluation × ₹0.20 = **₹2**
- 4 photo doubts/month × ₹1.10 = **₹4**
- 1 mock test/week × ₹0.50 = **₹2**

**Total: ~₹248/mo ($3.00) cost-of-goods-sold for an active Pro user**.
At Pro pricing ₹399/mo → ~62% gross margin before infrastructure (Supabase, Vercel, Sentry, WhatsApp/AiSensy ~₹0.50/msg).

**Free user ceiling:** 1 PDF (₹6 one-time) + 20 Q&A/day × 30 = 600 queries, generous cache assumed 80% → 120 fresh × ₹0.10 = ₹12 + briefings (if Free gets them) = ₹60 + Voice (Free=0). **Worst-case ₹78/mo per free user** if they're maxed out.

### Cost-runaway risks (no monthly $-cap per user)

| Risk | Vector | Worst-case monthly $ per user | Mitigation present? |
|------|--------|-------------------------------|---------------------|
| Voice abuse on Pro tier | 15 calls/day × 30 × ₹25 = ₹11,250/mo | **₹11,250 (~$135) per user** | Daily call cap exists; minute cap unclear |
| Photo Doubt spam | Image storage + gpt-4o vision | ₹100s/mo possible | Cleanup cron; per-day cap should be verified |
| Coach mode abuse (Free tier loophole) | Audit said no Q&A limit on coach mode | unlimited gpt-4o-mini queries | **VERIFY** in `/api/ask` coach branch |
| Mock test farming | unlimited mocks? | ₹0.50 each × thousands | Per-day cap should be verified |
| PDF upload OCR on huge scanned books | 500 pages × ₹0.33 = ₹165 per upload | Free: 1 PDF, so capped; Pro: unlimited | No per-PDF token cap |

**Recommendation already documented in audit (Tier 1):** add per-user monthly $-spend tracking + soft cap (e.g. ₹500/mo) with alerts before hard cutoff.

---

## 2.3 Performance characteristics

### Frontend (best-effort from code patterns; no Lighthouse data available)

- **Bundle bloat risks (unchanged from audit):**
  - `reactflow@11` (~200 KB gz) — still imported globally; should be `next/dynamic` only on `/brain-map` and `/dev/graph`
  - `recharts@3` (~80 KB gz) — only `/progress` uses it; should be dynamic
  - `framer-motion@12` (~100 KB gz) — used everywhere; tree-shaking partial
  - `langchain@1` (~400 KB gz) — only text splitting is used; replace with `@langchain/textsplitters` only
- **React Compiler enabled** (`next.config.mjs: reactCompiler: true`) → reduces manual `useMemo`/`useCallback` need; net win
- **Image optimization:** AVIF + WebP, 24-hour cache (good)
- **Static asset cache:** `max-age=31536000, immutable` (excellent)
- **Compression:** `compress: true` (good)

### API / DB (from audit + new shape)

| Endpoint | Estimated latency | Bottleneck |
|----------|-------------------|------------|
| `/api/ask` (cached) | 100-200ms | Network + Supabase lookup |
| `/api/ask` (fresh streaming first-token) | 800-1,500ms | OpenAI TTFT + classify + vector search |
| `/api/process-pdf` (small text PDF) | 5-15s | Embedding loop (serial inserts) — **could be batched** |
| `/api/process-pdf` (large OCR) | 30-90s | gpt-4o vision fallback; **timeout risk on Vercel free** |
| `/api/progress/summary` | 1.5-3.0s | 6 parallel queries + `computeWeakTopicClusters()` OpenAI call (audit: PERF-2) |
| Rate-limit checks per request | +50-100ms | DB query on every API call (audit: PERF-1) |
| Realtime → debounced refetch | 500ms + 2s min | Healthy |

### Database query concerns (carry-forward from audit, still relevant)
- IVFFlat `lists=100` — fine until ~1M vectors per table; revisit at scale (DB-4)
- No pg_cron purge for `qa_cache`, `qa_usage`, `learning_events`: ⚠️ **verify** if `pg_cron` was added (NEXT_DEVELOPMENT_ROADMAP S1-4 was planned)
- Some Realtime publications have REPLICA IDENTITY FULL (heavier WAL traffic) — fine for current scale

### Concurrency / scaling cliffs

| Component | Free tier ceiling | Cost to next tier | When it bites |
|-----------|--------------------|---------------------|---------------|
| Supabase | 500 MB DB, 1 GB storage, 50K MAU auth, 100 concurrent realtime | Pro $25/mo (8 GB DB, 100 GB storage, 100K MAU) | ~2,000-5,000 active users |
| OpenAI | Tier 1 default = 30K RPM, $5K/mo | Higher tiers automatically with payment history | Burst loads (e.g. exam-night surge) — **mitigate with rate limits + caching** |
| Vercel | Hobby = limited bandwidth, 100GB/mo | Pro $20/mo + usage | After ~5K-10K weekly users |
| Sentry | Free 5K events/mo | $26/mo for 50K | Quickly with cron + edge events |
| AiSensy WhatsApp | ~₹0.50/msg in India | Volume tiers | Monitor at 10K msgs/mo (~₹5K/mo) |
| VAPID push | Free, browser-native | — | No ceiling |

---

## 2.4 Modularity / vendor lock-in scoring (Phase 4 preview)

| Swap (1 = trivial, 10 = full rewrite) | Difficulty |
|----------------------------------------|------------|
| OpenAI → Claude (gpt-4o-mini → claude-haiku-4.5) | **4** — Anthropic SDK already installed; need prompt re-tuning + streaming-protocol adapter; `__META__` markers tied to OpenAI streaming shape |
| OpenAI → Gemini | 5 — no SDK installed; need full integration |
| Supabase → Postgres + Auth0 | **8** — heavy: pgvector queries, RLS, Auth tied tightly. Realtime would need rewrite. |
| Razorpay → Stripe | 3 — only INR & UPI requirements lock us to Razorpay/Cashfree for India |
| Vercel → AWS (Amplify or ECS) | 5 — Next.js portable; cron jobs would need EventBridge; edge functions trivial |
| Whisper → Deepgram / Google STT | 4 — SDK swap |
| OpenAI TTS → ElevenLabs (better voices, higher cost) | 3 — straightforward |

**Verdict:** core stack is reasonably portable. The biggest lock-in is **Supabase RLS + Realtime + Auth + pgvector + Storage** — a single vendor providing four critical services. This is normally a strength (DX, integration) but a risk (any Supabase outage or pricing change hits four pillars simultaneously).

---

## 2.5 Phase 2 headline findings

1. **The product is materially more complete than the May 15 audit reflects.** ~30 new features have shipped including the entire trial-conversion experience, PYQ marketplace, mock tests, daily briefings, web push, family plans, account deletion, photo doubt cam, cohorts, and WhatsApp infra.
2. **Gross margin at Pro tier is healthy (~62%)** under reasonable engagement assumptions. The risk is concentrated in the voice tutor — at heavy use it can cost more than the Pro subscription pays.
3. **Cost-runaway controls are reactive (daily-count caps), not absolute (monthly $-cap per user).** A single power-user with abusive voice usage could cost ₹11k/mo. **Add a hard monthly $-budget per user with a circuit breaker.**
4. **Pricing data drift bug:** `planLimits.js` still has Student ₹299 / Pro ₹599; `pricing.js` has the real ₹199 / ₹399. Any code that displays prices from `planLimits.PLANS[plan].price` shows wrong numbers — needs immediate fix.
5. **Admin tooling is now partial (PYQ admin + trial-segments + sentry-test) but no general user-management dashboard exists.** Operating paying customers without a way to override their plan or refund still requires direct DB access.
6. **Audit's "Tier 1" critical security debt is fully resolved.** All three CRITICAL/HIGH security findings are closed. Remaining debt is concentrated in code quality + UX (light mode, mobile nav) and resilience (test coverage, monthly budget caps).
