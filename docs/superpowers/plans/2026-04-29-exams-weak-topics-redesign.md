# Exams + Weak Topics Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static, unfiltered Exams card with a fully live, subject-aware system where weak topics update in real-time as the student studies, quizzes, and completes focus sessions.

**Architecture:** Modular bottom-up build — pure utility functions first (testable in isolation), then API layer, then hook/context wiring, then UI components, then integration points. Each layer builds on the previous; do not skip ahead. The Realtime DB migration must be applied before the hook change ships.

**Tech Stack:** Next.js 14 App Router, React Context, Supabase (Postgres + Realtime), Node `--test` for unit tests, no component test framework.

---

## Phase 1 — Database Foundation

### Task 1: Migration — add `subject` column to exams

**Files:**
- Create: `supabase/migrations/20260429_add_subject_to_exams.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260429_add_subject_to_exams.sql
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS subject TEXT;

COMMENT ON COLUMN public.exams.subject IS
  'Normalized subject key (e.g. "dbms", "physics") from SUBJECT_MAP. NULL for exams created before this migration.';
```

- [ ] **Step 2: Apply the migration**

In the Supabase dashboard → SQL Editor, run the file contents.
OR via CLI: `supabase db push` if CLI is configured.

Expected: No error. Verify in Table Editor that `exams` now has a `subject` column.

- [ ] **Step 3: Verify existing rows are unaffected**

```sql
SELECT id, name, subject FROM public.exams LIMIT 5;
```

Expected: All existing rows show `subject = NULL`. No data loss.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260429_add_subject_to_exams.sql
git commit -m "feat(db): add subject column to exams table"
```

---

### Task 2: Migration — enable Realtime for `weak_topics`

**Files:**
- Create: `supabase/migrations/20260429_enable_realtime_weak_topics.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260429_enable_realtime_weak_topics.sql

-- 1. Add weak_topics to the Realtime publication so postgres_changes
--    events fire for INSERT / UPDATE / DELETE.
ALTER PUBLICATION supabase_realtime ADD TABLE public.weak_topics;

-- 2. REPLICA IDENTITY FULL gives UPDATE payloads the old row data,
--    needed so the hook can detect what changed.
ALTER TABLE public.weak_topics REPLICA IDENTITY FULL;

-- 3. RLS SELECT policy so authenticated users can read their own rows.
--    CREATE POLICY IF NOT EXISTS is idempotent — safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'weak_topics' AND policyname = 'weak_topics_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY weak_topics_select_own
        ON public.weak_topics
        FOR SELECT
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;
```

- [ ] **Step 2: Apply the migration**

Run in Supabase SQL Editor. Expected: no error.

- [ ] **Step 3: Verify publication membership**

```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Expected: `weak_topics` appears in the result.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260429_enable_realtime_weak_topics.sql
git commit -m "feat(db): enable supabase realtime for weak_topics table"
```

---

## Phase 2 — API Layer

### Task 3: Update `/api/exam` to accept and return `subject`

**Files:**
- Modify: `src/app/api/exam/route.js`

- [ ] **Step 1: Update the POST handler to accept `subject`**

In `route.js`, find the POST handler. Replace the destructuring and insert call:

```js
// Before (line 49)
const { name, exam_date } = body;

// After
const { name, exam_date, subject } = body;
```

```js
// Before (line 61-68) — the insert
const cleanName = name.trim().slice(0, 100);
const today = new Date().toISOString().split("T")[0];
const status = exam_date >= today ? "active" : "completed";

const { data, error } = await supabase
  .from("exams")
  .insert([{ name: cleanName, exam_date, status }])
  .select()
  .single();

// After
const cleanName = name.trim().slice(0, 100);
const cleanSubject = subject && typeof subject === "string"
  ? subject.toLowerCase().trim().slice(0, 60)
  : null;
const today = new Date().toISOString().split("T")[0];
const status = exam_date >= today ? "active" : "completed";

const { data, error } = await supabase
  .from("exams")
  .insert([{ name: cleanName, exam_date, status, subject: cleanSubject }])
  .select()
  .single();
```

- [ ] **Step 2: Update PATCH to allow subject updates**

Find the PATCH handler. Replace:

```js
// Before (line 88-89)
const { id, status } = body;

if (!id) {
  return NextResponse.json({ error: "id is required" }, { status: 400 });
}
if (!status || !VALID_STATUSES.has(status)) {
  return NextResponse.json(
    { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` },
    { status: 400 }
  );
}

const { data, error } = await supabase
  .from("exams")
  .update({ status })
  .eq("id", id)
  .select()
  .single();

// After
const { id, status, subject } = body;

if (!id) {
  return NextResponse.json({ error: "id is required" }, { status: 400 });
}

const patch = {};
if (status !== undefined) {
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}` },
      { status: 400 }
    );
  }
  patch.status = status;
}
if (subject !== undefined) {
  patch.subject = subject ? subject.toLowerCase().trim().slice(0, 60) : null;
}
if (Object.keys(patch).length === 0) {
  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}

const { data, error } = await supabase
  .from("exams")
  .update(patch)
  .eq("id", id)
  .select()
  .single();
```

- [ ] **Step 3: Manual test — create exam with subject**

```bash
curl -s -X POST http://localhost:3000/api/exam \
  -H "Content-Type: application/json" \
  -d '{"name":"DBMS Mid-term","exam_date":"2026-12-01","subject":"dbms"}' | jq .
```

Expected response includes `"subject": "dbms"`.

- [ ] **Step 4: Manual test — subject is optional**

```bash
curl -s -X POST http://localhost:3000/api/exam \
  -H "Content-Type: application/json" \
  -d '{"name":"JEE Main","exam_date":"2026-12-15"}' | jq .
```

Expected: creates successfully with `"subject": null`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/exam/route.js
git commit -m "feat(api): exam endpoint accepts and returns subject field"
```

---

### Task 4: Create `POST /api/quiz-results`

**Files:**
- Create: `src/app/api/quiz-results/route.js`

- [ ] **Step 1: Create the file**

