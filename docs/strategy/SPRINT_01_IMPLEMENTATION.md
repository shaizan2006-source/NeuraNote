# Sprint 01 — Implementation
*Weeks 1-4: Foundation, Visibility, Pricing Groundwork*
*For: Ask-My-Notes solo founder — Claude Code execution-ready*
*Date: May 2026*

---

## 0. How to read this

Each task in this document is structured for direct paste into Claude Code:
- **Task name** — short identifier
- **Why** — one-line context
- **Files** — what gets touched
- **Acceptance criteria** — done test
- **Claude Code prompt** — paste-ready
- **Verification** — bash/SQL commands to confirm

Tasks are ordered by day. Each day is sized for ~6 productive hours (allowing for support, debugging, life).

Before you start: read `CLAUDE_CODE_EXECUTION_MASTER.md` Section 11 (Sprint 0 prerequisites). Make sure Sentry, UptimeRobot, baseline metrics are captured first.

---

## Week 1 — Phase 0 Stabilization

The goal of Week 1: **stop the bleeding.** Fix the 2 critical security vulnerabilities, get error monitoring in place, set up CI, document the missing migrations. None of this is glamorous. All of it is mandatory.

---

### Day 1 (Monday) — Security Fix #1: `/api/conversations`

**Why:** Currently accepts unauthenticated requests with `userId` query param. This is the most exploitable vulnerability in the system.

**Files:**
- `app/api/conversations/route.js` (or wherever the handler lives)

**Acceptance criteria:**
- [ ] GET request without `Authorization: Bearer <token>` returns 401
- [ ] GET request with invalid token returns 401
- [ ] GET request with valid token returns conversations for that user_id (derived from token, never from query)
- [ ] Old query param `?userId=...` is ignored or returns 400 if present (don't leak that it's deprecated)
- [ ] All other conversation endpoints (`/api/conversations/[id]`) follow the same pattern

**Claude Code prompt:**

```
TASK: Fix critical auth vulnerability in /api/conversations
SPRINT: 1, Week 1, Day 1
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 3 (API conventions) + Section 11 (Security posture)

ACCEPTANCE CRITERIA:
- Every conversation endpoint requires Authorization: Bearer <jwt>
- user_id is derived from the JWT via Supabase auth, NEVER from request body/query
- Return 401 with no body details if auth fails
- Return 403 if a user tries to access another user's conversation
- Logged errors don't leak user_id or other PII

Files to read first:
- The current /api/conversations route handler
- Any shared auth utility (likely lib/auth.js or middleware)

Files to modify:
- app/api/conversations/route.js (list endpoint)
- app/api/conversations/[id]/route.js (detail endpoint)
- Create lib/auth.js if a shared verifyAuth doesn't exist already

Pattern to apply:
const user = await verifyAuth(req);  // returns user or throws
if (!user) return new Response('Unauthorized', { status: 401 });
const conversations = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', user.id)  // <-- from JWT, not query
  .order('last_message_at', { ascending: false });

Constraints:
- Do not refactor unrelated code
- Preserve existing response shape for backwards compat with client
- Add a brief code comment marking this as the security fix

VERIFICATION:
After implementing, I'll run:
1. curl -X GET https://<dev>/api/conversations → expect 401
2. curl -X GET -H "Authorization: Bearer invalid" https://<dev>/api/conversations → 401
3. curl with valid token → 200 with conversations array
4. curl -X GET https://<dev>/api/conversations?userId=<other> with my token → conversations for ME, not other user
```

**Verification commands (run after Claude Code finishes):**

```bash
# 1. No auth
curl -i http://localhost:3000/api/conversations
# Expect: HTTP/1.1 401

# 2. Invalid token
curl -i -H "Authorization: Bearer invalid_token" http://localhost:3000/api/conversations
# Expect: HTTP/1.1 401

# 3. Valid token (get from Supabase logged-in session)
curl -i -H "Authorization: Bearer $VALID_JWT" http://localhost:3000/api/conversations
# Expect: HTTP/1.1 200 + JSON array

# 4. Cross-user attempt
curl -i -H "Authorization: Bearer $VALID_JWT" "http://localhost:3000/api/conversations?userId=00000000-0000-0000-0000-000000000000"
# Expect: returns OWN conversations, not the queried other user's
```

**Time estimate:** 2-3 hours including testing.

---

### Day 1 (continued) — Security Fix #2: `/api/delete-pdf` ownership

**Why:** Currently doesn't verify that the requesting user owns the document. Anyone with a Bearer token could potentially delete anyone's PDFs.

**Files:**
- `app/api/delete-pdf/route.js` (or `/api/documents/[id]/route.js` if already migrated)

