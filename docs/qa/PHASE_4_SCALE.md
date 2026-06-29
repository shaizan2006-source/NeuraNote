# Phase 4 — Scale & Capacity Audit

Exam-season traffic-spike audit (target: 10k–100k concurrent students). Method: a
5-dimension static code audit (DB/pgvector, AI/OpenAI, API-layer, cron fan-out,
rate-limiting/abuse) run as a 54-agent parallel workflow, **each finding adversarially
verified against the cited code**. 48 raw → **46 confirmed, 2 refuted**. Plus a
completeness-critic pass for missed dimensions, and a ramped load harness
(`tests/load/scale-ramp.mjs`).

> **Baseline matters.** The audit read the `qa/phase0-hardening` working tree, which is an
> *inconsistent* snapshot (committed files import uncommitted WIP modules). Every finding
> below is tagged **LIVE** (present in `origin/main` = production) or **WIP** (only in the
> team's uncommitted/working-tree code → fix *before shipping*, not a live prod bug).
> This disambiguation was done by checking each file against `origin/main`.

---

## 🔴 LIVE PROD — act now

### F-034 · S0 · `/api/get-pdfs` — unauthenticated cross-user data leak  ✅ FIX READY
`GET` had no auth, no user filter, service-role `select("*")` from `pdfs_metadata` → returns
**every user's PDF name + storage path** to any anonymous caller. `pdfs_metadata` is
populated (written by `save-pdf`, `quick-chat`). **Fix:** require JWT + `.eq("user_id", user.id)`
+ `.limit(200)`; client (`DashboardContext.fetchSavedPDFs`) now sends the token. → in
`docs/qa/hotfix-phase4-data-leaks.patch`.

### F-035 · S0 · `/api/chat/history` — IDOR, reads anyone's chat by body `user_id`  ✅ FIX READY
`POST` trusted `user_id` from the request **body** (no JWT) and returned that user's full
`chat_messages` (actual conversation content). Any caller could read anyone's chats.
**Fix:** derive the user from the verified Bearer token, ignore the body, cap to 200; both
client call sites (`chat/page.js`) send the token. → same patch.

> The team's WIP (`stash@{1}`) **already fixes F-034/F-035/F-036 with auth** — but it's
> undeployed and stranded behind the release-hygiene problem (F-007). The patch above is a
> minimal, deployable-now version off `origin/main` that doesn't wait on the WIP.

### F-036 · S1 · `/api/generate-quiz` — spoofable `userId` from body  🔶 FIX SPECIFIED
`POST` reads `body.userId` (line 24) with no JWT → anyone can trigger OpenAI quiz
generation for any user (unauth cost + IDOR write). **Fix:** `verifyAuth(req)`, derive
userId from the token; add rate limiting. (WIP fixes this; not in the patch above to keep
it scoped to the S0 leaks — apply alongside.)

### F-037 · S1 · `/api/generate-document` — fully unauthenticated + CPU-heavy  🔶 FIX SPECIFIED
`POST` renders markdown→PDF (react-pdf) + storage upload with **no auth** (LIVE in prod AND
WIP). Anonymous CPU/storage cost amplification. **Fix:** require auth, cap content length
(≤100KB), rate-limit; for the internal `/api/ask` caller, call the renderer directly instead
of round-tripping the public endpoint.

### F-038 · S1 · Free-tier Q&A cap never enforces (broken column)  🔶 FIX SPECIFIED
`planLimits.countTodayQA` filters `.gte("created_at", …)` but `qa_usage` has **no
`created_at`** (it's `id, user_id, date, count`) → the query errors → count 0 → the **20/day
free cap never applies** (free users get unlimited Q&A = direct OpenAI cost leak). Worse,
`recordQAUsage` does a plain `.insert({user_id})` (ignores `count`/`date` + the
`UNIQUE(user_id,date)`). **Fix:** `countTodayQA` → `select("count").eq("user_id",id).eq("date",today).maybeSingle()`;
`recordQAUsage` → upsert-increment on `(user_id,date)`. *(Touches `planLimits.js`, same file
as the entitlements hotfix — apply as a disjoint hunk.)*

### F-039 · S1 · `document_chunks.embedding` has NO ANN index  ✅ MIGRATION READY
The RAG path (`match_documents`/`_multi`, the hottest query) does exact cosine KNN —
sequential scan over chunks on every PDF-grounded question. **Fix:** migration
`20260629000003_document_chunks_vector_index.sql` (HNSW, `vector_cosine_ops`). For a large
prod table use the `CREATE INDEX CONCURRENTLY` form noted in the migration.

### F-040 · S1 · No rate limiting anywhere (no `middleware.js`)  🔶 ARCHITECTURAL
No IP/global throttle, no per-token throughput cap. A single valid token can flood
`/api/ask`, `/api/voice/*`, `/api/photo-doubt`, `/api/process-pdf`, `/api/generate-*`.
**Fix:** add `src/middleware.js` with a sliding-window limiter (Upstash Redis; in-memory LRU
as a stopgap) keyed by user-id + IP → 429 + Retry-After. This is the single highest-leverage
location — it also hosts the body-size guard (F-037/F-043) and IP throttle for the public
waitlist insert.

### Live S2/S3 (perf/cost — documented, fix opportunistically)
- **S2** `verifyAuth` calls GoTrue (network round-trip) on *every* authed request (`serverAuth.js:20`) → verify the JWT locally (HS256/jwks), only hit GoTrue on failure.
- **S2** Every Q&A fires a synchronous gpt-4o-mini call via `/api/weak-topics` on the hot path → move off-request (queue/batch) or reuse topics from `/api/ask`.
- **S2** Q&A tracking fans out 3 write requests/question (streak/progress/weak-topics) → one batched `record-activity` endpoint.
- **S3** SSE generation has no `AbortController` on client disconnect → abandoned streams keep billing tokens.
- **S3** AI spend estimated as `chars/4`, ignoring real `usage` → set `stream_options:{include_usage:true}` and record actual tokens (note: prod has no budget breaker yet — this is for when it ships).
- **S3** `/api/progress/summary` runs an OpenAI embedding on a hot dashboard GET → precompute in cron.
- **S3** Paid tiers `qaLimit:null` → add an abuse cap (e.g. 30/min, 2k/day) even for "unlimited" plans.
- **S3** `/api/ask` `documentIds` array unbounded into the pgvector RPC → validate ≤10 uuids + verify ownership.
- **S3** No request-body size cap on JSON write routes except `/api/ask` → shared 413 guard in middleware.
- **S3** Unauthenticated `/api/waitlist` insert, no rate limit → IP throttle + turnstile.
- **S4** `process-pdf` inserts `syllabus_topics` one row at a time; OCR sends whole PDF base64 with no cap/timeout; multiple OpenAI clients with default 10-min timeout; missing `runtime='nodejs'` declarations.

---

## 🟡 WIP-ONLY — fix BEFORE shipping (not live in prod)

None of the six flagged crons, nor the AI budget breaker, exist in `origin/main`. They are in
the team's uncommitted WIP and will bite **when shipped** — fix as part of that work:

- **Budget breaker build failure (S0-in-WIP):** `src/app/api/ask/route.js` (WIP) imports `@/lib/aiSpend`, `@/lib/llmFallback`, `@/lib/sseStream` — **none exist on disk / in git**. The WIP `ask` route won't build, and the per-user monthly USD cap it implies isn't real. **Before shipping:** commit those modules (with `checkMonthlyBudget` actually enforcing a cap) and add a `npm run build` gate so unresolved `@/lib` imports can't ship. **Prod today has no monthly AI cap at all** — that's the real live gap (a feature not yet shipped, not a crash).
- **All cron fan-outs are naive per-user loops** that exceed the Vercel function budget at scale (no `maxDuration`, no batching/queue, no cursor): `generate-briefings` (per-user OpenAI chat + TTS + upload, daily), `dispatch-notifications` (N+1 profile fetch every 5 min), `evaluate-streaks` (2 seq queries/user, **silently capped at 2000 users**), `cohort-leaderboard-snapshot` (per-member focus_progress scan), `cleanup-photo-doubts` (per-row delete, no LIMIT), `generate-weekly-recaps` (per-user TTS). **Pattern fix:** page over users with a persisted cursor + bounded-concurrency batches (or a queue: QStash / pg_cron+function), `export const maxDuration = 300`, set-based SQL where possible, idempotent re-runs.
- **`vercel.json` schedules `fsrs-due-reminder` but the route file doesn't exist** → daily 404, no FSRS reminders. Implement (with batching) or remove the cron entry.
- **Notification dispatcher N+1** (`src/lib/notifications/dispatcher.js`) — batch profiles via `.in('id', userIds)`, batch subscriptions, multi-row `notification_log` insert, parallel webpush.
- **Voice turn endpoints** (`voice/respond|speak|transcribe`) bypass the calls/day cap → unlimited Whisper/TTS/GPT per token; gate on a server-validated `callId` + per-turn caps.

---

## ⚪ Follow-up audit candidates (completeness critic — UNVERIFIED)

These were *not* held to the adversarial-verification bar of the 46 confirmed findings — they
need a dedicated second pass. Ordered by potential blast radius:

- **[G1] Supabase connection exhaustion** — flagged as the likeliest hard outage *IF* the app opened direct Postgres connections. **Caveat:** the app uses `@supabase/supabase-js` (REST → PostgREST, which pools internally), not raw PG/Prisma/postgres.js — so per-lambda PG connection exhaustion likely does **not** apply; the real ceiling shifts to PostgREST's pool + Supabase API rate limits. **Verify:** confirm no direct-connection client (Prisma/`postgres`/`pg`) and whether any Supabase API rate tier applies at spike.
- **[G2] Non-atomic counter races** — `/api/progress` and `/api/streak` POST do read-then-write (`questions = data.questions + 1`) instead of an atomic increment → lost updates + row-lock contention under a user's rapid Q&A. *Plausible and worth fixing* (atomic `UPDATE … SET x = x + 1` RPC / upsert-on-conflict). `progress/route.js:33-46`, `streak/route.js:54-80`.
- **[G3] Supabase Realtime ceiling** — `useRealtimeProgress` subscribes one channel to 7 tables per session + `useCohortPresence` per cohort viewer; Realtime has concurrent-connection + msg/sec tier caps. At a few thousand exam-night users the "live" UX may silently fall back to polling. Verify against the Realtime tier.
- **[G4]** No `src/middleware.js` exists → confirms F-040's "nowhere to put a throttle."
- **[G5]** Storage growth/egress: `briefings` `${user}/${date}.mp3` accumulates forever (no lifecycle); morning playback = concentrated signed-URL egress spike. PDF buckets have no retention.
- **[G6]** `document_chunks` unbounded growth (DB-size tier); confirm `delete-pdf` cascades chunk deletion.
- **[G7]** Razorpay webhook retry storm on `payment.failed`; no dedup/throttle on the endpoint.
- **[G8]** Sentry quota burnout: `replaysOnErrorSampleRate: 1.0` → during an incident every errored session is captured, exhausting quota exactly when you need it.
- **[G9]** In-memory answer cache is per-lambda (near-zero cross-instance hit rate; unbounded Map → OOM risk on warm instances). Confirm backing store.
- **[G10]** `learning_events` append-only firehose (6 write sites/question) — DB-size + realtime-volume driver; confirm rollup/TTL.

---

## ✓ Refuted (verifier rejected)

- *"Monthly budget counter is read-modify-write with no atomicity"* — moot: the budget module doesn't exist in the tree (see WIP section); no live counter to race.
- *"`/api/documents` returns every doc incl. full `content` unbounded"* — the route does not select `content` as claimed; lower impact than stated (still benefits from a `.limit()`).

---

## Live load test

`tests/load/scale-ramp.mjs` ramps concurrency (10→100) over static + authed DB-read paths
with p50/p95/p99, cost-guarding the AI path. **Not executed locally:** (1) the committed
tree can't build standalone (imports WIP modules — see budget breaker); (2) a single local
Node process doesn't model Vercel serverless scaling — it would measure this machine, not
prod. **Correct venue:** run it against **deployed staging** via `qa-regression.yml` with
`APP=$STAGING_APP_URL`. It is wired and ready. The static audit above is where the
prod-scale findings come from — you can't load-test your way to a missing pgvector index or
a sequential cron loop; you read for those.