```js
// src/app/api/quiz-results/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateMastery } from "@/lib/mastery";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, subject, results } = body;

  if (!userId || !Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "userId and results[] are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const normalizedSubject = (subject || "general").toLowerCase().trim();

  for (const item of results) {
    const { topic, correct, total } = item;
    if (!topic || !total) continue;

    const accuracy = (correct / total) * 100;

    // 1. Update mastery score (uses existing lib/mastery.js)
    await updateMastery({ user_id: userId, topic, correct, total }).catch(
      (err) => console.error("[quiz-results] mastery update failed:", err)
    );

    // 2. Update weak_topics based on performance
    const { data: existing } = await supabase
      .from("weak_topics")
      .select("id, count")
      .eq("user_id", userId)
      .eq("topic", topic)
      .eq("subject", normalizedSubject)
      .single();

    if (accuracy >= 80) {
      // Mastered — remove from weak topics entirely
      if (existing) {
        await supabase
          .from("weak_topics")
          .delete()
          .eq("id", existing.id);
      }
    } else if (accuracy >= 60) {
      // Improving — reduce count by 2
      if (existing) {
        const newCount = Math.max(0, existing.count - 2);
        await supabase
          .from("weak_topics")
          .update({
            count: newCount,
            level: "medium",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      // Still weak — increment count
      if (existing) {
        await supabase
          .from("weak_topics")
          .update({
            count: existing.count + 1,
            level: "hard",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    }

    // 3. Log to learning_events (Realtime also watches this table)
    await supabase
      .from("learning_events")
      .insert({
        user_id: userId,
        event_type: "quiz_completed",
        metadata: {
          topic,
          subject: normalizedSubject,
          correct,
          total,
          accuracy: Math.round(accuracy),
        },
      })
      .catch((err) =>
        console.error("[quiz-results] learning_event insert failed:", err)
      );
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Manual test with curl**

```bash
# Replace USER_ID with a real user ID from your DB
curl -s -X POST http://localhost:3000/api/quiz-results \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subject": "dbms",
    "results": [{"topic": "normalization", "correct": 8, "total": 10}]
  }' | jq .
```

Expected: `{"success": true}`. Verify in Supabase that the `normalization` row in `weak_topics` was deleted (if accuracy was 80%) or count was reduced.

- [ ] **Step 3: Test the non-fatal path — topic not in weak_topics**

```bash
curl -s -X POST http://localhost:3000/api/quiz-results \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "subject": "dbms",
    "results": [{"topic": "topic_that_doesnt_exist", "correct": 5, "total": 10}]
  }' | jq .
```

Expected: `{"success": true}` — no crash when topic not found.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quiz-results/route.js
git commit -m "feat(api): add quiz-results endpoint — closes weak topic feedback loop"
```

---

## Phase 3 — Hook + Context Wiring

### Task 5: Extend `useRealtimeProgress` with `weak_topics` and new callbacks

**Files:**
- Modify: `src/hooks/useRealtimeProgress.js`

- [ ] **Step 1: Add `weak_topics` to the TABLES array**

Find line 30–37 (the TABLES const). Replace:

```js
// Before
const TABLES = [
  "learning_events",
  "focus_progress",
  "mastery_topics",
  "study_streaks",
  "exams",
  "spaced_repetition_cards",
];

// After
const TABLES = [
  "learning_events",
  "focus_progress",
  "mastery_topics",
  "study_streaks",
  "exams",
  "spaced_repetition_cards",
  "weak_topics", // Realtime migration 20260429_enable_realtime_weak_topics.sql required
];
```

- [ ] **Step 2: Accept new callbacks in the hook signature**

Find line 47 (the function signature). Replace:

```js
// Before
export function useRealtimeProgress({ refetch, refetchDailyPlan } = {}) {

// After
export function useRealtimeProgress({
  refetch,
  refetchDailyPlan,
  refetchExam,
  refetchWeakTopics,
} = {}) {
```

- [ ] **Step 3: Add refs for the new callbacks (below existing `planRefetchRef`)**

Find line 57–58:
```js
const refetchRef     = useRef(refetch);
const planRefetchRef = useRef(refetchDailyPlan);
```

Replace with:
```js
const refetchRef          = useRef(refetch);
const planRefetchRef      = useRef(refetchDailyPlan);
const examRefetchRef      = useRef(refetchExam);
const weakTopicsRefetchRef = useRef(refetchWeakTopics);
```

- [ ] **Step 4: Keep refs current (below existing ref assignments)**

Find lines 61–62:
```js
refetchRef.current     = refetch;
planRefetchRef.current = refetchDailyPlan;
```

Replace with:
```js
refetchRef.current            = refetch;
planRefetchRef.current        = refetchDailyPlan;
examRefetchRef.current        = refetchExam;
weakTopicsRefetchRef.current  = refetchWeakTopics;
```

- [ ] **Step 5: Fire table-specific callbacks in the handler**

Find the `handler` function (around line 118). After the existing `debouncedRefetchRef.current?.()` call, add:

```js
// After existing: debouncedRefetchRef.current?.();
if (table === "exams" && examRefetchRef.current) {
  try { examRefetchRef.current(); } catch {}
}
if (table === "weak_topics" && weakTopicsRefetchRef.current) {
  try { weakTopicsRefetchRef.current(); } catch {}
}
```

- [ ] **Step 6: Verify the build compiles**

```bash
cd c:/Users/Shafi/ask-my-notes && npm run build 2>&1 | tail -20
```

Expected: Build succeeds. No TypeScript or lint errors related to the hook.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useRealtimeProgress.js
git commit -m "feat(realtime): wire weak_topics and exam-specific refetch callbacks"
```

---

### Task 6: Wire new callbacks in `DashboardContext`

**Files:**
- Modify: `src/context/DashboardContext.jsx`

- [ ] **Step 1: Pass the new callbacks to `useRealtimeProgress`**

Find the existing `useRealtimeProgress` call (around line 1371–1374):

```js
// Before
const {
  status:        progressStatus,
  lastDelta:     progressLastDelta,
  lastUpdateAt:  progressLastUpdateAt,
  manualRefetch: progressManualRefetch,
} = useRealtimeProgress({
  refetch:          fetchProgressSummary,
  refetchDailyPlan: fetchDailyPlan,
});

// After
const {
  status:        progressStatus,
  lastDelta:     progressLastDelta,
  lastUpdateAt:  progressLastUpdateAt,
  manualRefetch: progressManualRefetch,
} = useRealtimeProgress({
  refetch:            fetchProgressSummary,
  refetchDailyPlan:   fetchDailyPlan,
  refetchExam:        fetchExam,
  refetchWeakTopics:  fetchWeakTopics,
});
```

- [ ] **Step 2: Verify dev server starts cleanly**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`. Check browser console — no errors from `useRealtimeProgress`.

- [ ] **Step 3: Commit**

```bash
git add src/context/DashboardContext.jsx
git commit -m "feat(context): pass refetchExam and refetchWeakTopics to realtime hook"
```

---

## Phase 4 — Shared Utilities

### Task 7: Create shared utility files

**Files:**
- Create: `src/lib/examUtils.js`
- Create: `src/lib/subjectOptions.js`
- Create: `tests/unit/examUtils.test.mjs`

- [ ] **Step 1: Write `examUtils.js` — pure functions**