**Acceptance criteria:**
- [ ] DELETE request must include valid Bearer token
- [ ] Document is fetched first; if `document.user_id !== authenticated_user.id`, return 403
- [ ] Document not found returns 404 (don't disclose existence)
- [ ] On success, also deletes from storage bucket (`user-pdfs/<userId>/<documentId>/`)
- [ ] On storage deletion failure, log to Sentry but return 200 (storage cleanup is async-recoverable)

**Claude Code prompt:**

```
TASK: Fix ownership verification in /api/delete-pdf
SPRINT: 1, Week 1, Day 1
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 11 (Security posture)

ACCEPTANCE CRITERIA:
- DELETE requires valid Bearer auth
- Fetch document first by id
- Verify document.user_id matches authenticated user; else return 403
- If document doesn't exist, return 404 (treat same as not-owned to prevent enumeration)
- Delete document_chunks (cascade should handle this; verify FK is ON DELETE CASCADE)
- Delete physical files from Supabase Storage bucket 'user-pdfs/<userId>/<docId>/'
- If storage delete fails, log to Sentry but don't fail the request

Files to modify:
- app/api/delete-pdf/route.js
- Migration file: ensure document_chunks.document_id FK is ON DELETE CASCADE

Pattern:
const user = await verifyAuth(req);
if (!user) return new Response('Unauthorized', { status: 401 });
const docId = new URL(req.url).searchParams.get('id');
const { data: doc } = await supabase
  .from('documents')
  .select('id, user_id')
  .eq('id', docId)
  .single();
if (!doc || doc.user_id !== user.id) return new Response('Not found', { status: 404 });
// Delete row; chunks cascade
await supabase.from('documents').delete().eq('id', docId);
// Delete storage
try {
  await supabase.storage.from('user-pdfs').remove([`${user.id}/${docId}/`]);
} catch (err) {
  Sentry.captureException(err, { tags: { feature: 'pdf_delete_storage' } });
}
return new Response(JSON.stringify({ deleted: true }), { status: 200 });

VERIFICATION:
1. Confirm ON DELETE CASCADE on document_chunks.document_id FK
2. Try deleting another user's PDF → 404
3. Try deleting own PDF → 200, then confirm row gone, chunks gone, storage gone
```

**Verification:**

```bash
# Try deleting someone else's document (use a known doc_id from another user)
curl -i -X DELETE -H "Authorization: Bearer $MY_JWT" "http://localhost:3000/api/delete-pdf?id=$OTHER_USERS_DOC_ID"
# Expect: 404

# Delete own
curl -i -X DELETE -H "Authorization: Bearer $MY_JWT" "http://localhost:3000/api/delete-pdf?id=$MY_DOC_ID"
# Expect: 200

# Verify row gone
psql "$DATABASE_URL" -c "SELECT id FROM documents WHERE id = '$MY_DOC_ID'"
# Expect: 0 rows

# Verify storage gone
# Supabase Studio → Storage → user-pdfs → <userId>/<docId>/ should not exist
```

**Time estimate:** 1.5-2 hours.

---

### Day 2 (Tuesday) — `/api/upload` and `/dev/*` gating

**Tasks today:**
- A. Fix `/api/upload` to derive userId from auth only
- B. Gate all `/dev/*` routes behind environment check

**Why:**
- `/api/upload` currently accepts userId from form data (trustable only if signed)
- `/dev/*` routes expose internal tools to anyone visiting in production

**Acceptance criteria for A:**
- [ ] userId in /api/upload form data is ignored
- [ ] userId derived from JWT
- [ ] Storage path uses authenticated user's id
- [ ] Document row inserted with authenticated user's id

**Acceptance criteria for B:**
- [ ] `/dev/graph/*` returns 404 in production
- [ ] `/dev/api/*` endpoints return 404 in production
- [ ] All `/dev/*` routes have the guard
- [ ] Local development (`NODE_ENV !== 'production'`) still works

**Claude Code prompt (combined):**

```
TASK A: Fix /api/upload to derive userId from JWT only
TASK B: Gate all /dev/* routes behind NODE_ENV check

SPRINT: 1, Week 1, Day 2
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 11

TASK A ACCEPTANCE:
- /api/upload requires Bearer auth
- userId from form data is silently ignored
- userId derived from JWT
- Storage upload path: user-pdfs/<jwt_user_id>/<new_doc_id>/file.pdf
- Document row insertion uses jwt_user_id

TASK B ACCEPTANCE:
- /dev/graph routes return 404 in prod
- /dev/* API routes return 404 in prod  
- Add a centralized check helper: lib/devGuard.js
- Use in both page-level (return notFound()) and API-level (return 404 Response)

Files for Task A:
- app/api/upload/route.js

Files for Task B (find all /dev/* routes):
- app/dev/graph/[docId]/page.js
- app/dev/(any other pages)/page.js
- app/api/dev/*/route.js (if any)
- Create: lib/devGuard.js

devGuard pattern:
// lib/devGuard.js
export function isDevEnv() {
  return process.env.NODE_ENV !== 'production' 
    && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production';
}

// For pages: in page component
import { notFound } from 'next/navigation';
import { isDevEnv } from '@/lib/devGuard';
if (!isDevEnv()) notFound();

// For API: at handler start
import { isDevEnv } from '@/lib/devGuard';
if (!isDevEnv()) return new Response('Not found', { status: 404 });

VERIFICATION (Task A):
1. POST /api/upload with form data including malicious userId → upload happens under MY userId
2. Document row has my user_id

VERIFICATION (Task B):
1. Production deploy: visit /dev/graph/<any> → 404
2. Local: visit /dev/graph/<any> → loads normally
3. Build script: list all /dev/* paths and verify each has guard
```

**Verification:**

```bash
# Task A
curl -X POST -H "Authorization: Bearer $MY_JWT" \
  -F "userId=other_user_id" -F "file=@test.pdf" \
  http://localhost:3000/api/upload
# Check DB: SELECT user_id FROM documents WHERE filename = 'test.pdf' ORDER BY created_at DESC LIMIT 1
# Expect: MY user_id, not other_user_id

# Task B (run in production deploy)
curl -i https://ask-my-notes.com/dev/graph/abc
# Expect: 404

# Task B (run locally)
curl -i http://localhost:3000/dev/graph/abc
# Expect: 200 (works in dev)
```

**Time estimate:** 3-4 hours including testing both.

---

### Day 3 (Wednesday) — Sentry installation + first errors captured

**Why:** Without error monitoring, every silent failure stays silent. Sentry is the eyes.

**Files:**
- `sentry.client.config.js`
- `sentry.server.config.js`
- `sentry.edge.config.js`
- `instrumentation.js`
- `next.config.js` (Sentry plugin)

**Acceptance criteria:**
- [ ] Sentry project created (sign up if not done in Sprint 0)
- [ ] DSN added to Vercel env vars
- [ ] Client errors captured (test by throwing in a button click)
- [ ] Server errors captured (test by throwing in an API route)
- [ ] Source maps uploading correctly
- [ ] Rate limiting set to 100 errors/min to prevent runaway costs
- [ ] tracesSampleRate set to 0.1 (10%)
- [ ] PII filtering enabled (no user emails in error reports)

**Claude Code prompt:**

```
TASK: Install Sentry for client + server + edge contexts
SPRINT: 1, Week 1, Day 3
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 8 (Observability)

ACCEPTANCE CRITERIA:
- @sentry/nextjs installed and configured
- sentry.client.config.js, sentry.server.config.js, sentry.edge.config.js created
- DSN read from NEXT_PUBLIC_SENTRY_DSN env var
- tracesSampleRate: 0.1
- replaysSessionSampleRate: 0.05
- replaysOnErrorSampleRate: 1.0
- beforeSend hook strips email, passwords, tokens from error reports
- A test error is thrown on a hidden /admin/sentry-test route → appears in Sentry dashboard

Files to create:
- sentry.client.config.js
- sentry.server.config.js
- sentry.edge.config.js
- app/admin/sentry-test/page.js (for verification only)

Files to modify:
- next.config.js (wrap with withSentryConfig)
- instrumentation.js (register Sentry)

Constraints:
- Do not log secrets to Sentry. beforeSend must strip them.
- Do not capture every error verbosely; use sampling.
- Add NEXT_PUBLIC_SENTRY_DSN to .env.example with a placeholder.

VERIFICATION:
1. npm install completes
2. Build passes
3. Throw a test error → appears in Sentry within 30 sec
4. Sensitive data redacted in the report
```

**Verification:**

```bash
# After deploy:
# 1. Visit /admin/sentry-test (only visible to founder)
# 2. Trigger the test error button
# 3. Within 1 min, check Sentry dashboard
# 4. Error appears with stack trace, env, no PII

# Also test server-side:
# Modify a known API route to throw an error temporarily
# Trigger it
# Check Sentry for server-side error capture
```

**Time estimate:** 3 hours including testing.

---

### Day 4 (Thursday) — CI/CD via GitHub Actions

**Why:** Manual deploys + manual testing = silent regressions. Automate.

**Files:**
- `.github/workflows/ci.yml`
- `.github/workflows/preview.yml` (optional)

**Acceptance criteria:**
- [ ] CI runs on every push to main + every PR
- [ ] Steps: install, lint, test, build
- [ ] Build uses production env vars (set as secrets)
- [ ] Failed CI blocks merge (branch protection)
- [ ] Status badge on README

**Claude Code prompt:**

```
TASK: Set up GitHub Actions CI for lint + test + build
SPRINT: 1, Week 1, Day 4
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 9 (CI/CD)

ACCEPTANCE CRITERIA:
- .github/workflows/ci.yml runs on push to main and on PRs
- Steps: checkout, setup-node@20, npm ci, npm run lint, npm test (if tests exist), npm run build
- Build step uses Vercel env vars via GitHub secrets
- README.md gets a CI status badge

Required GitHub secrets to set (manually in GitHub repo settings):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- (No need for SUPABASE_SERVICE_ROLE_KEY in CI — only build is tested)

Files to create:
- .github/workflows/ci.yml

If no tests exist yet:
- Skip the test step or use 'npm test --if-present'
- Don't block on missing tests for Sprint 1

VERIFICATION:
1. Push a commit → CI runs → green check on commit
2. PR opened → CI runs on PR → status shown
3. Break lint intentionally → CI fails → can't merge until fixed
```

**Verification:**

```bash
# Manual:
# 1. Push a trivial change
# 2. Check GitHub Actions tab → workflow ran, all green
# 3. Open a PR with a lint violation
# 4. CI fails, PR blocked from merge
```

**Time estimate:** 2-3 hours.

---

### Day 4 (continued) — `/api/health` + UptimeRobot

**Acceptance criteria:**
- [ ] `GET /api/health` returns 200 + JSON `{ status: "ok", version: "<git-sha>", ts: <unix-ms> }`
- [ ] Endpoint requires no auth (public)
- [ ] Checks: DB reachable (simple query), Sentry initialized
- [ ] If any check fails, returns 503
- [ ] UptimeRobot monitor created pinging the production URL every 5 min
- [ ] Email alert on 2 consecutive failures

**Claude Code prompt:**

```
TASK: Add /api/health endpoint + UptimeRobot monitor
SPRINT: 1, Week 1, Day 4
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 8

ACCEPTANCE CRITERIA:
- GET /api/health returns:
  - 200 + { status: "ok", version: "<sha or 'unknown'>", ts: Date.now() }
  - 503 + { status: "degraded", checks: { db: false }, ts: ... } if DB unreachable
- Quick DB check: SELECT 1 with 2-sec timeout
- No auth required
- Response time <500ms in normal conditions

Files to create:
- app/api/health/route.js

UptimeRobot setup (manual, post-deploy):
- Add monitor for https://<production-url>/api/health
- Frequency: 5 min
- Alert contacts: founder email
- Alert when: 2 consecutive failures
```

**Verification:**

```bash
curl -i https://<production>/api/health
# Expect: 200, JSON body, response <500ms

# Then in UptimeRobot dashboard:
# Monitor shows status "UP", uptime 100%
```

**Time estimate:** 1.5 hours.

---

### Day 5 (Friday) — Migration audit + missing migrations

**Why:** 13 tables exist in production without migration files. If you ever need to spin up a fresh environment, you can't. This is the highest-priority engineering debt.

**Tasks today:**
- A. Dump production schema for baseline
- B. Compare to existing migrations
- C. Create migration files for the 13 missing tables + 3 missing RPCs
- D. Add `payment_id` unique constraint for webhook idempotency

**Acceptance criteria:**
- [ ] `supabase db diff` returns empty (local migrations match prod)
- [ ] All 13 tables + 3 RPCs have migration files committed
- [ ] `payment_id` unique constraint exists on `user_plans`
- [ ] `qa_cache` and `qa_usage` purge jobs are scheduled (via pg_cron)

**Claude Code prompt:**

```
TASK: Create migration files for 13 untracked tables + 3 untracked RPCs
SPRINT: 1, Week 1, Day 5
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 2 (Database)

ACCEPTANCE CRITERIA:
- Migrations exist in supabase/migrations/ for every production table
- supabase db diff returns nothing
- Each migration is sequentially timestamped
- payment_id has UNIQUE constraint for webhook idempotency
- pg_cron jobs scheduled for qa_cache + qa_usage cleanup

Steps:
1. Run: supabase db dump --schema-only > /tmp/prod-schema.sql
2. Compare to current migrations
3. For each missing table, create a migration file like:
   supabase/migrations/<timestamp>_add_<tablename>.sql
4. For each missing RPC, create a migration with CREATE OR REPLACE FUNCTION
5. Add payment_id unique constraint migration
6. Add pg_cron job migrations (if not already in DB; verify before adding)

Tables that need migrations (from architecture audit):
- documents, document_chunks, focus_progress, study_streaks, exams,
  pdfs_metadata, chat_messages, user_memory, revision_topics,
  syllabus_topics, daily_progress, pdfs, quizzes

RPCs:
- match_documents
- match_documents_multi  
- increment_memory_weight

Constraints:
- DO NOT run these migrations on production directly. They're documentation.
- The migrations describe state that ALREADY EXISTS in prod.
- Add a comment in each: -- This migration documents existing prod schema; no-op on prod
- Use CREATE TABLE IF NOT EXISTS so re-running is safe
- Same with indexes: CREATE INDEX IF NOT EXISTS

VERIFICATION:
1. supabase db diff returns empty
2. Spin up fresh local DB, run all migrations → schema matches prod
3. payment_id constraint verified via: \d user_plans
```

**Verification:**

```bash
# Local DB fresh start
supabase db reset
# Should apply all migrations cleanly

# Diff against production
supabase db diff --linked
# Should return empty

# Verify constraint
supabase db psql -c "\d user_plans" | grep payment_id_unique
# Should show the unique constraint
```

**Time estimate:** 5-6 hours. This is the biggest single task in Week 1.

---

### Day 5 (continued) — Webhook idempotency

**Acceptance criteria:**
- [ ] Duplicate `payment.captured` webhook with same `payment_id` returns 200 without double-activating subscription
- [ ] Webhook signature verification still works

**Claude Code prompt:**

```
TASK: Add idempotency to Razorpay webhook handler
SPRINT: 1, Week 1, Day 5
ARCHITECTURE REFERENCE: TECHNICAL_ARCHITECTURE.md Section 3 (Webhook idempotency)

ACCEPTANCE CRITERIA:
- /api/payments/webhook checks if payment_id already exists in user_plans before activating
- If exists, return 200 without re-processing (Razorpay then stops retrying)
- Signature verification preserved
- All payment events logged to payment_events table for audit

Files to modify:
- app/api/payments/webhook/route.js

Pattern:
const paymentId = payload.payment.entity.id;
const { data: existing } = await supabase
  .from('user_plans')
  .select('id')
  .eq('payment_id', paymentId)
  .maybeSingle();
if (existing) {
  await logPaymentEvent({ payment_id: paymentId, status: 'duplicate' });
  return new Response('OK (idempotent)', { status: 200 });
}
// ... continue with activation

VERIFICATION:
1. Test webhook with payload manually (use Razorpay test mode)
2. Send same payload twice
3. Verify user_plans has ONE row, not two
4. payment_events table shows duplicate logged
```

**Time estimate:** 2 hours.

---

### Week 1 done test

Run this at end of Friday:

```bash
# 1. Security smoke test
./scripts/security-smoke.sh  # or manual curl tests from Days 1-2

# 2. Sentry alive
# Visit Sentry dashboard, confirm events flowing

# 3. CI green
# Check GitHub Actions tab for recent runs

# 4. /api/health up
curl -i https://<prod>/api/health  # 200

# 5. Migrations clean
supabase db diff --linked  # empty

# 6. UptimeRobot dashboard
# Should show "UP" for /api/health

# 7. No regressions
# Manually click through: signup → upload PDF → ask question → see answer
```

If all 7 pass: Week 1 done. Commit a tag: `git tag sprint-1-week-1-done && git push --tags`.

---

## Week 2 — Visibility Unlocks

The goal of Week 2: **surface what's hidden.** Brain Map, peer percentile, PDF processing feedback. All three are 80% built. The 20% that remains is what users see.

---

### Day 6 (Monday) — `documents.processing_status` + realtime

**Acceptance criteria:**
- [ ] `documents` table has `processing_status`, `processing_progress`, `processing_error` columns
- [ ] `documents` table publishes to `supabase_realtime`
- [ ] `REPLICA IDENTITY FULL` on documents table
- [ ] PDF processing pipeline updates status at each phase
- [ ] Realtime subscription works client-side (test with a manual upload)

**Claude Code prompt:**

```
TASK: Add processing_status to documents + realtime subscription
SPRINT: 1, Week 2, Day 6
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.2 + TECHNICAL_ARCHITECTURE.md Section 4

ACCEPTANCE CRITERIA:
- documents.processing_status TEXT default 'uploading'
  Values: 'uploading' | 'parsing' | 'embedding' | 'extracting_concepts' | 'ready' | 'failed'
- documents.processing_progress INT default 0 (0-100)
- documents.processing_error TEXT nullable
- documents in supabase_realtime publication
- REPLICA IDENTITY FULL on documents
- /api/process-pdf updates status + progress at each phase:
  - uploading: 0%
  - parsing: 20%
  - embedding: 50%
  - extracting_concepts: 80%
  - ready: 100%
- On failure, processing_status='failed' + processing_error set
- Client subscribes via supabase.channel(`doc:${docId}`) on postgres_changes

Files to modify:
- New migration: supabase/migrations/<ts>_add_doc_processing_status.sql
- app/api/process-pdf/route.js (or wherever processing pipeline lives)
- Client component: where PDF status is shown (e.g., LibraryCard.jsx)

Migration content:
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'uploading',
  ADD COLUMN IF NOT EXISTS processing_progress INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER TABLE documents REPLICA IDENTITY FULL;

Client pattern:
const channel = supabase
  .channel(`doc:${docId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'documents',
    filter: `id=eq.${docId}`
  }, (payload) => {
    updateProgress(payload.new.processing_status, payload.new.processing_progress);
  })
  .subscribe();

