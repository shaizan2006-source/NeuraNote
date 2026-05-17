# Technical Architecture
*Backend, database, personalization, and analytics — consolidated*
*For: Ask-My-Notes solo founder execution, 90-day window*
*Date: May 2026*

---

## 0. How to read this

This document covers everything below the AI layer: backend services, database design, realtime infrastructure, personalization engine, analytics, and observability. The current Ask-My-Notes architecture is technically sophisticated but under-documented. This document captures what exists, what needs fixing, and what gets added in the 90-day window.

The 90-day technical work is intentionally conservative — most of it is **strengthening what's there**, not building new infrastructure. Solo founder economics demand it.

---

## 1. The current stack snapshot

```
┌────────────────────────────────────────────────────────┐
│                        CLIENT                          │
│  Next.js 16 (App Router) + React 19 + Tailwind        │
│  PWA via service worker (Sprint 1)                     │
│  shadcn/ui components                                  │
└────────────────────────┬───────────────────────────────┘
                         │
                         │ HTTPS, custom streaming protocol
                         │
┌────────────────────────▼───────────────────────────────┐
│                  EDGE / API LAYER                      │
│  Vercel Edge Functions (Next.js API routes)            │
│  /api/* endpoints                                      │
│  Bearer token auth (Supabase JWT)                      │
└────────────────────────┬───────────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
┌───────▼──────┐ ┌──────▼─────────┐ ┌────▼──────────┐
│   Supabase   │ │   OpenAI API   │ │   Razorpay    │
│  PostgreSQL  │ │   gpt-4o(mini) │ │   Payments    │
│  + pgvector  │ │   Whisper, TTS │ │               │
│  + Realtime  │ │   Embeddings   │ │               │
│  + Storage   │ │                │ │               │
│  + Auth      │ │                │ │               │
└──────────────┘ └────────────────┘ └───────────────┘
```

### What's already in place
- Supabase Postgres with extensions: `pgvector`, `pg_cron`, `pgcrypto`
- 70+ tables (some untracked in migrations — see Phase 0 work)
- Realtime CDC subscriptions on 7 tables (`documents`, `quizzes`, `chat_messages`, `flashcard_progress`, `user_progress`, `mock_sessions`, `notifications`)
- pgvector embeddings on `document_chunks`, `concepts`, `qa_cache`
- Custom RPC functions: `match_documents`, `match_documents_multi`, `increment_memory_weight`, plus 18 others
- Razorpay integration (₹299 / ₹599 tiers, will be rebuilt for new tiers)
- Streaming infrastructure for AI responses
- Voice tutor 5-phase pipeline
- 1467-line DashboardContext (complex, working)

### What's broken or risky
- 13 tables exist in production without migration files → **Phase 0 fix**
- 3 RPC functions exist in production without migration files → **Phase 0 fix**
- 2 critical API security vulnerabilities → **Phase 0 fix**
- 7 `/dev/*` routes accessible in production → **Phase 0 fix**
- No Sentry error monitoring → **Phase 0 fix**
- No CI/CD → **Phase 0 fix**
- No payment webhook idempotency → **Phase 0 fix**
- Pure JavaScript (no TypeScript) → out of scope for 90 days
- DashboardContext refactor → out of scope for 90 days

---

## 2. The database architecture

### Table inventory (post-Phase 0)

Organized by domain:

**Auth & profile:**
- `auth.users` (Supabase managed)
- `profiles` — extended user data, exam target, study window, cohort
- `user_plans` — subscription state, trial state, family members

**Content:**
- `documents` — uploaded PDFs (with processing_status)
- `document_chunks` — text chunks with embeddings
- `pdfs` — legacy table, to be consolidated with documents in Sprint 4

**Conversations & Q&A:**
- `conversations` — chat sessions
- `chat_messages` — individual messages
- `qa_cache` — semantic cache (with embedding)
- `qa_usage` — short-term usage tracking
- `photo_doubts` — image-based queries

**Learning state:**
- `concepts` — extracted concepts with embeddings
- `concept_edges` — concept-to-concept relationships
- `mastery_state` — per-concept mastery scores
- `learning_events` — event log of all learning activity
- `user_memory` — consolidated memory items
- `spaced_repetition_cards` — SRS cards (Sprint 3 adds FSRS state)
- `quizzes` — generated quizzes
- `quiz_attempts` — quiz results