```js
// src/lib/examUtils.js

/**
 * Derive a 0–59% accuracy from weak topic attempt count.
 * Topics are weak by definition (count >= 5), so accuracy is capped at 59%.
 * @param {number} count
 * @returns {number}
 */
export function deriveAccuracy(count) {
  return Math.max(0, Math.min(59, 100 - count * 12));
}

/**
 * Generate a day-by-day study plan from weak topics and exam date.
 * @param {{ exam_date: string }} exam
 * @param {Array<{ topic: string, count: number }>} weakTopics  — already filtered by subject, sorted by count desc
 * @param {(date: string) => number} getDaysLeft
 * @returns {Array<{ day: number, date: string, action: string, topics: typeof weakTopics, isRestDay: boolean }>}
 */
export function generateExamStudyPlan(exam, weakTopics, getDaysLeft) {
  const rawDays = getDaysLeft(exam.exam_date);

  // Exam is today
  if (rawDays === 0) {
    return [{
      day: 0,
      date: "Today",
      action: "🔥 Final Revision",
      topics: weakTopics.slice(0, 5),
      isRestDay: false,
    }];
  }

  // Exam already passed
  if (rawDays < 0) return [];

  const daysLeft = rawDays;
  const action =
    daysLeft > 7  ? "📘 Learn"
    : daysLeft > 3 ? "📝 Practice"
    :                "⚡ Revise";

  // No weak topics — produce generic schedule
  if (weakTopics.length === 0) {
    return Array.from({ length: Math.min(daysLeft, 7) }, (_, i) => ({
      day: i + 1,
      date: new Date(Date.now() + i * 86_400_000)
        .toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      action,
      topics: [],
      isRestDay: false,
    }));
  }

  const topicsPerDay = Math.min(3, Math.ceil(weakTopics.length / daysLeft));

  return Array.from({ length: daysLeft }, (_, i) => {
    const slice = weakTopics.slice(i * topicsPerDay, (i + 1) * topicsPerDay);
    return {
      day: i + 1,
      date: new Date(Date.now() + i * 86_400_000)
        .toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      action,
      topics: slice,
      isRestDay: slice.length === 0,
    };
  });
}

/**
 * Safe sessionStorage read — returns null in private browsing mode.
 * @param {string} key
 * @returns {any|null}
 */
export function readSessionStorage(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Safe sessionStorage write + clear.
 * @param {string} key
 * @param {any} value
 */
export function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing — silently ignore
  }
}

/**
 * Safe sessionStorage remove.
 * @param {string} key
 */
export function clearSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
```

- [ ] **Step 2: Write `subjectOptions.js`**

```js
// src/lib/subjectOptions.js

/**
 * Curated subject options for the AddExamModal dropdown.
 * Keys match the canonical values from SUBJECT_MAP in DashboardContext.
 * Grouped for readability; rendered as a flat list in the UI.
 */
export const SUBJECT_OPTIONS = [
  // CS Core
  { key: "cs",           label: "Computer Science (General)" },
  { key: "dsa",          label: "Data Structures & Algorithms" },
  { key: "dbms",         label: "DBMS" },
  { key: "os",           label: "Operating Systems" },
  { key: "cn",           label: "Computer Networks" },
  { key: "oop",          label: "Object-Oriented Programming" },
  { key: "daa",          label: "Design & Analysis of Algorithms" },
  { key: "se",           label: "Software Engineering" },
  { key: "web",          label: "Web Technologies" },
  { key: "cd",           label: "Compiler Design" },
  { key: "toc",          label: "Theory of Computation" },
  { key: "cloud",        label: "Cloud Computing" },
  { key: "cybersecurity",label: "Cyber Security" },
  { key: "ai",           label: "Artificial Intelligence / ML" },
  // Mathematics
  { key: "math",         label: "Mathematics (General)" },
  { key: "calculus",     label: "Calculus" },
  { key: "linear algebra",label: "Linear Algebra" },
  { key: "discrete math",label: "Discrete Mathematics" },
  { key: "probability",  label: "Probability" },
  { key: "statistics",   label: "Statistics" },
  // Sciences
  { key: "physics",      label: "Physics" },
  { key: "chemistry",    label: "Chemistry" },
  { key: "organic chemistry", label: "Organic Chemistry" },
  { key: "biology",      label: "Biology" },
  // Engineering
  { key: "electrical",   label: "Electrical Engineering" },
  { key: "mechanical",   label: "Mechanical Engineering" },
  { key: "electronics",  label: "Electronics" },
  { key: "vlsi",         label: "VLSI" },
  // Commerce & Business
  { key: "finance",      label: "Finance (General)" },
  { key: "accounting",   label: "Accounting" },
  { key: "economics",    label: "Economics" },
  { key: "business",     label: "Business / MBA" },
  { key: "marketing",    label: "Marketing" },
  { key: "hrm",          label: "Human Resource Management" },
  // Law
  { key: "law",          label: "Law (General)" },
  // Medical
  { key: "medical",      label: "Medical (General)" },
  { key: "anatomy",      label: "Anatomy" },
  { key: "physiology",   label: "Physiology" },
  { key: "pharmacology", label: "Pharmacology" },
];
```

- [ ] **Step 3: Write unit tests**

```js
// tests/unit/examUtils.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveAccuracy, generateExamStudyPlan } from "../../src/lib/examUtils.js";

describe("deriveAccuracy", () => {
  it("returns 40 for count=5 (weakest threshold)", () => {
    assert.equal(deriveAccuracy(5), 40);
  });
  it("returns 52 for count=4", () => {
    assert.equal(deriveAccuracy(4), 52);
  });
  it("caps at 0 for very high counts", () => {
    assert.equal(deriveAccuracy(10), 0);
  });
  it("caps at 59 for count=0 (not actually weak but safe)", () => {
    assert.equal(deriveAccuracy(0), 59);
  });
});

describe("generateExamStudyPlan", () => {
  const mockGetDaysLeft = (date) => {
    const d = new Date(date + "T00:00:00");
    return Math.ceil((d - new Date()) / 86_400_000);
  };
  const futureDate = (days) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return d.toISOString().split("T")[0];
  };

  it("returns single final-revision entry when exam is today", () => {
    const exam = { exam_date: new Date().toISOString().split("T")[0] };
    const plan = generateExamStudyPlan(exam, [{ topic: "normalization", count: 7 }], () => 0);
    assert.equal(plan.length, 1);
    assert.equal(plan[0].day, 0);
    assert.match(plan[0].action, /Final Revision/);
  });

  it("returns empty array when exam has passed", () => {
    const exam = { exam_date: "2020-01-01" };
    const plan = generateExamStudyPlan(exam, [], () => -5);
    assert.equal(plan.length, 0);
  });

  it("distributes topics across days — 4 topics, 4 days → 1 per day", () => {
    const topics = [
      { topic: "normalization", count: 8 },
      { topic: "deadlock", count: 7 },
      { topic: "indexing", count: 6 },
      { topic: "transactions", count: 5 },
    ];
    const exam = { exam_date: futureDate(4) };
    const plan = generateExamStudyPlan(exam, topics, () => 4);
    assert.equal(plan.length, 4);
    assert.equal(plan[0].topics.length, 1);
    assert.equal(plan[0].topics[0].topic, "normalization");
  });

  it("caps topics per day at 3", () => {
    const topics = Array.from({ length: 9 }, (_, i) => ({ topic: `topic${i}`, count: 5 }));
    const exam = { exam_date: futureDate(2) };
    const plan = generateExamStudyPlan(exam, topics, () => 2);
    plan.forEach((day) => assert.ok(day.topics.length <= 3));
  });

  it("returns generic schedule when no weak topics", () => {
    const exam = { exam_date: futureDate(10) };
    const plan = generateExamStudyPlan(exam, [], () => 10);
    assert.ok(plan.length > 0);
    plan.forEach((day) => assert.deepEqual(day.topics, []));
  });

  it("uses Learn action for >7 days left", () => {
    const exam = { exam_date: futureDate(14) };
    const plan = generateExamStudyPlan(exam, [{ topic: "t", count: 5 }], () => 14);
    assert.match(plan[0].action, /Learn/);
  });

  it("uses Revise action for ≤3 days left", () => {
    const exam = { exam_date: futureDate(2) };
    const plan = generateExamStudyPlan(exam, [{ topic: "t", count: 5 }], () => 2);
    assert.match(plan[0].action, /Revise/);
  });
});
```