VERIFICATION:
1. Upload PDF → see status transitions client-side in real-time
2. Manually break embedding step → status='failed', error visible
3. supabase logs show realtime events firing
```

**Time estimate:** 4-5 hours.

---

### Day 7 (Tuesday) — Empty state dashboard + sample PDF

**Acceptance criteria:**
- [ ] New user (0 documents) sees the new empty state (Section 4 of UI_UX_SYSTEM.md)
- [ ] "Upload PDF" CTA visible
- [ ] "Try with sample" loads pre-curated sample PDF
- [ ] After upload, 3-step card sequence updates progressively
- [ ] Sample PDF stored in `sample-pdfs` bucket, copied to user's library on click

**Claude Code prompt:**

```
TASK: Build empty state dashboard for new users + sample PDF flow
SPRINT: 1, Week 2, Day 7
ARCHITECTURE REFERENCE: UI_UX_SYSTEM.md Section 4 + ELITE_FEATURE_ARCHITECTURE.md F1.2

ACCEPTANCE CRITERIA:
- Dashboard detects: if user has 0 documents AND no active session → show empty state
- Empty state matches the UI_UX_SYSTEM.md Section 4 spec
- 3 numbered cards: Upload / Brain Map / Ask
- Primary CTA: "Upload PDF" → opens file picker
- Secondary CTA: "Try with sample" → POST /api/documents/sample
- /api/documents/sample copies a system-bucket PDF to user's library
- Once user has 1 document, dashboard switches to standard mode

