# Technical Debt Audit — Ask My Notes
*Generated: 2026-05-15 | Updated: 2026-05-16*

---

## Table of Contents
1. [Security Vulnerabilities](#1-security-vulnerabilities)
2. [Architecture Debt](#2-architecture-debt)
3. [Database Debt](#3-database-debt)
4. [Code Quality Issues](#4-code-quality-issues)
5. [Dependency Debt](#5-dependency-debt)
6. [Performance Debt](#6-performance-debt)
7. [Testing Debt](#7-testing-debt)
8. [Operational Debt](#8-operational-debt)
9. [UX Debt](#9-ux-debt)
10. [Debt Priority Matrix](#10-debt-priority-matrix)

---

## 1. Security Vulnerabilities

### 🚨 CRITICAL-1: Unauthenticated Conversation Fetch
**File:** `src/app/api/conversations/route.js`
**Severity:** Critical — User data exposure

**Problem:**
```javascript
// Current (vulnerable):
const { searchParams } = new URL(req.url);
const userId = searchParams.get("user_id");  // ← trusted from query param!
// No auth token check
const convs = await supabase.from("conversations")
  .select("*").eq("user_id", userId);
```

**Impact:** Any unauthenticated HTTP client can enumerate any user's conversation list by guessing or knowing their UUID.

**Fix:**
```javascript
const token = req.headers.get("authorization")?.replace("Bearer ", "");
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// Use user.id, NOT query param
```

**Effort:** 30 minutes

---

### 🚨 CRITICAL-2: Unauthorized PDF Deletion
**File:** `src/app/api/delete-pdf/route.js`
**Severity:** Critical — Data destruction without authorization

**Problem:**
```javascript
// Current (vulnerable):
const { searchParams } = new URL(req.url);
const id = searchParams.get("id");
// No ownership verification
await supabase.from("documents").delete().eq("id", id);
```

**Impact:** Any authenticated user can delete any other user's PDF by knowing (or brute-forcing) the UUID.

**Fix:**
```javascript
// Auth check first (as above), then:
await supabase
  .from("documents")
  .delete()
  .eq("id", id)
  .eq("user_id", user.id);  // ← ownership enforced
```

**Effort:** 30 minutes

---

### ⚠️ HIGH-1: Upload userId From FormData
**File:** `src/app/api/upload/route.js`
**Severity:** High — Identity spoofing on upload

**Problem:**
```javascript
const userId = formData.get("userId");  // ← client-controlled
```

**Impact:** Authenticated users can upload PDFs attributed to other user IDs.

**Fix:** Extract userId exclusively from `supabase.auth.getUser(token)`.

---

### ⚠️ MEDIUM-1: No Backend Account Lockout
**Severity:** Medium — Brute force risk on login

**Problem:** Frontend enforces 5 failed attempt limit in UI state. Backend (Supabase GoTrue) has no lockout by default unless explicitly configured.

**Fix:** Configure Supabase Auth lockout settings in Supabase dashboard (`Max login attempts` + lockout duration).

---

### ⚠️ MEDIUM-2: Webhook Double-Activation Risk
**File:** `src/app/api/payments/verify/route.js` + `src/app/api/payments/webhook/route.js`
**Severity:** Medium — Plan activation inconsistency

**Problem:** Both verify and webhook upsert user_plans. If Razorpay sends webhook AND client calls verify for same payment, two upserts fire without idempotency guard. Plan expiry may differ by seconds.

**Fix:** Add `payment_id` unique constraint on user_plans or check if payment_id already processed before activating.

---

### ⚠️ MEDIUM-3: Streaming Protocol Not Versioned
**File:** `src/app/api/ask/route.js` + client parser
**Severity:** Medium — Silent breaking changes

**Problem:** Custom streaming protocol uses `__META__` and `__CONV__` markers with no version field. Any change to marker format or JSON shape silently breaks all clients parsing these markers.

**Fix:** Add version field to META payload (`__META__{"v":1,...}`) and handle in client parser.

---

### ℹ️ LOW-1: Error Messages Expose System State
**Severity:** Low — Information disclosure

**Problem:**
```javascript
// Examples found:
"PDF does not contain answers"
"Failed to extract text from PDF"
"Vector search failed: ..."
```

These messages confirm internal implementation details to clients. Minor risk but helps attackers understand stack.

**Fix:** Map internal errors to user-friendly generic messages. Log specifics server-side.

---

## 2. Architecture Debt

### ARCH-1: No Centralized Auth Middleware
**Impact:** High — Maintainability nightmare at 58+ routes

**Current Pattern:** Auth token extraction and user verification is copy-pasted across all 58 route handlers (19 lines of code each). This means:
- 58 independent failure points
- One-line change to auth logic requires touching 58 files
- Routes are easy to accidentally add without auth
- No consistent 401 response shape

**Evidence:** agent-backend confirmed "No middleware.ts/middleware.js in src/ root" after globbing.

**Fix:** Create `src/middleware.ts` for public route protection, plus shared `src/lib/api/withAuth.ts` wrapper:
```typescript
// src/lib/api/withAuth.ts
export function withAuth(handler: AuthedHandler) {
  return async (req: Request) => {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return unauthorized();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return unauthorized();
    return handler(req, user);
  };
}
```
**Effort:** 2-3 days (refactor all routes + test)

---

### ARCH-2: DashboardContext Monolith (1,467 lines)
**Impact:** High — Growing unmaintainability

**Problem:** `DashboardContext.jsx` is a single React context/provider that manages:
- Authentication state
- Document list
- Q&A streaming state
- Quiz state
- Mastery and weak topics
- Exam data
- Focus session lifecycle
- Analytics and insights
- Plan and daily schedule
- Realtime subscriptions

This violates the Single Responsibility Principle. Adding any new feature requires reading through 1,467 lines of unrelated state.

**Decomposition Plan:**
```
DashboardContext (auth, user, documents — keep)
├── ExamContext (exams, weak topics, syllabus)
├── QuizContext (quiz state, results)
├── FocusContext (focus session lifecycle, tasks)
├── AnalyticsContext (progress summary, insights)
└── PlanContext (daily plan, adaptive plan, smart plan)
```
**Effort:** 5-7 days (high risk, needs careful extraction + testing)

---

### ARCH-3: Custom Streaming Protocol (No Versioning)
**Impact:** Medium

**Current:** `__META__{json}\n` prefix + text stream + `__CONV__{json}` suffix — parsed by a fragile string search in frontend.

**Risk:** Backend format change silently breaks all in-flight responses. No version negotiation. Frontend and backend must always be in sync.

**Fix:** Migrate to SSE (`text/event-stream`) with named events, or add `"v":1` version field to META block.

---

### ARCH-4: No TypeScript
**Impact:** Medium — Runtime errors that TypeScript would catch at compile time

**Scope:** All files except `ThemeContext.tsx`, `FocusAmbientBackground.tsx`, `AIDustLayer.tsx`, and `useIdleDetection.ts` are plain JavaScript.

**Risk:** API response shapes are assumed, not enforced. Frontend expects `progress.data.focusScore`, but if backend renames it, no compiler catches it.

**Fix:** Incremental TS migration. Start with API route files (highest value), then hooks, then components.

---

### ARCH-5: Adaptive Planner Inlined in Context
**Impact:** Low-Medium

**Evidence:** `CLAUDE.md` references `adaptivePlanner.js` as a separate library but the agent found no such file. Adaptive planning logic (`generateAdaptivePlan()`) is embedded directly in `DashboardContext.jsx`.

**Problem:** Business logic (topic ranking formula, scoring weights) is buried in UI state management code. Changes require navigating 1,467 lines.

**Fix:** Extract `generateAdaptivePlan()` into `src/lib/adaptivePlanner.js` (standalone, testable function).

---

## 3. Database Debt

### DB-1: 13 Tables Without Migrations
**Impact:** Critical — Schema not reproducible

**Tables missing CREATE TABLE migrations:**

| Table | Impact |
|-------|--------|
| `documents` | Core PDF storage — fundamental |
| `document_chunks` | RAG vector storage — fundamental |
| `focus_progress` | Base table missing; only ALTER exists |
| `study_streaks` | Streak data |
| `exams` | Exam scheduling |
| `pdfs_metadata` | FK target from profiles |
| `chat_messages` | Legacy chat |
| `user_memory` | Adaptive planning |
| `revision_topics` | Mastery computation |
| `syllabus_topics` | PDF subject mapping |
| `daily_progress` | Daily tracking |
| `pdfs` | PDF secondary reference |
| `quizzes` | Quiz session data |

**Consequence:** Cannot set up a new development environment or disaster-recovery environment from migrations alone. The schema lives only in the production Supabase instance.

**Fix:** Use `supabase db dump --schema-only` to capture current schema, then create proper migration files for each table.
**Effort:** 3-5 days

---

### DB-2: Missing RPC Definitions
**Impact:** High — RPCs called in code but not version-controlled

| RPC | Used In | Migration Status |
|-----|---------|-----------------|
| `match_documents()` | rag.js (vector search) | ❌ Missing |
| `match_documents_multi()` | rag.js (multi-PDF search) | ❌ Missing |
| `increment_memory_weight()` | memory.js | ❌ Missing |

**Consequence:** Same reproducibility issue as missing table migrations.

---

### DB-3: No Automatic Data Purge
**Impact:** Medium — Table bloat over time

**Tables needing TTL purge:**
- `qa_cache` — 7-day TTL; no purge job configured
- `qa_usage` — 2-day TTL; no purge job configured
- `learning_events` — No TTL; could grow to millions of rows

**Fix:** Configure `pg_cron` extension in Supabase:
```sql
SELECT cron.schedule('purge-qa-cache', '0 3 * * *',
  $$DELETE FROM qa_cache WHERE created_at < NOW() - INTERVAL '7 days'$$);

SELECT cron.schedule('purge-qa-usage', '0 3 * * *',
  $$DELETE FROM qa_usage WHERE created_at < NOW() - INTERVAL '2 days'$$);
```
**Effort:** 2 hours

---

### DB-4: IVFFlat Index Tuning Required at Scale
**Impact:** Low (now), High (at scale)

**Current:** `lists=100` on all vector indexes. This is appropriate for ~1M vectors. At 10M+ vectors performance degrades.

**Tables affected:** `learning_events.embedding`, `concepts.embedding`, `document_chunks.embedding`

**Fix at scale:** Re-index with `lists=sqrt(row_count)` or migrate to HNSW indexes when pgvector supports them stably.

---

### DB-5: Dual-Table Mastery Tracking
**Impact:** Medium — Data inconsistency risk

**Problem:** Mastery is tracked in TWO places:
1. `mastery_topics` — string-based topic scores (Free-text topic names)
2. `mastery_state` — UUID concept-based FSRS state (structured from concept graph)

These are not joined or reconciled. A student's mastery in `mastery_topics` can diverge from `mastery_state` for the same underlying concept.

**Fix:** Define canonical source: `mastery_topics` for general display, `mastery_state` for SRS scheduling. Document the separation.

---

## 4. Code Quality Issues

### CQ-1: Error Swallowing Pattern
**Impact:** High — Silent failures in production

**Pattern found across multiple files:**
```javascript
// Antipattern 1: Silent catch
await someOperation().catch(() => {});

// Antipattern 2: Catch and continue without logging
try {
  await criticalOperation();
} catch (err) {
  // do nothing
}

// Antipattern 3: Return empty instead of 500
if (dbError) return NextResponse.json([]);  // no error logged
```

**Consequence:** Production failures silently degrade. Users see empty data instead of errors. Engineers can't diagnose what failed.

**Fix:** Always log caught errors. Return appropriate status codes. Never swallow exceptions silently.

---

### CQ-2: Auth Code Duplication
**Lines affected:** ~1,100 lines (58 routes × ~19 lines each)

Already covered in ARCH-1. The fix (auth middleware wrapper) eliminates this at the source.

---

### CQ-3: Inconsistent Response Shapes
**Impact:** Medium

Some routes return `{ error: "message" }` on failure. Others return `[]` (empty array). Others return `null`. Others return `{ data: null, error: "..." }`.

Frontend must defensively handle all possible shapes, leading to scattered `?.` null checks.

**Fix:** Define and enforce a consistent envelope:
```typescript
// Success:  { data: T, error: null }
// Failure:  { data: null, error: string, status: number }
```

---

### CQ-4: Two Markdown Parsers
**Impact:** Low — Bundle bloat

Both `marked@17` and `markdown-it@14` are installed and imported in different parts of the codebase. `react-markdown@10` is also used as a component. Three overlapping solutions for the same problem.

**Fix:** Standardize on `react-markdown` (already a component) and remove `marked` and `markdown-it`.

---

### CQ-5: Two PDF Parsers
**Impact:** Low — Confusion + potential divergence

Both `pdf-parse@1.1.4` and `pdf-parser@1.0.5` are installed. Two libraries doing the same thing.

**Fix:** Audit which is actually used (likely `pdf-parse`). Remove the other.

---

### CQ-6: Unexplained Anthropic SDK
**Impact:** Low — Dead code + bundle bloat

`@anthropic-ai/sdk@0.90.0` is installed but no confirmed production usage found in the codebase. May be exploratory.

**Fix:** Either confirm usage and document it, or remove the package.

---

### CQ-7: Mixed Styling Approaches
**Impact:** Low — Maintenance friction

Three styling systems in use simultaneously:
1. CSS Custom Properties (globals.css) — design tokens
2. Tailwind v4 utility classes — layout and spacing
3. Inline styles in React components — dynamic values

No clear rule for which to use when. Some components use all three.

**Fix:** Document the convention: CSS vars for tokens, Tailwind for layout, inline only for true dynamic values (animations, computed dimensions).

---

### CQ-8: `/dev` Routes in Production Build
**Impact:** Medium — Information exposure

`/dev/graph/[docId]` and `/dev/backfill` are accessible in production. Anyone who discovers the URL can view concept graphs for any document or trigger backfill operations.

**Fix:**
```javascript
// Add to each dev route:
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
```

---

## 5. Dependency Debt

### DEP-1: Heavyweight Libraries Loaded Globally
| Library | Size (est. gzipped) | Current Use | Fix |
|---------|-------------------|-------------|-----|
| reactflow@11 | ~200KB | Only /dev/graph | Dynamic import in that page only |
| framer-motion@12 | ~100KB | All pages | Keep, but tree-shake unused features |
| langchain@1 | ~400KB+ | Text splitting only | Replace with `langchain/text_splitter` only |
| tesseract.js@7 | ~5MB+ | OCR fallback | Keep server-side only |

### DEP-2: Duplicate Functionality
| Function | Packages |
|----------|---------|
| PDF parsing | pdf-parse + pdf-parser (both installed) |
| Markdown rendering | marked + markdown-it + react-markdown |
| AI SDK | openai + @anthropic-ai/sdk (latter potentially unused) |

**Savings from cleanup:** ~600KB+ from bundle, cleaner dependency graph.

---

## 6. Performance Debt

### PERF-1: Rate Limit Checks Are DB Queries Per Request
**Impact:** Medium — Latency + DB load

**Current:**
```javascript
// On every /api/ask call:
const count = await supabase.from("qa_usage")
  .select("count").eq("user_id", userId)
  .gte("created_at", startOfDay);
```

At scale, this adds a DB round-trip to every API request. Under load, this creates a hot-path table scan.

**Fix:** Cache rate limit results in Supabase Edge Functions or a Redis layer (5-minute TTL). Or use a sliding window counter in the DB with a materialized view.

---

### PERF-2: computeWeakTopicClusters Blocks /api/progress/summary
**Impact:** High — Response time

**Current:** `computeWeakTopicClusters()` calls OpenAI embeddings API synchronously before returning the progress summary response. Adds 500-1,500ms.

**Fix:** 
1. Pre-compute clusters as a background job after mastery updates
2. Store cluster results in `generated_artifacts` table
3. Return cached clusters from progress summary endpoint

---

### PERF-3: DashboardContext Mounts 6+ Parallel Fetches
**Impact:** Medium — Initial load time

On mount, DashboardContext fires 6+ simultaneous API calls. While they're parallelized via `Promise.all()`, they all compete for the same DB connection pool and hit rate limits simultaneously.

**Fix:** Lazy-load non-critical data (analytics, insights) after initial render.

---

### PERF-4: No HTTP Response Caching on Progress Summary
**Current:** `Cache-Control: private, max-age=60, stale-while-revalidate=300`

Progress summary is expensive (6 DB queries + AI clustering). The cache header is set correctly, but browser caching depends on the request having stable URL + headers (which the Bearer auth header prevents for most CDN caches).

**Fix:** Add an ETag or Last-Modified header. Use SWR pattern more aggressively on client.

---

## 7. Testing Debt

### TEST-1: No API Integration Tests
**Impact:** High — Backend regressions undetected

15 unit tests cover pure functions. No test exercises the full API request lifecycle (auth → DB query → response).

**Missing test coverage:**
- Auth middleware behavior
- Rate limit enforcement
- Streaming response format
- PDF processing pipeline
- Payment webhook verification
- Database constraint behavior

---

### TEST-2: No Contract Tests
**Impact:** High — Frontend/backend drift

No tests verify that the shape of `/api/progress/summary` matches what `useProgressData.js` expects. Changes to either side break silently.

**Fix:** Add zod schemas for all API responses. Validate in both backend (before send) and frontend (after receive).

---

### TEST-3: E2E Tests Unknown Coverage
**Impact:** Medium

Playwright is configured for chromium + mobile-chrome, but the actual test files under `tests/e2e/` weren't fully audited. Coverage is unknown.

**Fix:** Run `playwright test --reporter=html` and review actual coverage report.

---

### TEST-4: No Load Test Baselines
**Impact:** Medium

`tests/load/load-test.mjs` exists but no documented baseline metrics. No SLA defined for API response times.

**Fix:** Run load test, document current p50/p95/p99 latency for key endpoints, set alert thresholds.

---

## 8. Operational Debt

### OPS-1: No Error Monitoring
**Impact:** Critical — Blind in production

No Sentry, Datadog, or equivalent. All errors go to `console.error()` which is visible only in Vercel logs (limited to 7 days, requires manual browsing).

**Fix:** 
```bash
npm install @sentry/nextjs
```
Then configure in `sentry.client.config.ts` and `sentry.server.config.ts`.
**Effort:** Half day

---

### OPS-2: No CI/CD Pipeline
**Impact:** High — No automated quality gate

No GitHub Actions. Every push to main/master deploys immediately to Vercel without running tests, lint, or build verification.

**Risk:** A broken build ships to production users.

**Fix:**
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    steps:
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run build
```
**Effort:** 2-3 hours

---

### OPS-3: No Database Migration Verification
**Impact:** High — Migrations may fail silently in production

No CI step runs `supabase migration up --dry-run` to verify migration files are valid before deploying.

---

### OPS-4: No Uptime Monitoring
**Impact:** Medium

No external health check (UptimeRobot, Pingdom, etc.) to alert if the Vercel deployment or Supabase goes down.

**Fix:** Set up UptimeRobot (free tier) to ping `/api/health` every 5 minutes.

---

### OPS-5: API Has No /health Endpoint
**Impact:** Low — Affects monitoring and Kubernetes-style deployments

No `/api/health` endpoint returns service status. Hard to verify deployment success.

**Fix:**
```javascript
// src/app/api/health/route.js
export async function GET() {
  return NextResponse.json({ status: "ok", ts: Date.now() });
}
```

---

## 9. UX Debt

### UX-1: No Empty State for New Users
**Impact:** High — First-run experience is broken

A brand-new user who completes onboarding sees:
- An empty dashboard with no calls to action
- Progress page with all zeros
- SRS page with "No cards due" with no explanation

There's no guided "Upload your first PDF to get started" flow.

---

### UX-2: No PDF Processing Feedback
**Impact:** High — Users abandon after upload

After uploading a PDF, there's no loading indicator, progress bar, or success notification. The UI doesn't communicate when processing (chunking, embedding, concept extraction) is complete. Users don't know if it worked.

**Fix:** Poll or subscribe to realtime updates on `documents.concept_extraction_status` and show progress in the UI.

---

### UX-3: Light Mode Non-Functional
**Impact:** Medium — Breaks brand trust

The ThemeToggle shows "Light" as an option. Selecting it applies `theme-light` class to `<html>` but no CSS variables are defined for this theme. The UI renders with dark text on dark backgrounds.

**Fix:** Define all CSS custom properties under `.theme-light` in globals.css.

---

### UX-4: Mobile Sidebar Not Converted
**Impact:** Medium

On mobile (<768px), the sidebar collapses but doesn't convert to a bottom navigation bar. Users must open the collapsed sidebar to navigate between sections, which is unusual UX for a mobile app.

---

### UX-5: Quiz Missing Difficulty Selection
**Impact:** Low-Medium

Users can't choose quiz difficulty before starting. All quizzes pull from the same default difficulty setting. No way to request "hard MCQs only" or "5-mark questions."

---

## 10. Debt Priority Matrix

### Priority 1 — Fix This Week (Security + Stability)
| Item | Type | Effort | Impact |
|------|------|--------|--------|
| Fix conversations auth bypass | Security | 30 min | Critical |
| Fix delete-pdf ownership check | Security | 30 min | Critical |
| Fix upload userId validation | Security | 30 min | High |
| Add error monitoring (Sentry) | Ops | 4 hours | Critical |
| Set up CI/CD (GitHub Actions) | Ops | 3 hours | High |
| Gate /dev routes in production | Security | 1 hour | Medium |

### Priority 2 — Fix This Month (Foundation)
| Item | Type | Effort | Impact |
|------|------|--------|--------|
| Create 13 missing migrations | DB | 3-5 days | Critical |
| Create missing RPC migrations | DB | 1 day | High |
| Set up pg_cron for data purge | DB | 2 hours | Medium |
| Add centralized auth middleware | Architecture | 2-3 days | High |
| Empty state for new user dashboard | UX | 1 day | High |
| PDF processing status indicator | UX | 2 days | High |
| Light mode CSS completion | UX | 3 days | Medium |

### Priority 3 — Fix Next Quarter (Quality)
| Item | Type | Effort | Impact |
|------|------|--------|--------|
| Split DashboardContext | Architecture | 5-7 days | Medium |
| TypeScript migration | Code Quality | 2-3 weeks | Medium |
| Remove duplicate dependencies | Deps | 1 day | Low |
| Add API integration tests | Testing | 1 week | High |
| Add contract tests (Zod) | Testing | 3 days | Medium |
| Cache rate limit checks | Performance | 2 days | Medium |
| Move cluster computation to BG | Performance | 3 days | High |

### Priority 4 — Plan for Future (Nice to Have)
| Item | Type | Effort | Impact |
|------|------|--------|--------|
| Stream protocol versioning | Architecture | 3 days | Low |
| Admin dashboard | Product | 2-3 weeks | High |
| HNSW vector index migration | DB/Perf | 2 days | Low (now) |
| Mobile bottom nav | UX | 3 days | Medium |
| Unified response envelope | API | 1 week | Medium |

---

### Debt Cost Estimate

| Category | Est. Developer Days | Risk Level |
|----------|--------------------|----|
| Security fixes (P1) | 2 days | 🔴 Critical |
| Missing migrations | 5 days | 🔴 Critical |
| Auth middleware | 3 days | 🟠 High |
| Error monitoring + CI | 2 days | 🟠 High |
| UX gaps (empty states, feedback) | 5 days | 🟠 High |
| Context decomposition | 7 days | 🟡 Medium |
| TypeScript migration | 15 days | 🟡 Medium |
| Test coverage | 7 days | 🟡 Medium |
| Performance optimization | 5 days | 🟢 Low-Med |
| **Total** | **~51 days** | |