- [ ] **Step 4: Run the tests**

```bash
cd c:/Users/Shafi/ask-my-notes
node --test tests/unit/examUtils.test.mjs
```

Expected: All 8 tests pass (`✓ returns 40 for count=5`, etc.). Fix any failures before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/examUtils.js src/lib/subjectOptions.js tests/unit/examUtils.test.mjs
git commit -m "feat(lib): add examUtils (deriveAccuracy, generateExamStudyPlan, sessionStorage helpers) + subjectOptions"
```

---

## Phase 5 — UI Components (build bottom-up)

### Task 8: `EmptyState` component

**Files:**
- Create: `src/components/dashboard/exams/EmptyState.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/dashboard/exams/EmptyState.jsx
"use client";

/**
 * @param {{ variant: "no-exam" | "no-topics", onAction: () => void }} props
 */
export default function EmptyState({ variant, onAction }) {
  const isNoExam = variant === "no-exam";

  return (
    <div style={{
      padding: "20px 12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.06)",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    }}>
      <span style={{ fontSize: 22 }}>{isNoExam ? "📚" : "🎉"}</span>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#e4e4e7" }}>
        {isNoExam ? "No exam selected" : "No weak areas detected"}
      </p>
      <p style={{ margin: 0, fontSize: 10, color: "#71717a", maxWidth: 200 }}>
        {isNoExam
          ? "Add an exam to start tracking weak areas"
          : "You're doing great in this subject. Keep practicing to stay sharp."}
      </p>
      <button
        onClick={onAction}
        style={{
          marginTop: 4,
          padding: "6px 14px",
          background: isNoExam
            ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
            : "rgba(34,211,238,0.1)",
          border: isNoExam ? "none" : "1px solid rgba(34,211,238,0.3)",
          borderRadius: 6,
          color: isNoExam ? "#fff" : "#22d3ee",
          fontSize: 10,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {isNoExam ? "+ Add Exam" : "Start Practice Quiz"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders — quick smoke test in dashboard**

Import and render `<EmptyState variant="no-exam" onAction={() => {}} />` temporarily in any existing component. Check that it displays correctly in the browser. Remove the temporary import.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/exams/EmptyState.jsx
git commit -m "feat(ui): add EmptyState component (no-exam + no-topics variants)"
```

---

### Task 9: `WeakTopicCard` component

**Files:**
- Create: `src/components/dashboard/exams/WeakTopicCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/dashboard/exams/WeakTopicCard.jsx
"use client";

import { deriveAccuracy } from "@/lib/examUtils";

const MAX_LABEL_LENGTH = 28;

function truncate(str) {
  if (!str || typeof str !== "string") return "";
  return str.length > MAX_LABEL_LENGTH ? str.slice(0, MAX_LABEL_LENGTH) + "…" : str;
}

function formatLastPracticed(updatedAt) {
  if (!updatedAt) return "Never";
  const ms = Date.now() - new Date(updatedAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * @param {{
 *   topic: { id?: string, topic: string, count: number, level?: string, updated_at?: string },
 *   onPractice: (topic: string) => void,
 *   onAskAI: (topic: string) => void,
 * }} props
 */
export default function WeakTopicCard({ topic, onPractice, onAskAI }) {
  const accuracy = deriveAccuracy(topic.count);
  const isHard = topic.level === "hard" || accuracy < 30;

  // Color-code by severity
  const accentColor = accuracy < 30 ? "#ef4444" : "#f59e0b";
  const bgColor     = accuracy < 30 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)";
  const borderColor = accuracy < 30 ? "rgba(239,68,68,0.2)"  : "rgba(245,158,11,0.2)";
  const textColor   = accuracy < 30 ? "#fca5a5" : "#fbbf24";

  return (
    <div style={{
      padding: "8px 10px",
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    }}>
      {/* Left: topic info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          color: "#e4e4e7",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {truncate(topic.topic)}
          {isHard && (
            <span style={{ marginLeft: 4, fontSize: 9, color: accentColor }}>🔥</span>
          )}
        </p>

        {/* Accuracy bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <div style={{
            width: 72,
            height: 3,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div style={{
              width: `${accuracy}%`,
              height: "100%",
              background: accentColor,
              borderRadius: 2,
            }} />
          </div>
          <span style={{ fontSize: 9, color: textColor }}>{accuracy}%</span>
        </div>

        <p style={{ margin: "2px 0 0", fontSize: 9, color: "#52525b" }}>
          {formatLastPracticed(topic.updated_at)}
        </p>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onPractice(topic.topic)}
          title={`Practice ${topic.topic}`}
          style={{
            padding: "3px 8px",
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: 4,
            color: textColor,
            fontSize: 9,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Practice
        </button>
        <button
          onClick={() => onAskAI(topic.topic)}
          title={`Ask AI about ${topic.topic}`}
          style={{
            padding: "3px 8px",
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 4,
            color: "#c4b5fd",
            fontSize: 9,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Ask AI
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/exams/WeakTopicCard.jsx
git commit -m "feat(ui): add WeakTopicCard with accuracy bar and Practice/Ask AI CTAs"
```

---

### Task 10: Update `AddExamModal` — add subject dropdown

**Files:**
- Modify: `src/components/dashboard/exams/AddExamModal.jsx`

- [ ] **Step 1: Add the subject import and state**

At the top of the file, add the import:

```js
import { SUBJECT_OPTIONS } from "@/lib/subjectOptions";
```

Inside the component function, add subject state after `examDate`:

```js
const [subject, setSubject] = useState("");
```

- [ ] **Step 2: Update the `validate()` function**

```js
function validate() {
  if (!examName.trim()) return "Exam name is required.";
  if (examName.trim().length > MAX_NAME_LENGTH) return `Name must be under ${MAX_NAME_LENGTH} characters.`;
  if (!subject) return "Subject is required.";
  if (!examDate) return "Exam date is required.";
  if (isPastDate) return "Exam date cannot be in the past.";
  return null;
}
```

- [ ] **Step 3: Update `handleSubmit` to include subject in POST body**

```js
// Before (line 47-48)
body: JSON.stringify({ name: examName.trim(), exam_date: examDate }),

// After
body: JSON.stringify({ name: examName.trim(), exam_date: examDate, subject }),
```

- [ ] **Step 4: Add the subject dropdown JSX between the name input and date input**

After the name input `<div>` block, before the date input `<div>`:

```jsx
{/* Subject */}
<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
  <select
    value={subject}
    onChange={(e) => { setSubject(e.target.value); setError(""); }}
    style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${error && !subject ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 6,
      padding: "10px",
      fontSize: 12,
      color: subject ? "#e4e4e7" : "#52525b",
      outline: "none",
      cursor: "pointer",
    }}
  >
    <option value="">Select Subject...</option>
    {SUBJECT_OPTIONS.map((opt) => (
      <option key={opt.key} value={opt.key}>{opt.label}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 5: Verify in browser**

Open the dashboard, click `+ Add Exam`, confirm the subject dropdown appears between exam name and date. Select a subject, fill in name and date, submit — verify the created exam shows `subject` in the Supabase table.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/exams/AddExamModal.jsx
git commit -m "feat(ui): add subject dropdown to AddExamModal"
```

---

### Task 11: Fix urgency thresholds in `ExamCountdownSection`

**Files:**
- Modify: `src/components/dashboard/exams/ExamCountdownSection.jsx`

- [ ] **Step 1: Update `borderColor` helper map**

```js
// Before
function borderColor(hex) {
  const map = {
    "#22C55E": "rgba(34,197,94,0.2)",
    "#F59E0B": "rgba(245,158,11,0.2)",
    "#EF4444": "rgba(239,68,68,0.2)",
    "#52525b": "rgba(82,82,91,0.2)",
  };
  return map[hex] || "rgba(255,255,255,0.06)";
}

// After — add yellow entry
function borderColor(hex) {
  const map = {
    "#22C55E": "rgba(34,197,94,0.2)",
    "#EAB308": "rgba(234,179,8,0.2)",
    "#EF4444": "rgba(239,68,68,0.2)",
    "#52525b": "rgba(82,82,91,0.2)",
  };
  return map[hex] || "rgba(255,255,255,0.06)";
}
```

- [ ] **Step 2: Update urgency thresholds**

```js
// Before
const countdownColor =
  isPast    ? "#52525b" :
  isToday   ? "#EF4444" :
  daysLeft > 30 ? "#22C55E" :
  daysLeft > 7  ? "#F59E0B" :
                  "#EF4444";

// After — spec thresholds: >14 green, 7-14 yellow, <7 red
const countdownColor =
  isPast    ? "#52525b" :
  isToday   ? "#EF4444" :
  daysLeft > 14 ? "#22C55E" :
  daysLeft > 7  ? "#EAB308" :
                  "#EF4444";
```

- [ ] **Step 3: Verify in browser**

Check that an exam with >14 days shows green, 7-14 days shows yellow, <7 days shows red.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/exams/ExamCountdownSection.jsx
git commit -m "fix(ui): update exam urgency thresholds to >14d green, 7-14d yellow, <7d red"
```

---

### Task 12: Refactor `WeakTopicsSection`

**Files:**
- Modify: `src/components/dashboard/exams/WeakTopicsSection.jsx`

- [ ] **Step 1: Replace the entire file**

```jsx
// src/components/dashboard/exams/WeakTopicsSection.jsx
"use client";

import WeakTopicCard from "./WeakTopicCard";
import EmptyState from "./EmptyState";

/**
 * @param {{
 *   topics: Array,         — already filtered by subject, sorted, sliced to 5
 *   loading: boolean,
 *   selectedExam: object|null,
 *   nullSubject: boolean,  — true when exam exists but subject is null
 *   onAddExam: () => void,
 *   onPractice: (topic: string) => void,
 *   onAskAI: (topic: string) => void,
 *   onStartQuiz: () => void,
 * }} props
 */
export default function WeakTopicsSection({
  topics = [],
  loading = false,
  selectedExam = null,
  nullSubject = false,
  onAddExam,
  onPractice,
  onAskAI,
  onStartQuiz,
}) {
  // State 1: Loading — skeleton cards
  if (loading) {
    return (
      <div style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ height: 11, width: "40%", background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            height: 52,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
            animation: "skeleton-pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  // State 2: No exam selected
  if (!selectedExam) {
    return <EmptyState variant="no-exam" onAction={onAddExam} />;
  }

  return (
    <div style={{
      padding: "12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, color: "#71717a", fontWeight: 600 }}>Weak Topics</p>
        {topics.length > 0 && (
          <p style={{ margin: 0, fontSize: 9, color: "#3f3f46" }}>{topics.length} tracked</p>
        )}
      </div>

      {/* Null-subject banner */}
      {nullSubject && (
        <div style={{
          marginBottom: 8,
          padding: "5px 8px",
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 4,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "#fbbf24" }}>
            Subject not set — showing all weak topics.{" "}
            <span style={{ color: "#71717a" }}>Edit this exam to add a subject.</span>
          </p>
        </div>
      )}

      {/* State 3: No topics for this subject */}
      {topics.length === 0 ? (
        <EmptyState variant="no-topics" onAction={onStartQuiz} />
      ) : (
        /* State 4: Topics list */
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {topics.map((t) => (
            <WeakTopicCard
              key={t.id ?? t.topic}
              topic={t}
              onPractice={onPractice}
              onAskAI={onAskAI}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/exams/WeakTopicsSection.jsx
git commit -m "refactor(ui): WeakTopicsSection — 4 render states, subject filtering props, null subject banner"
```

---

### Task 13: `StudySuggestion` component

**Files:**
- Create: `src/components/dashboard/exams/StudySuggestion.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/dashboard/exams/StudySuggestion.jsx
"use client";

import { deriveAccuracy } from "@/lib/examUtils";

/**
 * @param {{
 *   topics: Array,       — top 2 from filteredWeakTopics, lowest accuracy first
 *   subject: string,
 *   onQuickQuiz: (topic: string) => void,
 * }} props
 */
export default function StudySuggestion({ topics = [], subject = "", onQuickQuiz }) {
  if (topics.length === 0) return null;

  const top2 = topics.slice(0, 2);

  return (
    <div style={{
      padding: "10px 12px",
      background: "rgba(139,92,246,0.05)",
      borderRadius: 8,
      border: "1px solid rgba(139,92,246,0.15)",
    }}>
      <p style={{
        margin: "0 0 6px",
        fontSize: 9,
        color: "#71717a",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontWeight: 600,
      }}>
        Suggested Focus Today
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {top2.map((t) => {
          const accuracy = deriveAccuracy(t.count);
          return (
            <div
              key={t.id ?? t.topic}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 8px",
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>
                {t.topic}
              </span>
              <span style={{ fontSize: 9, color: "#52525b" }}>·</span>
              <span style={{ fontSize: 9, color: "#a78bfa" }}>{accuracy}%</span>
              <button
                onClick={() => onQuickQuiz(t.topic)}
                style={{
                  padding: "2px 7px",
                  background: "rgba(139,92,246,0.2)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: 3,
                  color: "#c4b5fd",
                  fontSize: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Quick Quiz
              </button>
            </div>
          );
        })}
      </div>
      {subject && (
        <p style={{ margin: "5px 0 0", fontSize: 9, color: "#3f3f46" }}>
          Based on your lowest accuracy topics in {subject.toUpperCase()}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/exams/StudySuggestion.jsx
git commit -m "feat(ui): add StudySuggestion component"
```

---

### Task 14: `StudyPlanModal` component

**Files:**
- Create: `src/components/dashboard/exams/StudyPlanModal.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/dashboard/exams/StudyPlanModal.jsx
"use client";

import { useMemo } from "react";
import { generateExamStudyPlan } from "@/lib/examUtils";
import { writeSessionStorage } from "@/lib/examUtils";
import { useRouter } from "next/navigation";

const URGENCY_COLORS = {
  "📘 Learn":    { border: "#22c55e", bg: "rgba(34,197,94,0.05)",  text: "#4ade80" },
  "📝 Practice": { border: "#f59e0b", bg: "rgba(245,158,11,0.05)", text: "#fbbf24" },
  "⚡ Revise":   { border: "#ef4444", bg: "rgba(239,68,68,0.05)",  text: "#f87171" },
  "🔥 Final Revision": { border: "#ef4444", bg: "rgba(239,68,68,0.08)", text: "#f87171" },
};

function getColors(action) {
  for (const [key, colors] of Object.entries(URGENCY_COLORS)) {
    if (action.includes(key.replace(/^[^\s]+ /, ""))) return colors;
  }
  return URGENCY_COLORS["📘 Learn"];
}

/**
 * @param {{
 *   exam: object,
 *   weakTopics: Array,
 *   getDaysLeft: (date: string) => number,
 *   onClose: () => void,
 * }} props
 */
export default function StudyPlanModal({ exam, weakTopics, getDaysLeft, onClose }) {
  const router = useRouter();
  const daysLeft = getDaysLeft(exam.exam_date);

  const plan = useMemo(
    () => generateExamStudyPlan(exam, weakTopics, getDaysLeft),
    [exam, weakTopics, getDaysLeft]
  );

  function handleStart(dayTopics) {
    if (dayTopics.length === 0) return;
    const firstTopic = dayTopics[0];
    writeSessionStorage("amn_focus_prefill", {
      subject: exam.subject,
      topic: firstTopic.topic,
    });
    router.push("/focus");
  }

  if (plan.length === 0) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
      }} onClick={onClose}>
        <div
          style={{
            background: "#111", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: 20, maxWidth: 400, width: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#e4e4e7", fontWeight: 700 }}>
            Exam date has passed
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#71717a" }}>
            No study plan available for a past exam.
          </p>
          <button
            onClick={onClose}
            style={{ marginTop: 12, padding: "6px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#a1a1aa", fontSize: 11, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
        padding: "20px 0",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#111", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: 20, maxWidth: 440, width: "90%",
          maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>
              {exam.name}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#71717a" }}>
              {daysLeft === 0 ? "Exam is today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
              {weakTopics.length > 0 && ` · ${weakTopics.length} weak topic${weakTopics.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#a1a1aa", fontSize: 10, cursor: "pointer" }}
          >
            ✕ Close
          </button>
        </div>

        {/* Plan list */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {plan.map((item) => {
            const colors = getColors(item.action);
            return (
              <div
                key={item.day}
                style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "8px 10px", background: colors.bg,
                  borderLeft: `3px solid ${colors.border}`, borderRadius: 4,
                  opacity: item.isRestDay ? 0.5 : 1,
                }}
              >
                <div style={{ minWidth: 40, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 10, color: colors.text, fontWeight: 700 }}>
                    {item.day === 0 ? "Today" : `Day ${item.day}`}
                  </p>
                  <p style={{ margin: 0, fontSize: 8, color: "#52525b" }}>{item.date}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#e4e4e7" }}>
                    {item.action}
                    {item.topics.length > 0
                      ? ": " + item.topics.map((t) => t.topic).join(", ")
                      : item.isRestDay ? " — Rest day" : " — General revision"}
                  </p>
                </div>
                {!item.isRestDay && item.topics.length > 0 && (
                  <button
                    onClick={() => handleStart(item.topics)}
                    style={{
                      flexShrink: 0, padding: "3px 8px",
                      background: `${colors.bg}`, border: `1px solid ${colors.border}`,
                      borderRadius: 3, color: colors.text, fontSize: 9, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Start
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/exams/StudyPlanModal.jsx
git commit -m "feat(ui): add StudyPlanModal with day-by-day calendar and Focus integration"
```

---

### Task 15: `ExamCard` — main container

**Files:**
- Create: `src/components/dashboard/exams/ExamCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/dashboard/exams/ExamCard.jsx
"use client";

import { useState, useMemo, Component } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import ExamCountdownSection from "./ExamCountdownSection";
import WeakTopicsSection from "./WeakTopicsSection";
import StudySuggestion from "./StudySuggestion";
import StudyPlanModal from "./StudyPlanModal";
import AddExamModal from "./AddExamModal";
import { writeSessionStorage } from "@/lib/examUtils";

// ── Error Boundary ─────────────────────────────────────────
class ExamCardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error("[ExamCard]", err); }
  render() {
    if (this.state.hasError) return (
      <div style={{
        padding: 16, textAlign: "center",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "#71717a" }}>
          Something went wrong loading exam data.
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          style={{
            marginTop: 8, fontSize: 10, padding: "4px 12px",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 4, color: "#a78bfa", cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── Progress Snapshot (inline — no separate file) ──────────
function ProgressSnapshot({ masteryTopics, weakTopics, subject, lastActiveDate, normalizeSubject }) {
  const subjectTopics = subject
    ? masteryTopics.filter((t) => normalizeSubject(t.subject) === normalizeSubject(subject))
    : masteryTopics;

  const avgAccuracy = subjectTopics.length > 0
    ? Math.round(subjectTopics.reduce((sum, t) => sum + (t.mastery_score || 0), 0) / subjectTopics.length)
    : 0;

  const mastered = subjectTopics.filter((t) => (t.mastery_score || 0) >= 70).length;
  const total    = subjectTopics.length;

  const lastActive = lastActiveDate
    ? (() => {
        const ms = Date.now() - new Date(lastActiveDate).getTime();
        const d  = Math.floor(ms / 86_400_000);
        return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
      })()
    : "—";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
      {[
        { value: `${avgAccuracy}%`, label: "Avg accuracy", color: "#22c55e" },
        { value: total ? `${mastered}/${total}` : "—", label: "Mastered", color: "#a78bfa" },
        { value: lastActive, label: "Last active", color: "#fb923c" },
      ].map(({ value, label, color }) => (
        <div key={label} style={{
          textAlign: "center", padding: "7px 4px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6,
        }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color }}>{value}</p>
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "#71717a" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main ExamCard ──────────────────────────────────────────
export default function ExamCard() {
  const {
    exams, selectedExam, weakTopics, masteryTopics,
    normalizeSubject, getDaysLeft, lastActiveDate,
    fetchExam, fetchWeakTopics, setSelectedExam,
  } = useDashboard();

  const router = useRouter();
  const [showAddModal, setShowAddModal]     = useState(false);
  const [showPlanModal, setShowPlanModal]   = useState(false);
  const [weakTopicsLoading, setWeakTopicsLoading] = useState(false);

  // ── Subject-filtered weak topics ────────────────────────
  const filteredWeakTopics = useMemo(() => {
    if (!selectedExam) return [];
    if (!selectedExam.subject) {
      // Null subject: show all, unsorted — nullSubject banner will appear
      return weakTopics.slice(0, 5);
    }
    const examSubject = normalizeSubject(selectedExam.subject);
    return weakTopics
      .filter((t) => normalizeSubject(t.subject) === examSubject)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [weakTopics, selectedExam, normalizeSubject]);

  // ── Navigation helpers ──────────────────────────────────
  function navigateToQuiz(topic) {
    writeSessionStorage("amn_prefill", {
      subject: selectedExam?.subject ?? "general",
      topic,
    });
    router.push("/quiz");
  }

  function navigateToFocus(topic) {
    writeSessionStorage("amn_focus_prefill", {
      subject: selectedExam?.subject ?? "general",
      topic,
    });
    router.push("/focus");
  }

  function navigateToAskAI(topic) {
    writeSessionStorage(
      "amn_ask_prefill",
      `Explain ${topic} from ${selectedExam?.subject ?? "this subject"} in simple terms`
    );
    router.push("/ask-ai");
  }

  function handleFixWeakAreas() {
    // Prefill all weak topics so quiz focuses on the full weak set
    writeSessionStorage("amn_prefill", {
      subject: selectedExam?.subject ?? "general",
      topics: filteredWeakTopics.map((t) => t.topic),
    });
    router.push("/quiz");
  }

  function handleExamAdded(newExam) {
    fetchExam();
    setSelectedExam(newExam);
    setShowAddModal(false);
  }

  const hasWeakTopics    = filteredWeakTopics.length > 0;
  const isNullSubject    = selectedExam && !selectedExam.subject;

  return (
    <ExamCardErrorBoundary>
      <div style={{
        background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(139,92,246,0.08))",
        borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
        borderColor: "rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(139,92,246,0.35)",
        borderRadius: 12, padding: 14,
        display: "flex", flexDirection: "column", gap: 10,
        boxShadow: "inset 0 0 30px rgba(34,211,238,0.04)",
        height: "100%", boxSizing: "border-box",
      }}>
        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f4f4f5" }}>Exams</p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#52525b" }}>
              Track upcoming exams and focus on weak areas
            </p>
          </div>
          {selectedExam?.subject && (
            <span style={{
              padding: "2px 8px", background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10,
              fontSize: 9, color: "#c4b5fd", fontWeight: 600,
              textTransform: "uppercase",
            }}>
              {selectedExam.subject}
            </span>
          )}
        </div>

        {/* Countdown */}
        <ExamCountdownSection exams={exams} />

        {/* Progress Snapshot — only when exam selected */}
        {selectedExam && (
          <ProgressSnapshot
            masteryTopics={masteryTopics}
            weakTopics={weakTopics}
            subject={selectedExam.subject}
            lastActiveDate={lastActiveDate}
            normalizeSubject={normalizeSubject}
          />
        )}

        {/* Study Suggestion */}
        <StudySuggestion
          topics={filteredWeakTopics}
          subject={selectedExam?.subject ?? ""}
          onQuickQuiz={navigateToQuiz}
        />

        {/* Weak Topics */}
        <WeakTopicsSection
          topics={filteredWeakTopics}
          loading={weakTopicsLoading}
          selectedExam={selectedExam}
          nullSubject={isNullSubject}
          onAddExam={() => setShowAddModal(true)}
          onPractice={navigateToQuiz}
          onAskAI={navigateToAskAI}
          onStartQuiz={() => navigateToQuiz("")}
        />

        {/* Action buttons — shown only when weak topics exist */}
        {hasWeakTopics && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              onClick={handleFixWeakAreas}
              style={{
                padding: "7px 10px",
                background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 6, color: "#fca5a5", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}
            >
              ⚡ Fix Weak Areas
            </button>
            <button
              onClick={() => setShowPlanModal(true)}
              style={{
                padding: "7px 10px",
                background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))",
                border: "1px solid rgba(139,92,246,0.3)",
                borderRadius: 6, color: "#c4b5fd", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}
            >
              📅 Study Plan
            </button>
          </div>
        )}

        {/* Add exam button — always visible */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            marginTop: "auto", padding: "7px 12px",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6,
            color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          + Add Exam
        </button>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddExamModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleExamAdded}
        />
      )}
      {showPlanModal && selectedExam && (
        <StudyPlanModal
          exam={selectedExam}
          weakTopics={filteredWeakTopics}
          getDaysLeft={getDaysLeft}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </ExamCardErrorBoundary>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/exams/ExamCard.jsx
git commit -m "feat(ui): add ExamCard — full container with error boundary, subject filtering, live data"
```

---

## Phase 6 — Navigation Integrations

### Task 16: Update quiz page — read prefill + call quiz-results

**Files:**
- Modify: `src/app/quiz/page.jsx`

- [ ] **Step 1: Add prefill read on mount — inside `QuizContent` component, near existing `useEffect` hooks**

After the existing `activePdf` useEffect, add:

```js
const [prefillContext, setPrefillContext] = useState(null);

useEffect(() => {
  try {
    const raw = sessionStorage.getItem("amn_prefill");
    if (raw) {
      sessionStorage.removeItem("amn_prefill");
      setPrefillContext(JSON.parse(raw));
    }
  } catch {}
}, []);
```

- [ ] **Step 2: Update `handleFinish` to call `/api/quiz-results` before navigating**

Find the existing `handleFinish` (around line 371–374):

```js
// Before
const handleFinish = useCallback(() => {
  clearQuizSession();
  router.push('/dashboard');
}, [router]);

// After
const handleFinish = useCallback(async () => {
  // Fire quiz-results only for topic-focused (prefilled) quizzes
  if (userId && prefillContext?.topic && Object.keys(evaluations).length > 0) {
    const totalQ   = questions.length;
    const correctQ = questions.filter((_, i) => {
      const e = evaluations[i];
      return e && e.marksEarned >= e.totalMarks * 0.5;
    }).length;

    fetch("/api/quiz-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subject: prefillContext.subject ?? "general",
        results: [{ topic: prefillContext.topic, correct: correctQ, total: totalQ }],
      }),
    }).catch(console.error); // fire-and-forget — non-blocking
  }

  clearQuizSession();
  router.push("/dashboard");
}, [router, userId, prefillContext, evaluations, questions]);
```

- [ ] **Step 3: Verify quiz flow end-to-end**

1. From the dashboard, click "Practice" on a weak topic card.
2. Complete the quiz.
3. Click Finish.
4. Verify in Supabase that the topic's `count` was updated in `weak_topics`.
5. Verify the dashboard ExamCard reflects the change (may take ~1s via Realtime).

- [ ] **Step 4: Commit**

```bash
git add src/app/quiz/page.jsx
git commit -m "feat(quiz): read amn_prefill on mount + call quiz-results on finish"
```

---

### Task 17: Update focus page — read `amn_focus_prefill` on mount

**Files:**
- Modify: `src/app/focus/page.jsx`

- [ ] **Step 1: Read the prefill key on mount and pre-fill the chat**

The focus page already has `chatInitialInput` / `setChatInitialInput` state (line 42) used by `FocusInlineChat`. The prefill opens the chat with a pre-filled message about the weak topic.

Add this `useEffect` directly after the existing `useState` declarations at the top of `FocusPage` (or whatever the main component is named):

```js
// Read weak-topic prefill from ExamCard navigation
useEffect(() => {
  try {
    const raw = sessionStorage.getItem("amn_focus_prefill");
    if (!raw) return;
    sessionStorage.removeItem("amn_focus_prefill");
    const prefill = JSON.parse(raw);
    if (prefill?.topic) {
      setChatInitialInput(
        `Help me study "${prefill.topic}"${prefill.subject ? ` from ${prefill.subject.toUpperCase()}` : ""}. Start with the key concepts I should know.`
      );
      setChatOpen(true); // open the inline chat drawer automatically
    }
  } catch {}
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Verify**

Navigate from a weak topic "Ask AI" button → Focus page opens with the inline chat drawer open and the message pre-filled.

- [ ] **Step 3: Commit**

```bash
git add src/app/focus/page.jsx
git commit -m "feat(focus): read amn_focus_prefill sessionStorage key on mount"
```

---

### Task 18: Update Ask AI page — read `amn_ask_prefill` on mount

**Files:**
- Modify: `src/app/ask-ai/page.js`

- [ ] **Step 1: Find where the question input is initialized**

Search `ask-ai/page.js` for the question input state or the AskAISection component. The prefill should populate the question input so the user can review it and click send.

- [ ] **Step 2: Add prefill read on mount**

`AskAISection` reads `question` / `setQuestion` from `useDashboard()` context (confirmed at line 513 of `AskAISection.jsx`). The ask-ai page wraps this in `DashboardProvider` via the dashboard layout. Add the read in `src/app/ask-ai/page.js` inside the `AskAIPageContent` function (or whichever component renders after providers are mounted):

```js
// Add at the top of the inner component in src/app/ask-ai/page.js
// (the component rendered inside DashboardProvider)
import { useDashboard } from "@/context/DashboardContext";

// Inside the component:
const { setQuestion } = useDashboard();

useEffect(() => {
  try {
    const prefill = sessionStorage.getItem("amn_ask_prefill");
    if (prefill) {
      sessionStorage.removeItem("amn_ask_prefill");
      setQuestion(prefill); // pre-fills the AskAISection textarea
    }
  } catch {}
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

> **Note:** If the ask-ai page does not use `DashboardProvider`, dispatch a custom event instead:
> ```js
> window.dispatchEvent(new CustomEvent("amn:prefill-question", { detail: prefill }));
> ```
> Then listen for it in `AskAISection` and call `setQuestion(e.detail)`.

- [ ] **Step 3: Verify end-to-end**

From the dashboard, click "Ask AI" on a WeakTopicCard. Confirm the Ask AI page opens with the question pre-filled.

- [ ] **Step 4: Commit**

```bash
git add src/app/ask-ai/page.js
git commit -m "feat(ask-ai): read amn_ask_prefill sessionStorage key on mount"
```

---

## Phase 7 — Dashboard Wire-up

### Task 19: Replace the Exams nav card in `StudyModeCards` with `ExamCard`

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx`

- [ ] **Step 1: Add ExamCard import**

At the top of `StudyModeCards.jsx`:

```js
import ExamCard from "./exams/ExamCard";
```

- [ ] **Step 2: Replace the static Exams BentoCard with the live ExamCard**

Find the existing `<BentoCard>` for Exams:

```jsx
// Before
<BentoCard
  icon="📅"
  title="Exams"
  subtitle="Track upcoming exams"
  href="/exams"
  glowColor="rgba(34,211,238,0.25)"
/>

// After
<div style={{ display: "contents" }}>
  <ExamCard />
</div>
```

> The `display: contents` wrapper is a passthrough so the grid layout of the parent BentoGrid is not disrupted.

- [ ] **Step 3: Verify the dashboard renders correctly**

Open `http://localhost:3000/dashboard`. Confirm:
- The Exams card slot now shows the full ExamCard (countdown + weak topics + study suggestion)
- The other 3 nav cards (Focus, Quiz, Call Tutor) are unaffected
- No console errors

- [ ] **Step 4: Test the full flow**

1. Add a new exam with a subject (e.g. "DBMS Mid-term", subject "dbms")
2. Ask a question related to DBMS in the main Ask AI section
3. Watch the weak topics section in ExamCard update ~1 second after the answer streams
4. Click "Practice" on a weak topic → quiz opens
5. Complete the quiz → return to dashboard → verify accuracy bar updated

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/StudyModeCards.jsx
git commit -m "feat(dashboard): replace Exams nav card with live ExamCard component"
```

---

## Final Verification

- [ ] Run unit tests: `npm run test:unit` → all pass
- [ ] Run build: `npm run build` → no errors
- [ ] Open dashboard, add exam with subject, ask a question → weak topic appears within 1s
- [ ] Click Practice → quiz prefilled → finish → weak topic count updated
- [ ] Click Ask AI on topic → question pre-filled in Ask AI page
- [ ] Generate Study Plan → modal opens with day-by-day calendar
- [ ] Click "Fix Weak Areas" → quiz opens
- [ ] Verify countdown colors: >14d green, 7-14d yellow, <7d red
- [ ] Open a private browsing tab → verify nothing crashes (sessionStorage is blocked)

```bash
git tag v-exams-redesign-complete
```