Files to create:
- app/api/documents/sample/route.js
- components/dashboard/EmptyState.jsx
- (Curate the sample PDF separately, upload to sample-pdfs bucket — content task)

Files to modify:
- Dashboard page component (likely app/dashboard/page.js)
- DashboardContext if mode logic lives there

Sample PDF content task (separate, ~2 hrs):
- A ~12-page JEE Physics chapter on Rotational Mechanics (NCERT-style)
- Open-source content, no copyright issue
- Upload to Supabase Storage: sample-pdfs/jee-physics-rotational-mechanics.pdf

API pattern:
const user = await verifyAuth(req);
const newDocId = uuid();
// Copy file from sample-pdfs to user-pdfs/<userId>/<newDocId>/
await supabase.storage.from('user-pdfs').copy(
  'sample-pdfs/jee-physics-rotational-mechanics.pdf',
  `${user.id}/${newDocId}/sample.pdf`
);
// Insert document row
await supabase.from('documents').insert({
  id: newDocId,
  user_id: user.id,
  filename: 'Sample - Rotational Mechanics',
  processing_status: 'uploading',
  // ...
});
// Kick off processing
await processDocument(newDocId);
return Response.json({ documentId: newDocId });

VERIFICATION:
1. Sign up new user → see empty state
2. Click "Try with sample" → PDF processes → Brain Map appears → can ask question
3. Existing user with PDFs → does NOT see empty state
```

**Time estimate:** 5-6 hours (4 dev + 2 content curation).

---

### Day 8 (Wednesday) — Brain Map promotion

**Acceptance criteria:**
- [ ] `/brain-map` route exists in production (no `/dev/` prefix)
- [ ] Dashboard sidebar links to `/brain-map`
- [ ] Mobile bottom nav has "🧠 Brain" item
- [ ] Renders user's full concept graph (across all documents)
- [ ] Color-coded by mastery
- [ ] Filter chips: subject, mastery level
- [ ] Click node → side panel
- [ ] Empty state copy if 0 concepts

**Claude Code prompt:**

```
TASK: Promote Brain Map from /dev/graph to production /brain-map
SPRINT: 1, Week 2, Day 8
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.4 + UI_UX_SYSTEM.md Section 6

ACCEPTANCE CRITERIA:
- New route: /brain-map (no dev prefix)
- New API: GET /api/brain-map?subject=...&doc_id=...
- Renders cross-document concept graph
- ReactFlow already installed; reuse existing component
- Filter chips at top (subject, mastery)
- Click node → side panel: concept, related concepts, mastery, "review now"
- Empty state: "Upload a PDF, ask a question, take a quiz — concepts will start appearing here."
- Mobile: touch gestures (pinch zoom, drag pan)
- Adds entry to dashboard sidebar and mobile bottom nav

