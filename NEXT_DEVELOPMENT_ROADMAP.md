# Next Development Roadmap — Ask My Notes

_Generated: 2026-05-15 | Updated: 2026-05-16_

---

## Table of Contents

1. [Executive Priorities](#1-executive-priorities)
2. [Sprint 0 — Security Patches (Days 1-2)](#2-sprint-0--security-patches-days-1-2)
3. [Sprint 1 — Foundation Hardening (Week 1)](#3-sprint-1--foundation-hardening-week-1)
4. [Sprint 2 — Core UX Gaps (Week 2)](#4-sprint-2--core-ux-gaps-week-2)
5. [Sprint 3 — Code Architecture (Week 3)](#5-sprint-3--code-architecture-week-3)
6. [Sprint 4 — Admin & Operations (Week 4)](#6-sprint-4--admin--operations-week-4)
7. [Month 2 — Product Expansion](#7-month-2--product-expansion)
8. [Month 3 — Scale & Polish](#8-month-3--scale--polish)
9. [Quarter 2 — Growth Features](#9-quarter-2--growth-features)
10. [Architecture Improvement Plan](#10-architecture-improvement-plan)
11. [Technical Refactor Plan](#11-technical-refactor-plan)
12. [Product Strategy Recommendations](#12-product-strategy-recommendations)

---

## 1. Executive Priorities

### Before Anything Else: The Non-Negotiables

These three items must be done before any new feature work:

| Priority | Task                               | Why                        | Effort   |
| -------- | ---------------------------------- | -------------------------- | -------- |
| 🔴 #1    | Fix 2 API security vulnerabilities | User data at risk          | 2 hours  |
| 🔴 #2    | Create 13 missing SQL migrations   | Schema not reproducible    | 3-5 days |
| 🔴 #3    | Add error monitoring (Sentry)      | Flying blind in production | 4 hours  |

### What to Build First (After Non-Negotiables)

1. **Empty states + PDF processing feedback** — Required for user activation
2. **CI/CD pipeline** — Required for sustainable development
3. **Admin dashboard (basic)** — Required to support paying customers
4. **Light mode CSS** — Removes a trust-breaking UI bug

### What to Defer

- Claude/Anthropic integration (clarify intent first)
- Leaderboard/social features (not core to value proposition)
- Mobile app (web-first, mobile-optimize later)
- Multi-tenancy/School tier admin (after individual user base is stable)

---

## 2. Sprint 0 — Security Patches (Days 1-2)

**Goal:** Eliminate all critical security vulnerabilities before any user data grows.

### Task S0-1: Fix `/api/conversations` Auth Bypass

**File:** `src/app/api/conversations/route.js`
**Time:** 30 minutes

```javascript
// Remove: const userId = searchParams.get("user_id")
// Replace with:
const token = req.headers.get("authorization")?.replace("Bearer ", "");
if (!token)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const {
  data: { user },
} = await supabase.auth.getUser(token);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// Use user.id everywhere user_id was used
```

### Task S0-2: Fix `/api/delete-pdf` Ownership Check

**File:** `src/app/api/delete-pdf/route.js`
**Time:** 30 minutes

```javascript
// Add auth check (same pattern as above), then:
await supabase.from("documents").delete().eq("id", id).eq("user_id", user.id); // ownership enforcement
```

### Task S0-3: Fix `/api/upload` userId from FormData

**File:** `src/app/api/upload/route.js`
**Time:** 30 minutes

```javascript
// Remove: const userId = formData.get("userId")
// Use: user.id from authenticated token only
```

### Task S0-4: Gate `/dev` Routes in Production

**Files:** `src/app/dev/*/page.jsx` and `src/app/api/concepts/backfill/route.js`
**Time:** 1 hour

```javascript
if (process.env.NODE_ENV !== "development") {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

**Sprint 0 Deliverables:**

- [ ] `/api/conversations` requires valid auth token
- [ ] `/api/delete-pdf` verifies PDF ownership
- [ ] `/api/upload` ignores client-provided userId
- [ ] `/dev` routes return 404 in production

---

## 3. Sprint 1 — Foundation Hardening (Week 1)

**Goal:** Make the codebase stable, observable, and reproducible.

### Task S1-1: Create Missing SQL Migrations

**Time:** 3-5 days
**Priority: Critical**

Use `supabase db dump --schema-only` to capture current production schema, then create migration files for:

1. `documents` — core PDF metadata table
2. `document_chunks` — RAG vector storage
3. `focus_progress` — base table (ALTER files already exist)
4. `study_streaks` — streak tracking
5. `exams` — exam scheduling
6. `pdfs_metadata` — FK target from profiles
7. `chat_messages` — legacy chat
8. `user_memory` — adaptive planning
9. `revision_topics` — mastery computation
10. `syllabus_topics` — subject mapping
11. `daily_progress` — daily tracking
12. `quizzes` — quiz sessions
13. Also: `match_documents()`, `match_documents_multi()`, `increment_memory_weight()` RPC definitions

**Pattern to follow:** `supabase/migrations/weak_topics_tables.sql` (with RLS, indexes, comments)

### Task S1-2: Set Up Error Monitoring

**Time:** 4 hours

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configure:

- `sentry.client.config.ts` — client-side errors
- `sentry.server.config.ts` — API route errors
- Set `SENTRY_DSN` environment variable in Vercel
- Add `withSentryConfig` wrapper in `next.config.mjs`

### Task S1-3: Set Up GitHub Actions CI/CD

**Time:** 3 hours

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

### Task S1-4: Set Up pg_cron for Data Purge

**Time:** 2 hours (Supabase dashboard SQL editor)

```sql
-- Enable pg_cron (one-time)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Purge old Q&A cache (7-day TTL)
SELECT cron.schedule('purge-qa-cache', '0 3 * * *',
  $$DELETE FROM qa_cache WHERE created_at < NOW() - INTERVAL '7 days'$$);

-- Purge Q&A usage counters (2-day TTL)
SELECT cron.schedule('purge-qa-usage', '0 3 * * *',
  $$DELETE FROM qa_usage WHERE created_at < NOW() - INTERVAL '2 days'$$);
```

### Task S1-5: Add /api/health Endpoint

**Time:** 30 minutes

```javascript
// src/app/api/health/route.js
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
    ts: Date.now(),
  });
}
```

**Sprint 1 Deliverables:**

- [ ] All 13 missing tables have migration files
- [ ] Schema reproducible from migrations alone
- [ ] Sentry capturing errors (verify in Sentry dashboard)
- [ ] CI pipeline blocks merges with failing lint/tests/build
- [ ] pg_cron running nightly purge jobs
- [ ] /api/health returns 200

---

## 4. Sprint 2 — Core UX Gaps (Week 2)

**Goal:** Fix the user activation funnel and trust-breaking UI issues.

### Task S2-1: Empty State for New User Dashboard

**Time:** 1-2 days

After onboarding, if user has 0 PDFs:

```
┌─────────────────────────────────────┐
│  📄 Upload your first note          │
│  Ask AI questions based on your     │
│  actual study material              │
│                                     │
│  [Upload PDF]  [Watch demo]          │
└─────────────────────────────────────┘
```

Create `src/components/dashboard/EmptyDashboard.jsx`:

- Show when `documents.length === 0 && userReady`
- Prominent upload CTA
- Optional: sample PDF for instant demo
- On progress page: show "Study for 1 day to see your analytics"

### Task S2-2: PDF Processing Status Indicator

**Time:** 2 days

Current flow: user uploads → nothing visible → PDF appears later.

Fix: Poll or subscribe to `documents.concept_extraction_status`:

```
Uploading...  [====25%====]
Processing...  [========75%]
Extracting concepts... [==========95%]
✅ Ready! Start asking questions.
```

Implementation options:

1. **Realtime (preferred):** Subscribe to `documents` table updates in Supabase Realtime
2. **Polling:** Poll `/api/documents/[id]/status` every 3 seconds
3. **Optimistic:** Show "Processing in background, we'll notify you" toast

### Task S2-3: Complete Light Mode CSS

**Time:** 3 days

Define all CSS custom properties under `.theme-light` in `globals.css`:

```css
.theme-light {
  --surface-base: #ffffff;
  --surface-card: #f8fafc;
  --surface-elevated: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-subtle: #e2e8f0;
  /* ... all 30+ tokens */
}
```

Test every page in light mode. Update ThemeToggle to remove "Coming soon" label.

### Task S2-4: Payment Webhook Idempotency

**Time:** 1 day

```javascript
// Before processing webhook:
const { data: existing } = await supabase
  .from("user_plans")
  .select("payment_id")
  .eq("user_id", userId)
  .eq("payment_id", paymentId)
  .single();

if (existing) {
  return NextResponse.json({ status: "already_processed" }, { status: 200 });
}
// Then proceed with activation
```

**Sprint 2 Deliverables:**

- [ ] New users see upload CTA instead of empty dashboard
- [ ] PDF upload shows processing status feedback
- [ ] Light mode renders correctly on all pages
- [ ] Payment webhook handles duplicate events gracefully

---

## 5. Sprint 3 — Code Architecture (Week 3)

**Goal:** Reduce technical debt in the most load-bearing areas.

### Task S3-1: Centralized Auth Middleware Wrapper

**Time:** 2 days

Create `src/lib/api/withAuth.js`:

```javascript
export function withAuth(handler) {
  return async (req, context) => {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    return handler(req, { ...context, user, supabase });
  };
}
```

Migrate the 10 highest-traffic routes first, then progressively roll out.

### Task S3-2: Begin DashboardContext Decomposition

**Time:** 3-4 days (partial — ExamContext first)

Extract `ExamContext.jsx` from DashboardContext:

- Owns: exams, activeExams, historyExams, selectedExam, weak topics
- Functions: fetchExam(), fetchWeakTopics()
- Provides: useExams() hook

This is the lowest-risk extraction (fewest dependencies inside DashboardContext).

### Task S3-3: Add Zod Schemas for Critical API Responses

**Time:** 2 days

```bash
npm install zod
```

```typescript
// src/lib/schemas/progressSchema.ts
import { z } from "zod";

export const ProgressSummarySchema = z.object({
  streak: z.number(),
  focusScore: z.number().min(0).max(100),
  topicsMastered: z.number(),
  // ...
});
```

Validate on backend before sending. Validate on frontend after receiving. Now the contract is enforced at both ends.

### Task S3-4: Remove Duplicate Dependencies

**Time:** 4 hours

```bash
# Audit
npm ls marked markdown-it react-markdown pdf-parse pdf-parser

# Remove duplicates
npm uninstall markdown-it
npm uninstall pdf-parser
# Optionally: npm uninstall @anthropic-ai/sdk (if confirmed unused)
```

**Sprint 3 Deliverables:**

- [ ] withAuth() wrapper adopted on top 10 routes
- [ ] ExamContext extracted from DashboardContext
- [ ] Zod schemas on /api/progress/summary
- [ ] Duplicate packages removed

---

## 6. Sprint 4 — Admin & Operations (Week 4)

**Goal:** Build operational capability to support paying customers.

### Task S4-1: Basic Admin Dashboard

**Time:** 5-7 days

Create `/admin` route (gated by `internal_dev` role check):

**Page 1: User Management**

- List users (email, plan, created_at, last_active)
- Change user plan (select + save)
- View user PDF count + Q&A count today
- Deactivate account

**Page 2: System Health**

- Total users by plan
- Q&A calls today / this week
- PDF uploads today
- Cache hit rate
- Voice call count

**Page 3: Payments**

- Recent Razorpay orders
- Active subscriptions
- Failed payments

Implementation: Direct Supabase queries using service role. No public API routes for admin.

### Task S4-2: Uptime Monitoring

**Time:** 1 hour

Set up UptimeRobot (free tier) to monitor:

- `https://ask-my-notes.com/api/health` every 5 minutes
- Alert via email on 2+ consecutive failures

### Task S4-3: Performance Optimization — Move Clustering to Background

**Time:** 3 days

Move `computeWeakTopicClusters()` out of `/api/progress/summary`:

1. Trigger cluster computation as background job when mastery_topics changes
2. Store results in `generated_artifacts` (cluster_id: "weak_clusters")
3. `/api/progress/summary` reads from generated_artifacts (instant)
4. Background job runs via Supabase Edge Function or `/api/internal/compute-clusters`

**Result:** Progress page load drops by 500-1500ms.

**Sprint 4 Deliverables:**

- [ ] Admin dashboard with user management
- [ ] System health metrics visible to operators
- [ ] Uptime monitoring alerting on failures
- [ ] Progress page no longer blocked by OpenAI call

---

## 7. Month 2 — Product Expansion

### Feature: Concept Graph on Production Pages

**Current:** Accessible only at `/dev/graph/[docId]`
**Target:** Integrated into dashboard as a "Brain Map" section

Implementation:

- Create `src/components/dashboard/BrainMapSection.jsx` using ReactFlow
- Lazy-import ReactFlow: `const ReactFlow = dynamic(() => import('reactflow'))`
- Data from `/api/graph/[docId]` (already exists)
- Toggle between flat weak topics list and graph view

### Feature: Quiz Difficulty & History

**New capabilities:**

- Add difficulty selector (Easy/Medium/Hard) before quiz starts
- Store completed quizzes in `quizzes` table (create migration)
- `/quiz/history` page: past attempts, scores, trends
- Re-attempt specific past quiz

### Feature: Manual SRS Card Creation

**New capabilities:**

- Add "+" button on `/study` page
- Simple form: Front (question) / Back (answer) / Subject
- INSERT into `spaced_repetition_cards` with default SM-2 values
- Edit existing cards

### Feature: Progress Date Range Filter

**New capabilities:**

- Date range picker on `/progress` page
- Query `focus_progress` and `learning_events` by date range
- All metrics recalculate for selected range

### Feature: Exam Reminder Push Notifications

**New capabilities:**

- `useExamReminders` hook already exists — extend to web push
- Register service worker for push notifications
- Send reminder 7 days, 3 days, 1 day before exam date
- Use Supabase Edge Function + cron to trigger

---

## 8. Month 3 — Scale & Polish

### Polish: Mobile Experience Overhaul

- Convert sidebar to bottom navigation bar on mobile (<768px)
- Touch-optimized focus mode (larger tap targets, swipe to skip task)
- Mobile-first quiz layout
- Voice tutor tested and optimized for mobile

### Polish: Onboarding Improvement

- After onboarding, redirect to "Upload your first PDF" screen (not empty dashboard)
- Add sample PDF option ("Try with a sample JEE Physics chapter")
- Progress wizard showing steps to first Q&A

### Scale: Rate Limit Caching

- Add Redis (Upstash) or Supabase KV
- Cache rate limit checks with 5-minute TTL
- Eliminates DB query on every API call

### Scale: Queue for PDF Processing

- Use Supabase Queue or a simple job table
- Decouple PDF upload response from processing
- Webhook/realtime notification when processing completes
- Eliminates timeout issues on large PDFs

### Scale: TypeScript Migration (API Routes)

Priority order:

1. `src/lib/progressUtils.js` (pure functions, easy)
2. `src/app/api/progress/summary/route.js` (most critical)
3. `src/app/api/ask/route.js` (streaming types)
4. All remaining API routes
5. Hooks and context (last)

---

## 9. Quarter 2 — Growth Features

### Leaderboard & Social Comparison

**Motivation:** Peer percentile is already computed. Surface it socially.

- Anonymous weekly leaderboard (top students by focus score in same exam category)
- "You're in the top 23% of JEE students this week" in progress page
- Optional: Share your streak/score as an image card

### Study Groups

- Create/join study groups by exam type
- Shared weak topic tracking within group
- Group leaderboard
- Group chat (not AI — peer-to-peer)

### AI Tutor Persona Customization

- Choose tutor personality: Strict (Socratic), Friendly (Encouraging), Fast (Quick answers)
- Different system prompts per persona
- Persisted in user profile

### Notes Collaboration

- Share a PDF with another user (read-only access)
- Shared conversation on the same PDF
- Fork another user's study plan

---

## 10. Architecture Improvement Plan

### Phase 1 (Now): Emergency Fixes

```
auth bypass → delete ownership → upload validation
```

### Phase 2 (Month 1): Middleware + Observability

```
withAuth() wrapper → Sentry → CI/CD → pg_cron
```

### Phase 3 (Month 2): Context Decomposition

```
DashboardContext (1,467 lines)
  → ExamContext    (350 lines)
  → QuizContext    (200 lines)
  → FocusContext   (300 lines)
  → AnalyticsContext (400 lines)
  → PlanContext    (200 lines)
  → DashboardContext core (200 lines)
```

### Phase 4 (Month 3): TypeScript + API Contracts

```
zod schemas → type-safe API routes → type-safe hooks
→ compile-time safety on frontend/backend contract
```

### Phase 5 (Quarter 2): Streaming Protocol

```
Custom __META__ markers → SSE (Server-Sent Events)
→ named events: data:, event:meta, event:conversation
→ versioned, standard, browser-native
```

---

## 11. Technical Refactor Plan

### Refactor R1: Auth Wrapper (Weeks 3-4)

**Steps:**

1. Create `src/lib/api/withAuth.js`
2. Apply to `/api/progress/*` routes first
3. Apply to `/api/cards/*` routes
4. Apply to all other routes progressively
5. Delete duplicated auth code

### Refactor R2: DashboardContext (Month 2)

**Steps:**

1. Extract `ExamContext` (lowest risk)
2. Extract `QuizContext`
3. Extract `FocusContext`
4. Extract `AnalyticsContext`
5. Update all consumer components
6. Delete extracted code from DashboardContext

### Refactor R3: Dependency Cleanup (Week 2)

**Steps:**

1. Remove `pdf-parser` (keep `pdf-parse`)
2. Remove `markdown-it` (use `react-markdown`)
3. Remove `marked` (use `react-markdown`)
4. Audit `@anthropic-ai/sdk` — document usage or remove
5. Dynamic import ReactFlow (only in dev/graph page)

### Refactor R4: Streaming Protocol (Month 3)

**Steps:**

1. Add `v: 1` field to existing `__META__` payload (backwards-compatible)
2. Frontend: detect version field and parse accordingly
3. Create new SSE-based `/api/ask/v2` endpoint
4. Migrate frontend to v2 endpoint
5. Deprecate v1 after 30 days

---

## 12. Product Strategy Recommendations

### Recommendation 1: Fix Before Feature

Do not add any new AI features until the 2 security vulnerabilities and missing migrations are resolved. A data breach at this stage would end the product.

### Recommendation 2: Nail the First 10 Minutes

The biggest conversion risk is the gap between signup and "first magical moment" (first AI answer that surprises the student). Current gap:

- Onboarding completes → empty dashboard (broken)
- User uploads PDF → no feedback (confusing)
- User asks question → answer appears ✨ (this is the moment)

Sprint 2 fixes the first two steps. Invest in this before any other feature.

### Recommendation 3: Don't Build Admin Last

Admin tooling typically gets built "when we have time," but paying customer issues arise before that time comes. Build the minimum admin dashboard (user list + plan management) before actively selling paid plans.

### Recommendation 4: Choose Your Database Story

Currently, 13 tables exist only in production. Pick one:

- **Option A:** Dump production schema → create migration files → enforce in CI
- **Option B:** Use Supabase migrations strictly going forward + document legacy tables

Option A is safer. Option B is faster. Both are better than the current state.

### Recommendation 5: Double Down on What's Working

The AI Q&A with RAG, the streaming UX, and the realtime progress tracking are genuinely differentiated. These are not common in the EdTech market. Priority for polish and marketing:

1. Demo-worthy Q&A flow (already great)
2. Progress analytics (already great — add social sharing)
3. Voice AI tutor (unique — invest in quality)

### Recommendation 6: Defer Claude Integration

The Anthropic SDK is installed but appears unused. Don't rush to use Claude just because it's there. OpenAI's models are working well. A thoughtful Claude integration (e.g., Claude for long-form analysis, gpt-4o-mini for quick Q&A) is better than a hasty one. Decide the strategy, document it, implement it deliberately.

---

## Sprint Velocity Estimate

Assuming 1 developer, 8 productive hours/day:

| Sprint   | Duration | Effort    | Goal                 |
| -------- | -------- | --------- | -------------------- |
| Sprint 0 | 2 days   | 8 hours   | Security patches     |
| Sprint 1 | 5 days   | 40 hours  | Foundation hardening |
| Sprint 2 | 5 days   | 40 hours  | UX gaps              |
| Sprint 3 | 5 days   | 40 hours  | Code architecture    |
| Sprint 4 | 5 days   | 40 hours  | Admin + ops          |
| Month 2  | 20 days  | 160 hours | Product expansion    |
| Month 3  | 20 days  | 160 hours | Scale + polish       |

**Total to production-ready (security + stability + admin):** ~22 working days (~4.5 weeks)

**Total to feature-complete for Series A demo:** ~3-4 months