**Progress & analytics:**
- `study_streaks` — cumulative day, freezes, etc.
- `focus_progress` — session-level focus tracking
- `daily_progress` — daily aggregate metrics

**Retention engine:**
- `cohorts` — cohort metadata
- `cohort_members` — membership + anonymous handles
- `cohort_leaderboard_snapshots` — weekly rank snapshots
- `daily_briefings` — generated audio briefings
- `push_subscriptions` — push notification endpoints
- `notification_preferences` — per-user prefs
- `notification_log` — sent notifications
- `decompression_triggers` — care subsystem events

**Mock tests + PYQs (Sprint 3):**
- `pyqs` — past year questions corpus
- `pyq_attempts` — user attempts at PYQs
- `mock_tests` — full-length mock test sessions

**Voice tutor:**
- `voice_sessions` — voice tutor session metadata
- `voice_transcripts` — full transcripts

**Payments:**
- `payment_events` — webhook history
- `coaching_institute_pilots` — B2B leads

**Admin:**
- `ai_call_log` — every AI call with cost
- `system_alerts` — for ops monitoring (Sprint 2)

### Schema versioning strategy

After Phase 0, every schema change goes through `supabase/migrations/<timestamp>_description.sql`. No more changes in production without migrations.

Local dev:
```
supabase start  # local stack
supabase db reset  # apply all migrations from scratch
```

Production:
```
supabase db push  # apply pending migrations
```

CI checks: PR must include migration file if any schema change. Block merge if production schema diverges from migrations.

### Row Level Security (RLS)

Every user-data table has RLS enabled. Policies follow the pattern:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>_owner_select" ON <table>
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "<table>_owner_modify" ON <table>
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Public-readable tables (no RLS user filtering):**
- `pyqs` (SEO surface, public)
- `concepts` shared dictionary (not user-specific concepts)
- `cohorts` metadata (membership is private)

### Migration audit (Sprint 1)

Before any feature work, run:
```bash
# Compare production schema to migrations
supabase db diff
# Output should be: no diff
```

If diff exists: create migration to bring local + migrations in sync with production.

### Index strategy

Hot query patterns and their indices:

```sql
-- Q&A pipeline
CREATE INDEX document_chunks_embedding_idx ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX document_chunks_user_doc_idx ON document_chunks
  (user_id, document_id);

-- Concept queries
CREATE INDEX concepts_user_subject_idx ON concepts (user_id, subject);
CREATE INDEX concept_edges_from_idx ON concept_edges (from_concept_id);
CREATE INDEX concept_edges_to_idx ON concept_edges (to_concept_id);

-- Mastery queries
CREATE INDEX mastery_state_user_concept_idx ON mastery_state
  (user_id, concept_id);
CREATE INDEX mastery_state_user_last_idx ON mastery_state
  (user_id, last_practiced_at DESC);

-- Conversation history
CREATE INDEX conversations_user_idx ON conversations
  (user_id, last_message_at DESC);
CREATE INDEX chat_messages_conv_idx ON chat_messages
  (conversation_id, created_at);

-- Cohort queries
CREATE INDEX cohort_members_user_idx ON cohort_members (user_id);

-- Notifications
CREATE INDEX notification_log_user_sent_idx ON notification_log
  (user_id, sent_at DESC);
```

Run `EXPLAIN ANALYZE` on slow queries weekly. Add indices when needed.

### pg_cron jobs

Already running:
```sql
-- Purge qa_cache older than 7 days
SELECT cron.schedule(
  'purge-qa-cache',
  '0 3 * * *',
  $$DELETE FROM qa_cache 
    WHERE last_hit_at < NOW() - INTERVAL '7 days' AND hit_count < 3$$
);

-- Purge qa_usage older than 2 days
SELECT cron.schedule(
  'purge-qa-usage',
  '0 4 * * *',
  $$DELETE FROM qa_usage WHERE created_at < NOW() - INTERVAL '2 days'$$
);
```