Files to create:
- app/brain-map/page.js
- app/api/brain-map/route.js
- components/brain-map/BrainMapGraph.jsx (port from /dev/graph)
- components/brain-map/ConceptSidePanel.jsx
- components/brain-map/FilterChips.jsx

Files to modify:
- Sidebar nav component (add Brain Map link)
- Mobile bottom nav component (add Brain Map tab)

API contract:
GET /api/brain-map?subject=physics&min_mastery=0.3
→ {
  nodes: [{id, label, subject, mastery_score, x?, y?, doc_ids}],
  edges: [{from, to, kind, strength}],
  stats: { total: N, mastered: N, strong: N, shaky: N, unknown: N }
}

Performance constraint:
- If user has >300 nodes, implement viewport culling
- Don't render all nodes at once; only viewport + 1-hop neighbors

VERIFICATION:
1. Click sidebar link → /brain-map loads
2. Cross-doc concepts: upload 2 PDFs covering Newton's 3rd Law → both show as one node
3. Filter by subject → only that subject's nodes
4. Click node → side panel opens
5. Empty user → empty state copy visible
```

**Time estimate:** 6-7 hours. Probably spills into Day 9.

---

### Day 9 (Thursday) — Brain Map polish + Peer Percentile

**Tasks today:**
- A. Finish any Brain Map work from Day 8
- B. Surface peer percentile on dashboard + progress page

**Claude Code prompt for Peer Percentile:**

```
TASK: Surface peer percentile (already computed) on dashboard + progress page
SPRINT: 1, Week 2, Day 9
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.3

ACCEPTANCE CRITERIA:
- /api/progress/summary already returns peerPercentile (verify)
- Progress page (top strip) shows: "Top X% of JEE 2027 cohort this week"
- Dashboard (Standard mode) shows: "You're in the top X% of your cohort"
- If cohort size < 30 members: show "Cohort building (N members so far)" — DO NOT show percentile
- If percentile would be bottom 5%: show "Building" rather than "Bottom 5%"
- If user hasn't studied in 14+ days: show last active period note

Files to modify:
- Dashboard component (Standard mode section)
- app/progress/page.js
- Maybe components/dashboard/CohortWidget.jsx (new)

Edge case handling:
const display = (() => {
  if (cohortSize < 30) return { label: 'Cohort building', meta: `${cohortSize} members so far` };
  if (percentile > 99) return { label: 'Top 1%', meta: 'rare air' };
  if (percentile < 5) return { label: 'Building', meta: 'just getting started' };
  return { label: `Top ${100-percentile}%`, meta: `of ${cohortSize.toLocaleString()} cohort members` };
})();

Anti-patterns to avoid:
- DO NOT show percentile during 2-5pm slump window (use dashboard mode logic)
- DO NOT show in Night Mode (after 10pm)

VERIFICATION:
1. Test user in large cohort with high percentile → "Top X%" displayed
2. Test user in cohort <30 → "Cohort building"
3. Test during 2-5pm slump → percentile widget hidden
4. After 10pm → percentile widget hidden
```

**Time estimate:** 3 hours.

---

### Day 10 (Friday) — Onboarding rewrite (start)

The onboarding rewrite is the largest UX task in Sprint 1. Realistically takes 1.5-2 days. Start Friday, finish Monday.

**Acceptance criteria for Week 2 (start of onboarding):**
- [ ] 5-screen flow scaffolded
- [ ] Screen 1 (exam selection) works
- [ ] Screen 2 (class/year) works
- [ ] Progress dots, skip links, conversational copy in place
- [ ] Onboarding state persisted to localStorage + DB
- [ ] Resume-from-last-screen logic works

**Claude Code prompt:**

```
TASK: Rewrite onboarding flow — Screens 1-2 + scaffold
SPRINT: 1, Week 2, Day 10
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.5 + UI_UX_SYSTEM.md Section 3

ACCEPTANCE CRITERIA:
- New route: /onboarding (gated: only shown if profile incomplete)
- 5 screens, navigated via Next/Back
- Screen 1: "Which exam are you preparing for?"
  Options: JEE Main 2027, JEE Main 2026, JEE Advanced 2027, NEET UG 2027, NEET UG 2026, Other
  Required (no skip)
- Screen 2: "What year are you in?"
  Options: Class 11, Class 12, Drop year, Other
  Skippable
- Progress dots at top (1/5 etc.)
- Mobile-first, single column, large tappable cards
- State persisted to localStorage on each screen
- Existing users (profile.exam_type set) bypass onboarding

Files to create:
- app/onboarding/page.js (router/state container)
- app/onboarding/components/ExamSelectionStep.jsx
- app/onboarding/components/ClassLevelStep.jsx
- app/onboarding/components/ProgressDots.jsx

Files to modify:
- Migration: ensure profiles columns exist (exam_type, exam_year, exam_date, class_level, study_window, city, region, cohort_id, exam_other_specified)
- Middleware or root layout: redirect to /onboarding if user logged in but profile incomplete

Profile column migration (if not done):
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS exam_type TEXT,
  ADD COLUMN IF NOT EXISTS exam_year INT,
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS exam_other_specified TEXT,
  ADD COLUMN IF NOT EXISTS class_level TEXT,
  ADD COLUMN IF NOT EXISTS study_window TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS cohort_id TEXT;

VERIFICATION:
1. New signup → redirected to /onboarding
2. Screen 1 → Screen 2 navigation works
3. Refresh mid-onboarding → resume from last screen
4. Existing onboarded user → skips to dashboard
```

**Time estimate:** 5-6 hours.

---

### Week 2 done test

```bash
# 1. Brain Map at /brain-map (not /dev/graph) → loads
# 2. Sidebar + mobile nav link to Brain Map
# 3. Empty state shows for new user
# 4. Sample PDF flow works
# 5. PDF processing shows status updates in real-time
# 6. Peer percentile visible on dashboard + progress page
# 7. /onboarding scaffolded, screens 1-2 working
# 8. No regressions in existing features
```

Commit tag: `git tag sprint-1-week-2-done && git push --tags`.

---

## Week 3 — Dashboard + Onboarding + Q&A Polish

The goal of Week 3: **The dashboard and onboarding finally feel like an Indian JEE/NEET product.** Generic-product packaging dies this week.

---

### Day 11 (Monday) — Finish onboarding (Screens 3-5)

**Tasks:** Screens 3 (exam date), 4 (study window), 5 (city/region) + completion handler + cohort assignment stub.

**Claude Code prompt:**

```
TASK: Complete onboarding Screens 3-5 + completion handler
SPRINT: 1, Week 3, Day 11
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.5

ACCEPTANCE CRITERIA:
- Screen 3: Exam date picker (pre-filled from exam selection, editable)
- Screen 4: Study window selection (4 options)
- Screen 5: City + region selection (India-specific)
- Completion: POST /api/onboarding/complete
  - Saves all data to profiles
  - Assigns cohort_id (stub for now: `${exam_type}_${exam_year}_${region}_${class_level}`)
  - Returns { cohort_id, redirect_to: '/' }
- After completion → empty state dashboard

