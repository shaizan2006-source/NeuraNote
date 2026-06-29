# Phase 4 — Architecture: Strengths, Weaknesses, Scaling, Modularity

*Generated 2026-05-27. Synthesized from `SYSTEM_ARCHITECTURE_MAP.md` and live structural scan.*

---

## 4.1 Strengths (8 architectural decisions that aged well)

### 1. Supabase as the unified backend
**What it is:** Postgres + Auth + Storage + Realtime + pgvector + (optional) Edge Functions, all in one managed service.
**Why it's good:** A solo founder gets 4-5 services from one vendor with one billing relationship and shared DX. Same JWT works across DB queries, auth, storage uploads, and realtime subscriptions.
**Alternative considered:** Postgres + Auth0 + S3 + Pusher + Pinecone. Five vendors, five bills, five SDKs. Massive cognitive overhead.
**Why this won:** Speed of execution. The team shipped 30 features in 12 days at the cost of a single Supabase outage being a 4-service incident.
**Defensibility:** Supabase is portable in principle (managed Postgres) but realistically would take 2-4 weeks to migrate at this size.

### 2. Plan-based rate limiting enforced server-side
**What it is:** `lib/planLimits.js` exports `canAskQuestion(userId, user)` / `canUploadPDF()` checked in the route handler before any work.
**Why it's good:** Free-tier abuse is cost-controlled at the API boundary, not client-side (which would be trivially bypassed). Internal-dev bypass is a single named flag — no per-route conditionals.
**Risk it doesn't cover:** No monthly $-budget per user (Phase 3 CRIT-1).

### 3. RAG with custom domain-specific prompts (11 domains)
**What it is:** `queryClassifier.js` detects the academic domain (cs/physics/math/biology/chemistry/medical/law/finance/electrical/mechanical/business). `prompts/domains/*.js` provides system prompts tuned per domain. Falls back to LLM classification if heuristic confidence is low.
**Why it's good:** This is a genuine moat vs ChatGPT default — JEE physics gets a different prompt than UPSC law. The system handles a question about "thermal expansion" differently in physics vs chemistry.
**Defensibility:** Medium-high. Easy to copy *the idea*, hard to copy the actual prompt library tuned on Indian curricula.

### 4. Realtime architecture with debounced aggregation
**What it is:** 7 tables broadcast Postgres CDC. Client `useRealtimeProgress` hook debounces 500ms, minimum 2s between actual refetches, with 60s polling fallback when channel is unhealthy.
**Why it's good:** "Live" dashboard without polling storms. Smart degradation. Most early-stage products either don't have realtime or do it badly (event storms on the client).

### 5. SM-2 / FSRS spaced repetition correctly integrated
**What it is:** Concept extraction from PDFs → cards → SRS state tracked → due cards surfaced in `/study` → reviews flow back to mastery scores. Now `ts-fsrs` is layered in for modern scheduling.
**Why it's good:** The full feedback loop is wired up end-to-end. Many study apps stop at "here are flashcards"; this one ties review outcomes to mastery, which feeds the daily plan and weak-topic detection.
**Risk:** Phase 3 HIGH-8 — coexistence of two schedulers needs migration story.

### 6. Q&A cache (SHA256 keyed, 7-day TTL)
**What it is:** `qa_cache` table keyed on hash of (question + domain + marks); 7-day TTL.
**Why it's good:** General-knowledge questions (the most common Free-tier query type) are served at ~$0 marginal cost on cache hits. Estimated 60-80% hit rate on common questions.
**Hidden value:** This is the single biggest unit-economics lever — without it, ₹248/user/mo would be ₹400+/user/mo.

### 7. Sentry wired across client / server / edge with hidden source maps
**What it is:** `instrumentation.js` + three `sentry.*.config.js` files; `withSentryConfig` in `next.config.mjs` with `hideSourceMaps: true`.
**Why it's good:** Production observability is a leading indicator. Closing OPS-1 in 12 days post-audit means new incidents are no longer silent.

### 8. Cron-driven engagement loops (10 active crons)
**What it is:** Daily briefings, weekly recaps, cohort snapshots, FSRS reminders, photo-doubt cleanup, trial D3/D5 segmentation, account purge — all scheduled.
**Why it's good:** Habit formation requires *the product reaching out*. Most B2C SaaS depends on the user opening the app; this product proactively pings users at 12:30 PM (FSRS due) and 6 PM (trial warmup). Combined with WhatsApp + Push, this is a real engagement engine.
**Risk:** Cron failures are catastrophic to retention but currently have only Sentry to detect them. A health-check job pinging the cron endpoints from the outside (e.g., a Cloudflare worker every hour) would be insurance.