New jobs to add (Sprint 1):
```sql
-- Daily briefing generation
SELECT cron.schedule(
  'generate-briefings',
  '0 2 * * *',  -- 2am IST (UTC+5:30 = 20:30 UTC)
  $$SELECT generate_briefings_for_active_users()$$
);

-- Daily streak evaluation
SELECT cron.schedule(
  'evaluate-streaks',
  '30 0 * * *',  -- 12:30am IST
  $$SELECT evaluate_streak_state_for_all_users()$$
);

-- Notification dispatcher (every 5 min)
SELECT cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  $$SELECT dispatch_due_notifications()$$
);

-- Sunday Recap generation
SELECT cron.schedule(
  'generate-weekly-recaps',
  '0 12 * * 0',  -- Sunday noon IST
  $$SELECT generate_weekly_recaps_for_active_users()$$
);

-- Cohort leaderboard snapshot
SELECT cron.schedule(
  'cohort-leaderboard-snapshot',
  '0 14 * * 0',  -- Sunday 2pm IST
  $$SELECT create_cohort_leaderboard_snapshots()$$
);

-- Cleanup old photo doubts
SELECT cron.schedule(
  'cleanup-photo-doubts',
  '0 1 * * *',
  $$DELETE FROM photo_doubts WHERE delete_after < NOW();
    -- Also delete from storage bucket
    SELECT delete_orphaned_photo_doubt_files()$$
);
```

---

## 3. The API architecture

### API conventions

All API routes follow these conventions:

**Auth:** Every endpoint except `/api/public/*` requires `Authorization: Bearer <jwt>`. JWT is Supabase-issued. Auth is validated via Supabase client; user_id is extracted server-side, never trusted from client.

**Error format:**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

**Success format (non-streaming):**
```json
{
  "data": { ... },
  "meta": { "request_id": "<uuid>", "duration_ms": 234 }
}
```

**Streaming format:** see `AI_SYSTEMS_ARCHITECTURE.md` Section 9.

**Rate limiting:** TBD via Vercel Edge Middleware (Sprint 4+).

### Endpoint inventory

Organized by domain:

**Auth & profile:**
- `POST /api/auth/onboarding/complete` — finalize onboarding
- `GET /api/profile/me` — get current user profile
- `PATCH /api/profile/me` — update profile

**Content:**
- `POST /api/documents/upload` — upload PDF (signed URL flow)
- `GET /api/documents` — list user PDFs
- `GET /api/documents/<id>` — get PDF details
- `DELETE /api/documents/<id>` — delete PDF (verified ownership)
- `POST /api/documents/sample` — load sample PDF for user
- `GET /api/documents/<id>/status` — processing status (polling fallback to realtime)

**Q&A:**
- `POST /api/ask` — streaming Q&A (existing)
- `POST /api/photo-doubt` — photo-based Q&A (Sprint 2)
- `GET /api/conversations` — list (auth fixed in Phase 0)
- `GET /api/conversations/<id>` — get with messages
- `DELETE /api/conversations/<id>` — delete
- `POST /api/conversations/<id>/clear` — clear messages, keep convo

**Brain Map:**
- `GET /api/brain-map` — get graph data
- `POST /api/brain-map/snapshot` — generate share image

**Quiz & SRS:**
- `POST /api/quiz/generate` — create quiz
- `POST /api/quiz/<id>/submit` — submit answers
- `GET /api/cards/due` — cards due for review
- `POST /api/cards/<id>/review` — review card (FSRS in Sprint 3)

**Mock tests (Sprint 3):**
- `POST /api/mock/start` — start full-length mock
- `POST /api/mock/submit-answer` — submit each answer
- `POST /api/mock/complete` — finalize + get analytics

**PYQs (Sprint 3):**
- `GET /api/pyqs/search` — filter/list
- `GET /api/pyqs/<slug>` — single PYQ (public, SEO)
- `POST /api/pyqs/ai-query` — natural language PYQ search
- `POST /api/pyqs/practice` — generate practice set
- `POST /api/pyqs/submit` — submit answer

**Retention engine:**
- `GET /api/briefings/today` — today's briefing
- `POST /api/briefings/listened` — mark listened
- `GET /api/streak/status` — current streak + freezes
- `GET /api/cohort/me` — user's cohort info
- `GET /api/cohort/leaderboard` — cohort rankings

**Notifications:**
- `POST /api/push/subscribe` — register push endpoint
- `POST /api/push/unsubscribe` — remove endpoint
- `GET /api/notifications/preferences`
- `PATCH /api/notifications/preferences`

**Payments:**
- `POST /api/payments/create-order` — Razorpay order creation
- `POST /api/payments/webhook` — Razorpay webhook (idempotent)
- `POST /api/subscription/cancel`
- `POST /api/subscription/pause`
- `GET /api/trial/status`

**Analytics (user-facing):**
- `GET /api/progress/summary` — Progress page data
- `GET /api/progress/trajectory` — mastery over time
- `GET /api/progress/predictions` — predicted score/rank