Files to create:
- app/onboarding/components/ExamDateStep.jsx
- app/onboarding/components/StudyWindowStep.jsx
- app/onboarding/components/LocationStep.jsx
- app/api/onboarding/complete/route.js

Files to modify:
- app/onboarding/page.js (add screens 3-5 to flow)

India city/region data:
Use a simple constants file: lib/india-locations.js
- 6 regions: north, south, east, west, central, northeast
- Major cities listed per region (top 20 each)
- "Other" as fallback

Cohort assignment stub:
const cohortId = `${exam_type}_${exam_year}_${region}_${class_level}`.toLowerCase();
// Insert into cohorts if not exists, into cohort_members
// Full cohort logic in Sprint 2

VERIFICATION:
1. Complete all 5 screens → land on empty dashboard
2. Profile in DB has all fields populated
3. Cohort row created
4. cohort_members row created with anonymous handle
```

**Time estimate:** 5 hours.

---

### Day 12 (Tuesday) — Dashboard 4-mode system

**Acceptance criteria:**
- [ ] Dashboard detects time + activity state
- [ ] Renders one of 4 modes: Morning, Active, Slump, Night
- [ ] Morning Mode (5-11am, low activity): briefing widget placeholder + today's three
- [ ] Slump Mode (2-5pm, no session): gentle "tired? take 5" message
- [ ] Night Mode (after 10pm): muted UI, reflection prompt
- [ ] Standard Mode: regular dashboard

**Claude Code prompt:**

```
TASK: Implement dashboard 4-mode system
SPRINT: 1, Week 3, Day 12
ARCHITECTURE REFERENCE: UI_UX_SYSTEM.md Section 5 + RETENTION_ENGINE_BLUEPRINT.md Section 6 (Night Mode UI)

ACCEPTANCE CRITERIA:
- Dashboard component reads user timezone
- Mode determined by:
  - inSession → Active
  - 22:00-04:59 → Night
  - 14:00-16:59 AND !studiedToday → Slump
  - 05:00-10:59 AND !studiedToday → Morning
  - else → Standard
- Each mode renders different layout/copy/colors
- Briefing widget placeholder (real briefing comes in Sprint 2)
- Morning Mode: "Good morning, {name}. JEE 2027 — N days." + today's three cards
- Slump Mode: "Tired? Take 5 minutes. Or just look around — no pressure."
- Night Mode: muted palette, "Late night, {name}. Sleep is study too."
- Standard Mode: existing dashboard layout

Files to modify:
- DashboardContext.jsx (the 1467-line beast) — add mode-determination logic IF not present
- Dashboard page (use mode to switch layout)

Files to create:
- components/dashboard/modes/MorningMode.jsx
- components/dashboard/modes/SlumpMode.jsx
- components/dashboard/modes/NightMode.jsx
- components/dashboard/modes/StandardMode.jsx
- components/dashboard/modes/ActiveMode.jsx (used during session)

Mode logic:
function determineDashboardMode({ inSession, hour, studiedToday }) {
  if (inSession) return 'active';
  if (hour >= 22 || hour < 5) return 'night';
  if (hour >= 14 && hour < 17 && !studiedToday) return 'slump';
  if (hour >= 5 && hour < 11 && !studiedToday) return 'morning';
  return 'standard';
}

Color/palette switching:
- Morning: indigo accents on off-white
- Active: minimal chrome
- Slump: warm cream, soft sage accents
- Night: deep slate background, sky blue text
- Standard: default palette

CRITICAL UX rules:
- Slump Mode does NOT show streak count or exam countdown prominently
- Night Mode disables exam countdown entirely
- No notifications fired in 2-5pm slump for users in Slump Mode
- No notifications fired after 10pm

VERIFICATION:
1. Mock time to 7am, no session today → Morning Mode
2. Mock time to 3pm, no session → Slump Mode
3. Mock time to 11pm → Night Mode
4. During active session → Active Mode
5. Anytime else → Standard Mode
```

**Time estimate:** 5-6 hours.

---

### Day 13 (Wednesday) — Q&A screen polish

**Acceptance criteria:**
- [ ] Source chips appear at top of answer (which PDFs used)
- [ ] Concept chips highlighted in answer (tappable → Brain Map)
- [ ] Follow-up CTAs after answer: "Practice this — 5 questions", "Add to review deck", "Ask follow-up"
- [ ] Mobile: camera + voice buttons in input bar
- [ ] Streaming feels smooth (no janky pauses)

**Claude Code prompt:**

```
TASK: Polish Q&A screen — source chips, concept chips, follow-up CTAs
SPRINT: 1, Week 3, Day 13
ARCHITECTURE REFERENCE: UI_UX_SYSTEM.md Section 7

ACCEPTANCE CRITERIA:
- Streaming answer renders progressively (existing behavior)
- After answer completes:
  - Source chips at top (from __META__): "📚 Sources: Allen DPP 3, NCERT Mech Ch 5"
  - Tap source chip → opens that PDF section
  - Concept chips inline in answer (parsed from __CONCEPTS__): highlighted tappable spans
  - Tap concept chip → navigate to /brain-map?focus=<concept-id>
  - 3 follow-up CTAs below answer:
    - "Practice this — 5 questions" → POST /api/quiz/generate with topic
    - "Add to review deck" → POST /api/cards/create with concept
    - "Ask follow-up" → focus input field
- Input bar: camera 📷 (placeholder, Sprint 2), mic 🎤 (existing), send

Files to modify:
- Q&A page component
- AnswerRenderer.jsx (parse concept chips inline)
- SourceChips.jsx (new)
- FollowUpCTAs.jsx (new)

Concept chip parsing:
Answer text may contain [concept:abc123]term[/concept] markers from AI.
Or: __CONCEPTS__ block at end with positions.
Parse, replace with <ConceptChip>term</ConceptChip>.

VERIFICATION:
1. Ask a question → see streamed answer
2. After stream, source chips appear at top
3. Concept terms highlighted inline
4. Tap concept → goes to Brain Map
5. Click "Practice this" → quiz generated
```

**Time estimate:** 4-5 hours.

---

### Day 14 (Thursday) — Focus Mode polish + Library card redesign

**Tasks today:**
- A. Focus Mode minimal chrome + idle detection
- B. Library card redesign (info-dense, action-rich)

**Claude Code prompt:**

```
TASK A: Focus Mode polish — minimal chrome + idle detection
TASK B: Library card redesign

SPRINT: 1, Week 3, Day 14
ARCHITECTURE REFERENCE: UI_UX_SYSTEM.md Section 8 (Focus Mode) + Section 9 (Library)

TASK A ACCEPTANCE:
- Focus Mode hides everything except: clock, current activity, small exit button
- Ambient backgrounds (existing 4) preserved
- Idle detection: 90s no activity → gentle "Still with us?" non-blocking prompt
- 5min no activity → auto-pause + "Take a break?" option
- Session end summary: "47 min. 23 cards. 2 concepts strengthened."

TASK B ACCEPTANCE:
- Library item card:
  - Title + subject icon
  - Page count, concept count, last-asked timestamp
  - Mastery from this PDF (%)
  - Actions: Open / Ask about this / Quiz me