---

## 4.2 Weaknesses (8 decisions that could become problematic)

### 1. Single OpenAI account → single point of failure
**Symptom:** Every AI-powered feature in the app fails if OpenAI rate-limits, suspends, or has an incident.
**When it bites:** Already happened to several startups in 2024-2025 during OpenAI outages.
**Mitigation:** Two paths.
- **Easy (1 week):** Multi-key rotation — keep 2-3 OpenAI keys, route around per-key rate limits.
- **Hard (2-3 weeks):** Multi-provider fallback — claude-haiku-4.5 (`@anthropic-ai/sdk` already installed!) as a fallback when OpenAI is unavailable. The "uncertain Anthropic usage" debt is actually a strategic asset — turn it on.

### 2. No middleware → 96 routes × inline auth pattern
**Symptom:** A `verifyAuth()` helper exists but isn't centrally enforced. Old routes may still use copy-pasted auth; new routes might be added that forget auth entirely.
**When it bites:** A regression PR that copies a route template without `verifyAuth` would ship unauthenticated.
**Mitigation:** Add `src/middleware.ts` that enforces `Authorization` header presence for all `/api/*` except a small public allowlist.

### 3. DashboardContext monolith
**Symptom:** ~1,500 lines of mixed concerns (auth, docs, Q&A streaming, quiz, exams, focus, analytics, plans, realtime).
**When it bites:** Already biting. Onboarding new contributors (or even returning to the file after a week) requires loading the whole thing into working memory. Feature velocity is throttled by this file.
**Mitigation:** Roadmap S3-2 plan — extract ExamContext first, then 4-5 others.

### 4. No monthly $-budget per user
**Symptom:** Covered in Phase 3 CRIT-1. Voice tutor is the acute risk vector.
**When it bites:** A single Reddit/Discord viral moment with abusive power users.

### 5. Custom streaming protocol (`__META__` / `__CONV__`) without versioning
**Symptom:** Frontend parses string markers from a stream. Any change to marker syntax breaks all clients.
**When it bites:** When the team adds a new META field (e.g. "stream restart token") without coordinating client release.
**Mitigation:** Audit HIGH-7 — add `"v": 1`.

### 6. Single Supabase region (probably ap-south-1 / Mumbai)
**Symptom:** All EU/UK users have ~150-300ms baseline latency to the DB. UK Q&A first-token latency suffers.
**When it bites:** When expanding to UK/US per market_research_report.md. UK students who pay £8-12/mo will notice 2s+ delays vs ChatGPT's edge.
**Mitigation:** Supabase Pro supports read replicas (extra cost). For genuine geo-expansion, multi-region Postgres + sharded auth becomes necessary.

### 7. Mixed `.js` / `.jsx` / `.tsx` codebase without unified type contract
**Symptom:** 5 TS files in a ~200-file source tree. Frontend assumes API response shapes; nothing enforces them.
**When it bites:** When `/api/progress/summary` adds a new field with breaking renaming. Compiler catches nothing.
**Mitigation:** Audit MED-8 — Zod schemas at API boundaries as a stepping stone.

### 8. Three competing markdown stacks (`react-markdown` + `marked` + `markdown-it`) + two PDF parsers (`pdf-parse` + `pdf-parser`)
**Symptom:** Three different rendering surfaces can produce different output for the same input (subtle GFM differences, table rendering, code blocks).
**When it bites:** When a user reports "this answer renders differently in Quick Chat vs Ask AI." Hard to debug because three libraries.
**Mitigation:** Audit LOW-1/2/3 — consolidate.

---

## 4.3 Scaling cliffs (when each component breaks)

| Component | Today | Cliff at | What happens | Cost to go past |
|-----------|-------|----------|--------------|-----------------|
| **Supabase free tier** | DB <500 MB, ~100 concurrent realtime | ~2,000-5,000 active users | Realtime starts dropping events | Pro $25/mo (covers ~50K users) |
| **OpenAI Tier 1 rate limit** | 30K RPM, 200K TPM gpt-4o-mini | Exam-week burst load (3-5x normal) | 429 errors → user sees "Try again" | Auto-tier-up by spending more |
| **Vercel Pro plan** | 1TB bandwidth/mo, 1M serverless invocations | ~10-20K WAU | Bandwidth overage charges, function timeouts | $20-50/mo more |
| **AiSensy WhatsApp** | ~₹0.50/msg in IN | ~10K msgs/day | Per-msg costs scale linearly with users | Volume tiers; ~₹4K/mo at 10K/day |
| **Sentry free** | 5K events/mo | ~50 paying users with bugs | Errors dropped after quota | $26/mo for 50K |
| **pgvector IVFFlat lists=100** | <1M vectors per table | ~10M+ chunks | Query latency degrades from ~50ms to 500ms+ | Re-index with sqrt(rows); or HNSW |
| **Single OpenAI key** | per-account rate limits | Any incident, account suspension, or spike | Total outage | Multi-key rotation; multi-provider |