**Internal:**
- `GET /api/health` — uptime check
- `GET /api/admin/cost-dashboard` — internal-only cost view

### Streaming endpoint pattern

```javascript
// /api/ask
export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response('Unauthorized', { status: 401 });
  
  const { question, conversationId, pdfIds } = await req.json();
  
  // Set up streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Pre-flight (cache, classification, RAG)
        const meta = await prepareContext(user, question);
        controller.enqueue(encoder.encode(`__META__${JSON.stringify(meta)}\n`));
        
        // Stream the AI response
        for await (const chunk of streamFromOpenAI(meta.prompt)) {
          controller.enqueue(encoder.encode(chunk));
        }
        
        // Post-flight (concepts, mastery, log)
        const concepts = extractConcepts(/* ... */);
        controller.enqueue(encoder.encode(`__CONCEPTS__${JSON.stringify(concepts)}\n`));
        
        const conversationId = await persistConversation(/* ... */);
        controller.enqueue(encoder.encode(`__CONV__${JSON.stringify({ conversationId })}\n`));
        controller.enqueue(encoder.encode('__DONE__\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`__ERROR__${JSON.stringify({ message: err.message })}\n`));
      } finally {
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Stream-Version': '2.0'
    }
  });
}
```

### Webhook idempotency (Phase 0)

Razorpay webhooks can fire twice for the same payment. Idempotency:

```javascript
// /api/payments/webhook
export async function POST(req) {
  const { event, payload } = await req.json();
  const signature = req.headers.get('x-razorpay-signature');
  
  if (!verifySignature(payload, signature)) return new Response('Invalid', { status: 400 });
  
  if (event === 'payment.captured') {
    const paymentId = payload.payment.entity.id;
    
    // Idempotency: check if already processed
    const existing = await supabase
      .from('user_plans')
      .select('id')
      .eq('payment_id', paymentId)
      .single();
    
    if (existing.data) {
      // Already activated, return 200 (Razorpay stops retrying)
      return new Response('OK (idempotent)', { status: 200 });
    }
    
    // Activate subscription
    await activateSubscription(payload);
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## 4. The realtime infrastructure

### Current realtime subscriptions

7 tables already publish to `supabase_realtime`:
- `documents` — for upload/processing status
- `quizzes` — for quiz generation completion
- `chat_messages` — for live conversation sync (multi-tab)
- `flashcard_progress` — for SRS state changes
- `user_progress` — for progress page live updates
- `mock_sessions` — for mock test state
- `notifications` — for in-app notification surfacing

### Realtime patterns

**Pattern 1 — Long-running async task feedback (PDF processing):**

```javascript
// Client
const channel = supabase
  .channel(`doc:${documentId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `id=eq.${documentId}`
  }, (payload) => {
    updateProgress(payload.new);
  })
  .subscribe();

// Backend (during processing)
await supabase
  .from('documents')
  .update({ processing_status: 'embedding', processing_progress: 50 })
  .eq('id', documentId);
```

**Pattern 2 — Presence (cohort active count):**

```javascript
// Client
const channel = supabase
  .channel(`cohort:${cohortId}`, {
    config: { presence: { key: anonymousHandle } }
  })
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    setActiveCount(Object.keys(state).length);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ status: 'active' });
    }
  });
```

**Pattern 3 — Live progress updates (Sunday Recap waiting state):**

```javascript
// Backend creates the recap async
// Client polls or subscribes to realtime on `user_progress`
const channel = supabase
  .channel(`recap:${userId}`)
  .on('postgres_changes', { /* ... */ }, /* ... */)
  .subscribe();
```

### Realtime guardrails

- **Connection limit:** Supabase free tier allows 200 concurrent connections. At 1000 active users, connection pooling is critical.
- **Channel cleanup:** Client must unsubscribe on component unmount, route change, or tab close.
- **REPLICA IDENTITY:** Tables that publish full row updates need `REPLICA IDENTITY FULL`:
  ```sql
  ALTER TABLE documents REPLICA IDENTITY FULL;
  ALTER TABLE quizzes REPLICA IDENTITY FULL;
  -- etc
  ```
- **Polling fallback:** If realtime connection fails, fall back to polling every 3-5s.

---

## 5. The storage architecture

### Buckets

| Bucket | Purpose | Access | Retention |
|---|---|---|---|
| `user-pdfs` | User-uploaded PDFs | Owner-only | Until user deletes |
| `briefings` | Daily audio briefings | Owner-only | 30 days |
| `photo-doubts` | Photo Doubt Cam images | Owner-only | 30 days |
| `brain-map-snapshots` | Generated share images | Owner-only | 90 days |
| `sample-pdfs` | Pre-curated sample PDFs | Public (read-only) | Forever |
| `weekly-recap-images` | Sunday Recap visuals | Owner-only | 90 days |

### Access patterns

**Upload flow (PDFs):**
1. Client requests signed upload URL: `POST /api/documents/upload-url`
2. Server returns signed URL with 5-min expiry, max 50MB
3. Client PUTs file directly to Supabase Storage
4. Client notifies server: `POST /api/documents/process` with storage path
5. Server kicks off processing pipeline

**Read flow (Brain Map snapshot):**
1. Server generates image, stores at `brain-map-snapshots/<userId>/<date>.png`
2. Server returns signed URL with 24-hour expiry
3. Client uses signed URL for share or download

### Storage policies

```sql
-- Owner-only read on user-pdfs
CREATE POLICY "user_pdfs_owner_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner-only insert
CREATE POLICY "user_pdfs_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

Folder structure: `<userId>/<documentId>/file.pdf`.

### Storage cost projection

- 5000 active users × 5 PDFs avg × 2MB = 50GB → ~$1/month
- 5000 daily briefings × 30 days × 800KB = ~120GB rolling → ~$2.50/month
- Total storage cost at 5K active: ~$5/month. Negligible.

### CDN / delivery

Supabase Storage already CDN-fronts uploads. For shareable assets (Brain Map snapshots), use Cloudflare in front for better global delivery (Sprint 4+).

---

## 6. The personalization engine

### Personalization data model

```
USER
  ├── profile (exam, year, study_window, region)
  ├── cohort (cohort_id, handle, rank)
  ├── user_memory (long-term consolidated facts)
  ├── learning_events (recent activity log)
  ├── mastery_state (concept-level mastery)
  ├── conversations (recent dialogues)
  ├── concepts (their personal concept graph)
  └── preferences (notification settings, etc.)
```

### Personalization injection points

Personalization is injected into the system at these points:

**1. Q&A System Prompt:**
- See `AI_SYSTEMS_ARCHITECTURE.md` Section 12.
- Personalization snippet assembled at request time:
  - Profile basics
  - Recent struggles (last 7 days)
  - Current mastery levels by subject
  - Cohort context

**2. Daily Briefing:**
- Full personalization context (yesterday's activity, today's plan, weak spots)

**3. Quiz/Practice Generation:**
- Difficulty calibrated to mastery
- Topic selection biased toward weak areas

**4. Recommendations:**
- "Concepts to focus on" derived from mastery + recency
- PYQ recommendations from weak chapter overlap

**5. UX states:**
- Dashboard mode by time + study window
- Notification timing per user's declared window
- Pre-exam mode triggered by exam date

### Memory consolidation

After each conversation closes (or every 24h for active conversations):

```javascript
async function consolidateMemory(userId, conversationId) {
  const messages = await getRecentMessages(conversationId, limit=10);
  
  // Extract memory items
  const items = await callOpenAI({
    model: 'gpt-4o-mini',
    prompt: MEMORY_EXTRACT_V1.template,
    parameters: { conversation: formatMessages(messages) }
  });
  
  // Insert/update user_memory
  for (const item of items) {
    await supabase.from('user_memory').upsert({
      user_id: userId,
      content: item.content,
      tags: item.tags,
      source_conversation_id: conversationId,
      weight: 1.0
    });
  }
  
  // Increment weights for matching existing memories
  await callRpc('increment_memory_weight', { user_id: userId, new_items: items });
}
```

### Memory retrieval for prompts

```javascript
async function getPersonalizationContext(userId, query) {
  // Get user profile basics
  const profile = await getProfile(userId);
  
  // Get top 5 relevant memory items (vector-similar to query)
  const queryEmbedding = await embed(query);
  const memories = await supabase.rpc('match_user_memory', {
    p_user_id: userId,
    p_embedding: queryEmbedding,
    p_threshold: 0.6,
    p_limit: 5
  });
  
  // Get current mastery by subject
  const mastery = await getCurrentMastery(userId);
  
  // Get last 3 messages from any conversation today
  const recentMessages = await getTodayRecentMessages(userId, limit=3);
  
  return {
    profile,
    relevantMemories: memories,
    mastery,
    recentMessages
  };
}
```

### Privacy boundaries

Personalization data:
- Stays in user's row (RLS enforced)
- Never shared cross-user
- Never sold or licensed
- User can export at any time
- User can delete specific items or reset all memory

This is non-negotiable. See `MASTER_VISION_AND_MOAT.md` Section 10, Rule 4.

---

## 7. The analytics infrastructure

### What gets measured

Three categories of metrics:

**1. Product analytics (user-facing):**
- Day-N retention curves
- Activation rate (signup → first Q&A)
- Daily/weekly/monthly active users
- Feature usage by tier
- Conversion funnel (signup → trial → paid)

**2. Internal metrics:**
- AI cost per user per month
- Cache hit rates
- API error rates
- Page load times
- Realtime connection health

**3. Strategic metrics:**
- Brain Map adoption (% of WAU)
- Cohort engagement (% in leaderboard top 100)
- PYQ corpus coverage
- Decompression nudge effectiveness

### Event taxonomy

See `RETENTION_ENGINE_BLUEPRINT.md` Section 11 for the full event list. Implementation:

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  cohort_id TEXT,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX analytics_events_user_idx ON analytics_events (user_id, created_at DESC);
CREATE INDEX analytics_events_name_idx ON analytics_events (event_name, created_at DESC);
```

### Event emission pattern

Client-side wrapper:
```javascript
// lib/analytics.js
export async function track(eventName, properties = {}) {
  if (typeof window === 'undefined') return;
  
  // Non-blocking, fire-and-forget
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_name: eventName, properties }),
    keepalive: true
  }).catch(() => { /* silent */ });
}
```

Server-side:
```javascript
// in any API route
import { track } from '@/lib/analytics-server';

await track(userId, 'qa.question_asked', {
  domain: classification.domain,
  was_cached: !!cacheHit,
  pdf_count: pdfIds.length
});
```

### Analytics aggregation (Sprint 2)

Daily cron job aggregates raw events into useful summaries:

```sql
-- Aggregate daily user activity
INSERT INTO daily_user_metrics
SELECT
  user_id,
  DATE(created_at) AS date,
  COUNT(DISTINCT CASE WHEN event_name = 'session.started' THEN id END) AS session_count,
  COUNT(DISTINCT CASE WHEN event_name = 'qa.question_asked' THEN id END) AS questions_asked,
  COUNT(DISTINCT CASE WHEN event_name = 'pdf.uploaded' THEN id END) AS pdfs_uploaded,
  -- etc
FROM analytics_events
WHERE created_at::DATE = CURRENT_DATE - INTERVAL '1 day'
GROUP BY user_id, DATE(created_at)
ON CONFLICT (user_id, date) DO UPDATE SET ...;
```

### Dashboards

Internal dashboards live at `/admin/*` routes (gated by founder email allow-list). They read from aggregated tables, not raw events (performance).

Key dashboards:
- `/admin/retention` — Day-N retention curves, cohort comparisons
- `/admin/costs` — AI cost breakdown by user, type, model
- `/admin/funnel` — signup → activation → trial → paid
- `/admin/cohorts` — cohort-level engagement
- `/admin/errors` — Sentry-linked error rates

### Third-party analytics (Sprint 4+)

Out of scope for 90 days. Eventual considerations:
- PostHog (self-hosted) for session replay + funnel analysis
- Reverse ETL to a warehouse for deeper analysis
- Stripe-like cohort revenue tracking

For 90 days: pure Postgres analytics is enough.

---

## 8. The observability stack

### Sentry (Phase 0)

Setup:
```javascript
// instrumentation.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% sampling for traces
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});
```

Capture custom errors:
```javascript
try {
  await someRiskyOperation();
} catch (err) {
  Sentry.captureException(err, {
    tags: { feature: 'qa_pipeline' },
    extra: { conversationId, userId }
  });
  throw err;
}
```

Cost: Sentry free tier covers 5K errors/month. Should suffice for first 6 months.

### UptimeRobot (Phase 0)

Monitors `/api/health` every 5 minutes. Alerts on:
- 2 consecutive failures → email
- 4 consecutive failures → SMS (paid feature, optional)

### Vercel Analytics

Built-in for free. Captures: page views, Core Web Vitals, geographic distribution.

### Logging

Use `console.log` + Vercel logs for the 90-day window. Structured logging via Pino is Sprint 4+.

Key logged events:
- Every API request (start + end with duration)
- Every AI call (model, tokens, cost)
- Every webhook (event type, idempotency state)
- Every cron job (start + end + outcome)
- Every error (caught and uncaught)

---

## 9. The CI/CD pipeline (Phase 0)

### GitHub Actions setup

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Branch protection

- `main` branch protected
- Require PR review (solo founder: self-review counts but use the structure)
- Require CI passing before merge
- Require up-to-date branch

### Deployment

Vercel auto-deploys on push to main. Preview deploys on every PR.

### Secrets management

Vercel project secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENAI_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SENTRY_DSN`

Never commit secrets to repo. Use Vercel UI or `vercel env` CLI.

---

## 10. The performance budget

### Page-level budgets

| Page | First Contentful Paint | Time to Interactive | LCP |
|---|---|---|---|
| Landing | <1.5s | <3s | <2.5s |
| Dashboard | <2s | <4s | <3s |
| Brain Map | <3s | <5s | <4s |
| Q&A (in conversation) | <1.5s | <3s | <2.5s |
| Library | <2s | <4s | <3s |

Measured on Slow 4G (target: average Indian mobile network).

### API response time budgets

| Endpoint | p50 | p95 |
|---|---|---|
| GET (cached) | <100ms | <300ms |
| GET (uncached, simple) | <300ms | <800ms |
| GET (complex aggregation) | <800ms | <2000ms |
| POST (mutation) | <500ms | <1500ms |
| POST /api/ask (streaming start) | <800ms | <2000ms |

Sentry traces track these. Investigate when p95 exceeds budget.

### Database query budgets

- Single-row lookups: <10ms
- Vector search: <100ms p95
- Aggregations: <300ms p95
- Concept graph queries: <500ms p95

`EXPLAIN ANALYZE` weekly on suspected slow queries.

---

## 11. The security posture

### Authentication
- Supabase Auth handles password + OAuth (Google login enabled)
- JWT tokens, validated server-side on every API call
- Session expiry: 60 minutes, refresh token expiry: 7 days

### Authorization
- RLS on every user-data table
- API routes verify user_id from JWT, never from request body
- Storage policies enforce folder-level access

### Input validation
- Use zod schemas at every API boundary
- Reject extra fields (strict mode)
- Validate type, range, length

### Output sanitization
- AI responses pass through markdown renderer (DOMPurify equivalent)
- No `dangerouslySetInnerHTML` from user content
- PDFs scanned for malicious content (Sprint 4+)

### Webhook verification
- Razorpay webhook: HMAC SHA256 signature verification
- Reject unsigned or invalid signatures

### Secrets handling
- Never log secrets (Sentry filtered)
- Never include in client bundles (verified at build time)
- Rotate Supabase service role key quarterly

### Critical vulnerabilities (Phase 0 fix)
1. `/api/conversations` accepts unauthenticated requests with `userId` query param → fix: require Bearer auth, derive user_id from token only
2. `/api/delete-pdf` doesn't verify ownership → fix: verify document.user_id == current_user before delete
3. `/dev/*` routes accessible in production → fix: environment guard at route + API level

### Privacy
- User data exported on request (GDPR-compatible)
- User can delete account → cascades to all user-data tables
- 90-day grace period before hard delete (allows recovery from mistake)

---

## 12. The realistic 90-day technical roadmap

### Sprint 1 (Weeks 1-4) — Foundation

**Week 1:**
- Phase 0: security fixes (3 critical APIs)
- Phase 0: Sentry installed
- Phase 0: CI/CD via GitHub Actions
- Phase 0: `/api/health` endpoint
- Phase 0: UptimeRobot monitoring
- Phase 0: Webhook idempotency

**Week 2:**
- Phase 0: 13 missing migrations created + committed
- Phase 0: 3 missing RPCs documented + migration files
- Phase 0: `pg_cron` jobs for cache + usage purge
- Documents `processing_status` column + realtime updates
- Empty state dashboard live

**Week 3:**
- AI call logging table + insertion at all call sites
- Cost monitoring dashboard (internal)
- Brain Map promotion from `/dev/graph` to production
- Peer percentile surfacing
- Onboarding rewrite

**Week 4:**
- Pricing tier rebuild groundwork (new schema)
- 7-day Pro trial logic
- Dashboard 4-mode system
- Sprint 1 polish + bug fixing

### Sprint 2 (Weeks 5-8) — Retention Engine

**Week 5:**
- Push notification infrastructure (Web Push, service worker)
- VAPID keys + subscription endpoints
- Notification preferences UI
- Notification dispatcher cron

**Week 6:**
- Daily briefing generation pipeline
- Cohort assignment + handle generation
- Cohort presence (realtime)
- Cohort leaderboard snapshot

**Week 7:**
- Photo Doubt Cam (vision + RAG integration)
- Streak Freeze auto-application
- New pricing live with trial flow
- Family tier basics

**Week 8:**
- Sunday Recap generation
- Friday Quiz of the Week
- Sprint 2 polish

### Sprint 3 (Weeks 9-12) — PYQ Engine + Polish

**Week 9:**
- PYQ database schema + ingestion pipeline
- Manual PYQ curation begins (parallel with engineering)
- PYQ public SEO pages
- PYQ search API

**Week 10:**
- FSRS scheduler implementation
- Migration of existing SM-2 data to FSRS
- Card review API updates
- Decompression detection (shadow mode)

**Week 11:**
- Mock test simulator (JEE Main MVP)
- Mock analytics + recovery plan generation
- Decompression detection (live with intervention)

**Week 12:**
- Polish pass across all features
- Performance audit + optimization
- Lighthouse audit (target ≥90)
- Beta release preparation

### What's deferred (Sprint 4+)
- TypeScript migration
- DashboardContext refactor
- Native mobile app
- Hindi/Hinglish features
- WhatsApp integration
- Coaching institute B2B platform
- Advanced anti-cheat for mocks
- Custom fine-tuned models
- Real-time collaborative features
- LearnLM-based or alternative model experimentation

---

## 13. The technical risk register

Known risks and their mitigations.

### Risk 1 — Solo founder bus factor
If you're sick for 2 weeks, the product slows. Mitigation: detailed documentation (this file series), automated infrastructure (CI, monitoring, cron), graceful degradation everywhere.

### Risk 2 — OpenAI rate limits
At 5K+ users, hitting tier-1 rate limits is possible. Mitigation: monitor, request rate limit increases proactively, implement client-side queueing if needed.

### Risk 3 — Supabase realtime connection limits
Free tier: 200 concurrent. Pro tier: 500 concurrent. At 1K WAU, connections become a bottleneck. Mitigation: upgrade to Pro early; implement connection pooling and shorter-lived subscriptions.

### Risk 4 — pgvector query slowdown at scale
At 100K+ chunks per user (very heavy user), vector search slows. Mitigation: query timeout (1s), fallback to keyword search, monitor p95.

### Risk 5 — Storage costs spike
PDFs > 50MB or 100+ PDFs per user can spike storage. Mitigation: enforce size limits, periodic cleanup of orphaned files.

### Risk 6 — Sentry quota exhaustion
Runaway error condition could exhaust free 5K errors/month. Mitigation: rate-limit Sentry events (100/min cap), aggressive sampling on common errors.

### Risk 7 — Razorpay outage
Payment provider downtime blocks new subscriptions. Mitigation: graceful messaging ("payments will resume shortly"), no data loss on user side.

### Risk 8 — Database backup gap
Supabase auto-backs up daily. But: no PITR on free tier. Mitigation: upgrade to Pro tier when revenue allows (target: 100 paying users).

---

## 14. The non-negotiable technical rules

1. **Every schema change goes through a migration.** No more "fix it in production."
2. **Every API endpoint validates auth.** Bearer token required, user_id derived from token only.
3. **Every error logged.** Sentry captures everything. Untracked errors are invisible problems.
4. **Every AI call logged with cost.** No untracked spending.
5. **Every user-data table has RLS.** No exceptions.
6. **Every storage object is access-controlled.** Folder-level user_id matching.
7. **Every cron job logs success/failure.** Silent failures are catastrophic.
8. **Every realtime subscription has a cleanup.** Memory leaks compound.
9. **Every external dependency has a graceful failure.** OpenAI down → user sees friendly error, not stack trace.
10. **Every privacy commitment in the master vision is enforced in code.** Not just policy — actual enforcement.

---

*Next: `CLAUDE_CODE_EXECUTION_MASTER.md` — the index document for sprint files. Then sprint files 01, 02, 03. Then the MVP critical tasks + high-leverage features prioritization document.*