- Empty library state with sample-PDF option link

Files to modify:
- components/focus/FocusMode.jsx
- app/library/page.js or wherever library lives
- components/library/LibraryItem.jsx (new or rewrite)

Idle detection pattern:
useEffect(() => {
  let idleTimer = setTimeout(() => setShowStillWithUs(true), 90000);
  const reset = () => {
    clearTimeout(idleTimer);
    setShowStillWithUs(false);
    idleTimer = setTimeout(() => setShowStillWithUs(true), 90000);
  };
  window.addEventListener('mousemove', reset);
  window.addEventListener('keydown', reset);
  window.addEventListener('touchstart', reset);
  return () => {
    clearTimeout(idleTimer);
    window.removeEventListener('mousemove', reset);
    // ...
  };
}, []);

VERIFICATION (A):
1. Enter Focus Mode → minimal UI
2. Be idle 90s → "Still with us?" prompt (non-blocking)
3. Be idle 5 min → "Take a break?" auto-pause

VERIFICATION (B):
1. Library page renders with new cards
2. Each card shows mastery, concept count, etc.
3. Actions work
```

**Time estimate:** 5 hours combined.

---

### Day 15 (Friday) — Week 3 polish + bug fixes

Reserved for catching up on slipped tasks, bug fixes from the week, and one polish pass.

**Suggested polish tasks:**
- Review all copy on dashboard against `STUDENT_PSYCHOLOGY_EXECUTION.md` Section 12-15
- Run Lighthouse audit on key pages, note issues
- Test all flows on a real mobile device
- Fix Sentry errors from the week

---

### Week 3 done test

```bash
# 1. Onboarding 5 screens complete, ends with cohort assignment
# 2. Dashboard switches between modes correctly
# 3. Q&A screen has source + concept chips + follow-up CTAs
# 4. Focus Mode polished
# 5. Library cards redesigned
# 6. Sentry shows fewer errors than Week 2
# 7. Lighthouse mobile ≥ 80 on dashboard
```

---

## Week 4 — Pricing Groundwork + Landing + Polish

The goal of Week 4: **lay the pricing groundwork** for Sprint 2 launch + **rebuild the landing page** + **clean up everything.**

---

### Day 16 (Monday) — Pricing schema + tier definitions

**Acceptance criteria:**
- [ ] `user_plans` schema updated with new tier columns
- [ ] `coaching_institute_pilots` table created
- [ ] Plan enum supports: free, student, pro, family, institute, internal_dev
- [ ] Migration committed

**Claude Code prompt:**

```
TASK: Migrate pricing schema for new tier structure
SPRINT: 1, Week 4, Day 16
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.6

ACCEPTANCE CRITERIA:
- user_plans has new columns:
  - billing_cycle TEXT ('monthly' | 'yearly' | 'family_yearly' | 'institute')
  - trial_ends_at TIMESTAMPTZ
  - paused_until TIMESTAMPTZ
  - family_member_ids UUID[]
- plan column accepts new values: 'student', 'family'
- coaching_institute_pilots table created
- Existing rows are backwards-compatible (no data migration needed)

Files to create:
- supabase/migrations/<ts>_pricing_v2_schema.sql

Migration content:
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS family_member_ids UUID[] DEFAULT '{}';

-- If plan is an enum, alter it:
ALTER TYPE user_plan_enum ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE user_plan_enum ADD VALUE IF NOT EXISTS 'family';
-- (if plan is just TEXT, no migration needed)

CREATE TABLE IF NOT EXISTS coaching_institute_pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  student_count INT,
  status TEXT DEFAULT 'inquiry',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

VERIFICATION:
1. supabase db diff returns empty after running locally
2. Insert a test row with new tier values
3. Existing user_plans rows still queryable
```

**Time estimate:** 1-2 hours.

---

### Day 16 (continued) — 7-day Pro trial logic

**Acceptance criteria:**
- [ ] On signup, user gets `plan='pro'`, `trial_ends_at = signup + 7 days`
- [ ] Daily cron checks trials, downgrades to 'free' when expired
- [ ] Email reminder at Day 5, Day 6, Day 7 of trial
- [ ] `/api/trial/status` endpoint exists
- [ ] In-product banner showing trial countdown (Day 5-7)

**Claude Code prompt:**

```
TASK: Implement 7-day Pro trial on signup
SPRINT: 1, Week 4, Day 16
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.6

ACCEPTANCE CRITERIA:
- New signup → user_plans row inserted with plan='pro', trial_ends_at=NOW()+7days, billing_cycle='monthly'
- /api/trial/status endpoint: returns { is_trial, days_remaining, expires_at }
- Daily cron job: trial-expiration-check
  - Finds plans with trial_ends_at < NOW() AND plan='pro' AND payment_id IS NULL
  - Downgrades to plan='free'
  - Logs event
- In-product banner shown if days_remaining <= 2: 
  "⏱ Pro trial: 2 days left. [Continue Pro] [Switch to Student] [Free]"

Files to create/modify:
- app/api/trial/status/route.js (new)
- supabase/migrations/<ts>_trial_cron.sql (pg_cron job)
- Wherever signup logic lives (auth callback?): set trial on signup
- components/banners/TrialBanner.jsx (new)
- Email templates (Sprint 2 if needed; in-product banner is enough for now)

pg_cron job:
SELECT cron.schedule(
  'trial-expiration-check',
  '0 1 * * *',  -- 1am daily
  $$
  UPDATE user_plans
  SET plan = 'free', updated_at = NOW()
  WHERE plan = 'pro' 
    AND trial_ends_at < NOW()
    AND payment_id IS NULL;
  $$
);

VERIFICATION:
1. Sign up new user → user_plans row has plan='pro', trial_ends_at correct
2. Manually set trial_ends_at to past → run cron → user downgraded
3. Banner shows in product when days_remaining <= 2
```

**Time estimate:** 3 hours.

---

### Day 17 (Tuesday) — Landing page rebuild

The most important marketing surface. Spec is in `UI_UX_SYSTEM.md` Section 2.

**Claude Code prompt:**

```
TASK: Rebuild landing page with JEE/NEET vertical commitment
SPRINT: 1, Week 4, Day 17
ARCHITECTURE REFERENCE: UI_UX_SYSTEM.md Section 2 + MASTER_VISION_AND_MOAT.md Section 1

ACCEPTANCE CRITERIA:
- Hero:
  - H1: "Your AI study companion for JEE and NEET."
  - Subhead: "A tutor that remembers your prep. Knows your syllabus. Stays with you to exam day."
  - Primary CTA: "Start with free trial" (7-day Pro trial, no card required)
  - Visual: anonymized Brain Map screenshot
- Three pillars section:
  - Memory: "Remembers what you struggled with last month"
  - Specificity: "Knows JEE Main 2027 syllabus. Speaks your exam's language."
  - Care: "Notices when you're tired. Won't ping you at midnight."
- Cohort section: live count if available, else "Join 8,000+ JEE 2027 aspirants"
- "What makes it different" — 4 specific differentiators with screenshots
- Pricing preview (link to /pricing for full)
- Founder note section with real photo, "Why I'm building this"
- FAQ section
- Mobile-first, fast loading (Lighthouse ≥90 mobile)