**The biggest unknown:** how many AI-call-bursts the realtime system can absorb during a JEE-night surge. Load test exists (`tests/load/load-test.mjs`) but no documented baseline. **Action: run load test at projected exam-night peak load and document p50/p95/p99.**

---

## 4.4 Data volume cliffs

| Data | Today | Cliff at | What happens |
|------|-------|----------|--------------|
| Brain map graph rendering | ~50 concepts per doc | ~500 concepts per doc, or ~5K total user concepts | ReactFlow lag, browser memory issues |
| FSRS card scheduling | small | ~100K cards | Query plan changes, `sr_next_due` RPC needs index tuning |
| Conversation history retrieval | JSON-array `messages` field | ~1K conversations or messages getting large | JSON-array updates start blocking — should be a separate `conversation_messages` table |
| `qa_cache` | TBD without purge | Tens of GB over 6 months | Slow lookups — **see Phase 3 HIGH-6 (pg_cron purge)** |
| `learning_events` | embedding-indexed | ~10M events | Vector index degrades |

---

## 4.5 Modularity scorecard (vendor lock-in risk)

| Migration | 1=trivial, 10=major rewrite | Why |
|-----------|------------------------------|-----|
| OpenAI → Claude | **4** | SDK already installed; prompt rebuild + streaming protocol adapter |
| OpenAI → Gemini | 5 | No SDK installed yet |
| Supabase (Postgres+Auth+RT+Storage) → AWS (RDS+Cognito+SNS+S3) | **8** | RLS rules, Realtime subscriptions, Storage URLs, pgvector — many integration points |
| Razorpay → Stripe (for India) | 8 | Stripe doesn't have UPI; UPI is non-negotiable for IN |
| Razorpay → Cashfree | 3 | Similar India-stack alternative; UPI supported |
| Vercel → AWS Amplify / ECS / Cloudflare | 5 | Next.js portable; crons + edge to re-implement |
| Whisper STT → Deepgram/Google STT | 4 | SDK swap; latency parity |
| OpenAI TTS → ElevenLabs | 3 | Better voices, higher cost; SDK swap |
| AiSensy → Gupshup/Interakt | 3 | All sit on Meta WhatsApp Business; abstract the provider behind a single send fn |
| Sentry → Datadog/Bugsnag | 5 | Sentry has unique features used (instrumentation hooks); migration is non-trivial |

**Verdict:** The product can swap individual AI providers and CDN/host fairly easily. The Supabase lock-in is the deepest. Razorpay is non-replaceable for India (UPI). This is **acceptable for the current stage** but suggests that infra spend (and pricing power) is concentrated with two vendors.

---

## 4.6 Architecture-level recommendations

1. **Turn on Anthropic SDK** as a fallback for `/api/ask` when OpenAI errors or rate-limits. Closes the "single-OpenAI" SPOF in <1 week. The SDK is already installed; the audit's "uncertain Anthropic usage" debt becomes a strategic asset rather than dead weight.
2. **Add `src/middleware.ts`** for defense-in-depth. Even with `verifyAuth()` in handlers, a global guard ensures forgotten auth = denied request.
3. **Extract a single Context** (ExamContext) as a forcing function to learn the decomposition pattern. Then it's mechanical to extract the rest.
4. **Run the load test** and document baselines for p50/p95/p99 on `/api/ask`, `/api/process-pdf`, `/api/progress/summary`. Without baselines, "scaling" has no measurement.
5. **Multi-region read replica** when (and only when) UK/US revenue justifies it (~$50/mo Supabase Pro add-on at first). Don't pre-optimize.
6. **Pre-compute weak-topic clusters in a background job** (audit PERF-2). Progress page loads should not block on a synchronous OpenAI call.
7. **Cache rate-limit checks** (Phase 3 HIGH-3). Single biggest API-latency win.
8. **Document the canonical SRS scheduler** (FSRS vs SM-2) and write the migration. Phase 3 HIGH-8.