Files to modify:
- app/page.js (or wherever landing lives — possibly app/(marketing)/page.js)

Existing landing components might be salvageable. Refactor in place where possible.

Constraints:
- No auto-play hero video
- No "trusted by 100K students" with stock photos
- No exit-intent popups
- No countdown timers / fake scarcity

Performance:
- Hero image as next/image with priority
- Code-split below-fold content
- Lighthouse target: ≥90 mobile

VERIFICATION:
1. Visit landing → renders fast
2. Lighthouse mobile ≥ 85 (target 90 by end of Sprint 1)
3. Copy matches vertical commitment
4. Mobile view tested on actual phone
```

**Time estimate:** 6-7 hours. May spill into Day 18.

---

### Day 18 (Wednesday) — Pricing page

**Acceptance criteria:**
- [ ] 3 columns: Free / Student / Pro
- [ ] Family tier as separate card below
- [ ] Coaching institute card with contact link
- [ ] Annual/monthly toggle, annual default
- [ ] Pricing in INR
- [ ] No "Most popular" badge
- [ ] No fake scarcity / urgency
- [ ] Mobile-friendly

**Claude Code prompt:**

```
TASK: Build new pricing page
SPRINT: 1, Week 4, Day 18
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.6 + UI_UX_SYSTEM.md Section 13

ACCEPTANCE CRITERIA:
- /pricing route renders new layout
- 3 main columns: Free Explorer (₹0), Student (₹199/mo), Pro (₹399/mo)
- Annual toggle: shows yearly with savings
  - Student annual: ₹1,599/yr (save ₹789)
  - Pro annual: ₹2,999/yr (save ₹1,789)
- Below: Family ₹4,499/yr (2 students + parent dashboard)
- Below: Coaching Institute card → contact form
- 7-day Pro trial highlighted once
- Each tier lists features clearly
- Buttons: "Continue with Free" / "Start Student" / "Start Pro"
- Tap button → Razorpay flow (existing, just new amounts)

Files to modify:
- app/pricing/page.js
- /api/payments/create-order: support new tier+cycle combinations

Razorpay amount lookup table (in lib/pricing.js):
const PRICING = {
  student: { monthly: 19900, yearly: 159900 },
  pro: { monthly: 39900, yearly: 299900 },
  family: { yearly: 449900 },
};

Anti-patterns to avoid:
- No "MOST POPULAR" badge
- No "Save X%" without showing what
- No "X people just signed up!" widgets
- No "limited time offer" framing

VERIFICATION:
1. Pricing page renders correctly mobile + desktop
2. Toggle annual/monthly works
3. Click "Start Student" → Razorpay opens with ₹199 (or ₹1,599 if annual)
4. Click "Start Pro" → ₹399 or ₹2,999
5. Free → just goes to signup
6. Coaching Institute → contact form
```

**Time estimate:** 5 hours.

---

### Day 19 (Thursday) — Cancel + pause flows

**Acceptance criteria:**
- [ ] `/api/subscription/cancel` endpoint works
- [ ] `/api/subscription/pause` endpoint with 30/60/90 day options
- [ ] Settings UI: "Pause subscription" + "Cancel subscription" buttons
- [ ] Cancel confirmation flow (offers pause first)
- [ ] User retains access until billing period ends after cancel

**Claude Code prompt:**

```
TASK: Build subscription pause + cancel flows
SPRINT: 1, Week 4, Day 19
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.6 + STUDENT_PSYCHOLOGY_EXECUTION.md Section 17

ACCEPTANCE CRITERIA:
- /api/subscription/pause: body { duration_days: 30|60|90 } → sets paused_until
- /api/subscription/cancel: body { reason?: string } → marks cancelled, logs reason, retains access until current period end
- Settings page has: "Manage subscription" → opens flow
- Cancel flow:
  1. "We're sorry to see you go."
  2. Offer pause first (30/60/90)
  3. If user picks pause → confirm + redirect
  4. If user picks cancel → optional reason → confirm
  5. Final state: "Cancelled. Your data is yours."
- No dark patterns. Cancel is one-tap, not buried.

Files to create:
- app/api/subscription/pause/route.js
- app/api/subscription/cancel/route.js
- components/settings/SubscriptionFlow.jsx

VERIFICATION:
1. Pause for 30 days → paused_until set, user temporarily locked out of paid features
2. Resume manually (or wait) → access restored
3. Cancel → access until period end, then downgraded to free
4. Settings UI flow tested end-to-end
```

**Time estimate:** 3-4 hours.

---

### Day 20 (Friday) — Sprint 1 polish + Lighthouse audit + deploy

**Tasks:**
- A. Lighthouse audit on landing, dashboard, brain map, pricing, library
- B. Fix top 5 performance issues
- C. Accessibility audit (axe DevTools)
- D. Bug fixes from week
- E. Deploy + smoke test in production

**Acceptance criteria:**
- [ ] Lighthouse mobile ≥85 on all key pages
- [ ] WCAG AA contrast ratios verified
- [ ] No regressions in core flows (signup, upload, ask, paying)
- [ ] Sentry quiet (<1% error rate)
- [ ] All Week 1-4 commits deployed

---

### Sprint 1 done test (end of Week 4)

Run this checklist:

```
[ ] All Phase 0 work complete
    [ ] Security fixes (3 APIs)
    [ ] Sentry capturing errors
    [ ] CI running on PRs
    [ ] /api/health monitored by UptimeRobot
    [ ] 13 missing migrations committed
    [ ] Webhook idempotency
[ ] Brain Map in production at /brain-map
[ ] Peer percentile visible
[ ] Empty state with sample PDF
[ ] PDF processing realtime feedback
[ ] Onboarding rewritten for JEE/NEET
[ ] Pricing schema in place
[ ] 7-day Pro trial logic working
[ ] Dashboard 4-mode system
[ ] Landing page rebuilt
[ ] Pricing page live
[ ] Cancel/pause flows working
[ ] Lighthouse mobile ≥85
[ ] No regressions in core flows
```

If all checked: Sprint 1 done. Tag: `git tag sprint-1-done && git push --tags`.

If 80%+ checked: ship anyway, defer the rest to Sprint 2.
If <80% checked: slow down, fix Phase 0 + critical items, defer the rest aggressively.

---

## What gets cut if Sprint 1 runs over

In order of cut:
1. Library card redesign (Day 14) — can stay in current state
2. Focus Mode idle detection — keep existing minimal version
3. Cancel/pause flows — can defer to Sprint 2 Week 5
4. Landing page polish (keep current if rebuild not done) — Sprint 2 Week 5
5. Dashboard 4-mode (keep existing single-mode if needed)

Never cut:
- Phase 0 security fixes
- Sentry + CI + migrations
- Brain Map promotion
- Peer percentile
- Onboarding rewrite (at minimum Screens 1-2 + completion)
- Pricing schema (groundwork)

---

*Next: `SPRINT_02_IMPLEMENTATION.md` for Weeks 5-8 — retention engine.*
