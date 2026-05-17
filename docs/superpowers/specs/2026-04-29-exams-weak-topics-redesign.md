# Exams + Weak Topics System — Full Redesign Spec
**Date:** 2026-04-29  
**Status:** Approved  
**Scope:** `src/components/dashboard/exams/`, `src/hooks/useRealtimeProgress.js`, `src/context/DashboardContext.jsx`, `src/app/api/`, `src/app/quiz/page.jsx`, `supabase/migrations/`

---

## 1. Problem Statement

The current Exams + Weak Topics system has three root failures:

1. **No subject link** — `WeakTopicsSection` receives all weak topics with zero subject filtering. It never reads `selectedExam` and shows unrelated topics regardless of which exam is selected.
2. **Dead quiz loop** — `handleFinish()` in the quiz page writes nothing to the database. Performance signals are tracked in local state and discarded on navigation. Mastery and weak topic counts never improve after a quiz.
3. **No conditional states** — The UI shows a generic "No weak topics yet" for all empty states, whether the user has no exam, has an exam with no topics, or is in a loading state.

---

## 2. Goals

- Weak topics dynamically filtered by the subject of the selected exam
- Every student session (question, quiz, focus) feeds back into the dashboard within ~1 second
- Page feels alive — data updates via Supabase Realtime without manual refresh
- All 5+ UI states rendered correctly with no dead states or layout clutter
- Tight integration with Quiz, Focus, and Ask AI pages via sessionStorage prefill
- Zero regressions in existing features

---

## 3. Data Model Changes

### 3.1 Database Migration

Two migrations are required. Keep them in separate files so they can be rolled back independently.

**Migration 1: `YYYYMMDD_add_subject_to_exams.sql`**
```sql
ALTER TABLE exams ADD COLUMN subject TEXT;
```
- Nullable — backward safe. Existing exams get `null` subject.
- Subject is a normalized key (e.g. `"dbms"`, `"physics"`) using the existing `SUBJECT_MAP` in `DashboardContext`.

**Migration 2: `YYYYMMDD_enable_realtime_weak_topics.sql`**
```sql
-- 1. Add weak_topics to the Supabase Realtime publication so
--    postgres_changes events are emitted for INSERT / UPDATE / DELETE.
ALTER PUBLICATION supabase_realtime ADD TABLE public.weak_topics;

-- 2. REPLICA IDENTITY FULL so UPDATE payloads include the old row.
--    Required for the hook to receive complete before/after data.
ALTER TABLE public.weak_topics REPLICA IDENTITY FULL;

-- 3. RLS sanity check — ensure authenticated users can SELECT their own rows.
--    (If a SELECT policy already exists this is a no-op; add only if missing.)
CREATE POLICY IF NOT EXISTS "weak_topics_select_own"
  ON public.weak_topics
  FOR SELECT
  USING (auth.uid() = user_id);
```

> **Why this is critical (Codex adversarial finding):** Adding `weak_topics` to `useRealtimeProgress.TABLES` in the JS hook is necessary but not sufficient. Supabase Realtime only emits `postgres_changes` for tables that are members of the `supabase_realtime` publication. Without this migration the hook subscribes to a table that never fires events — the dashboard appears connected but stays permanently stale after questions and quiz completions.

### 3.2 Updated Shapes

```js
// Exam (after migration)
{
  id: string,
  name: string,          // "JEE Main 2025"
  subject: string|null,  // "physics" — NEW, derived from SUBJECT_MAP
  exam_date: string,     // "YYYY-MM-DD"
  status: "active"|"completed",
  created_at: string,
  updated_at: string
}

// WeakTopic (unchanged)
{
  id: string,
  topic: string,         // "normalization"
  subject: string,       // "dbms"
  count: number,         // attempt threshold: 5
  level: "medium"|"hard",
  updated_at: string,
  user_id: string
}
```

### 3.3 Accuracy Derivation

The DB stores `count` (attempt count), not accuracy. Accuracy is derived client-side:

```js
const deriveAccuracy = (count) => Math.max(0, Math.min(59, 100 - count * 12));
// count=5 → 40%, count=8 → 4%, cap at 59% (by definition weak)
```

---

## 4. Component Architecture

### 4.1 File Structure

```
src/components/dashboard/exams/
├── ExamCard.jsx              ← replaces ExamsHeroCard.jsx (keep old file, rename)
├── ExamCountdownSection.jsx  ← updated urgency thresholds
├── WeakTopicsSection.jsx     ← refactored: subject filter + conditional render
├── WeakTopicCard.jsx         ← NEW: individual topic card with accuracy bar
├── EmptyState.jsx            ← NEW: reusable, 2 variants
├── StudySuggestion.jsx       ← NEW: "Suggested Focus Today" strip
├── StudyPlanModal.jsx        ← NEW: day-by-day calendar modal
└── AddExamModal.jsx          ← updated: adds subject dropdown
```

### 4.2 ExamCard (replaces ExamsHeroCard)

**Reads from context:** `exams`, `selectedExam`, `weakTopics`, `masteryTopics`, `normalizeSubject`, `getDaysLeft`, `lastActiveDate`, `fetchExam`, `fetchWeakTopics`

**Computes locally (useMemo):**
```js
const filteredWeakTopics = useMemo(() => {
  if (!selectedExam) return [];
  if (!selectedExam.subject) return weakTopics.slice(0, 5); // null subject fallback
  const examSubject = normalizeSubject(selectedExam.subject);
  return weakTopics
    .filter(t => normalizeSubject(t.subject) === examSubject)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}, [weakTopics, selectedExam, normalizeSubject]);
```

**Renders (in order):**
1. Header: exam name + subject badge + (if null subject) "Subject not set" banner
2. `<ExamCountdownSection />`
3. `<ProgressSnapshot />` (inline, no separate file needed)
4. `<StudySuggestion />` (hidden if no filteredWeakTopics)
5. `<WeakTopicsSection />`
6. Action buttons row: "Fix Weak Areas" + "Generate Study Plan" (shown when filteredWeakTopics.length > 0)
7. "+ Add Exam" button (always visible)

**Wrapped in:** `<ExamCardErrorBoundary>` — catches any child crash, renders graceful fallback.

**Loading state:** `isLoading` prop drives skeleton display across all children.

### 4.3 ExamCountdownSection

Updated urgency thresholds (previously inconsistent):

| Days Left | Color | Border |
|-----------|-------|--------|
| > 14 | `#22C55E` (green) | green |
| 7–14 | `#EAB308` (yellow) | yellow |
| < 7 | `#EF4444` (red) | red |
| 0 (today) | `#EF4444` + "🔥 Exam Day!" | red |
| past | `#52525B` (muted) | muted |

### 4.4 WeakTopicsSection

**Props:** `topics: WeakTopic[]`, `loading: boolean`, `selectedExam: Exam|null`

**Render states (in priority order):**

| State | Condition | UI |
|-------|-----------|-----|
| Loading | `loading === true` | 3 skeleton cards (no layout shift) |
| No exam | `!selectedExam` | EmptyState variant="no-exam" |
| Null subject | `selectedExam && !selectedExam.subject` | topics shown + banner "Subject not set — showing all weak topics" |
| No topics | `topics.length === 0` | EmptyState variant="no-topics" |
| Topics exist | `topics.length > 0` | WeakTopicCard × N |

### 4.5 WeakTopicCard

```jsx
// Props: { topic: WeakTopic, subject: string, onPractice, onAskAI }
```

**Visual:**
- Topic name (bold)
- Accuracy % derived from count
- Color-coded progress bar (red < 40%, orange 40–60%)
- "Last practiced" relative time from `updated_at`
- Two CTAs: "Practice" (→ quiz), "Ask AI" (→ ask-ai with prefill)

### 4.6 EmptyState

```jsx
// Props: { variant: "no-exam" | "no-topics", onAddExam?, onStartQuiz? }
```

- **no-exam:** "📚 Add an exam to start tracking weak areas" + "+ Add Exam" button
- **no-topics:** "🎉 No weak areas detected" / "You're doing great in this subject. Keep practicing." + "Start Practice Quiz" button

### 4.7 StudySuggestion

Shows top 2 topics from `filteredWeakTopics` sorted by lowest accuracy. Hidden when `filteredWeakTopics.length === 0`.

```
Suggested Focus Today
[normalization · 35%] [Quick Quiz]   [deadlock · 52%] [Quick Quiz]
Based on your lowest accuracy topics in DBMS
```

Each "Quick Quiz" → sessionStorage prefill → `/quiz`.

### 4.8 StudyPlanModal

**Trigger:** "Generate Study Plan" button. Opens as an overlay modal inside ExamCard.

**Generation algorithm:**
```js
function generateExamStudyPlan(exam, weakTopics) {
  const daysLeft = Math.max(1, getDaysLeft(exam.exam_date));
  const topics = [...weakTopics].sort((a, b) => b.count - a.count);
  
  if (topics.length === 0) return generateGenericRevisionPlan(daysLeft);
  if (daysLeft === 0) return [{ day: 0, label: "Today", action: "🔥 Final Revision", topics }];
  
  const topicsPerDay = Math.min(3, Math.ceil(topics.length / daysLeft));
  const action = daysLeft > 7 ? "📘 Learn" : daysLeft > 3 ? "📝 Practice" : "⚡ Revise";
  
  return Array.from({ length: daysLeft }, (_, i) => ({
    day: i + 1,
    date: new Date(Date.now() + i * 86400000).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    action,
    topics: topics.slice(i * topicsPerDay, (i + 1) * topicsPerDay),
    isRestDay: topics.slice(i * topicsPerDay, (i + 1) * topicsPerDay).length === 0,
  }));
}
```

Edge cases:
- `daysLeft === 0` → "Exam is today — final revision checklist"
- `topics.length === 0` → generic revision schedule (no topic-specific days)
- `topics.length > daysLeft * 3` → stack up to 3 per day; excess topics roll over

**UI:** Scrollable list of day rows. Each row: day number + date + action label + topic chips + "Start" CTA (sessionStorage prefill → /focus).

### 4.9 AddExamModal (updated)

Adds a `subject` field between exam name and date:

```jsx
<select value={subject} onChange={e => setSubject(e.target.value)}>
  <option value="">Select Subject...</option>
  {SUBJECT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
</select>
```

`SUBJECT_OPTIONS` extracted from the existing `SUBJECT_MAP` in `DashboardContext` — same keys, display labels derived from the map values. Subject is required (validated before submit).

POST body to `/api/exam`: `{ name, subject, exam_date }`.

---

## 5. API Changes

### 5.1 /api/exam — Add subject field

**POST** — accept `subject` in body, store to DB.  
**GET** — return `subject` in all exam objects.  
**PATCH** — allow `subject` update.

### 5.2 NEW: POST /api/quiz-results

**The missing link** — called from `handleFinish()` in quiz page before navigation.

```js
// Request body
{
  userId: string,
  subject: string,
  results: [{ topic: string, correct: number, total: number }]
}
```

**Logic per topic:**
```
accuracy = correct / total * 100

if accuracy >= 80%:
  DELETE FROM weak_topics WHERE user_id = ? AND topic = ? AND subject = ?
  call updateMastery(user_id, topic, correct, total)

else if accuracy >= 60%:
  UPDATE weak_topics SET count = MAX(count - 2, 0), level = "medium", updated_at = now()
  call updateMastery(user_id, topic, correct, total)

else:  // still weak
  UPDATE weak_topics SET count = count + 1, level = "hard", updated_at = now()
  call updateMastery(user_id, topic, correct, total)

INSERT INTO learning_events (user_id, event_type, topic, subject, metadata)
  VALUES (userId, "quiz_completed", topic, subject, { correct, total, accuracy })
```

**Error handling:** Non-200 from this endpoint is non-fatal. Quiz navigates to dashboard regardless (fire-and-forget with best-effort retry once).

### 5.3 useRealtimeProgress — 3 targeted changes

> **Prerequisite:** `YYYYMMDD_enable_realtime_weak_topics.sql` migration must be applied before this code ships. The hook change below is a no-op until `weak_topics` is in the `supabase_realtime` publication — events will never arrive without the DB migration.

```js
// 1. Add to TABLES array
const TABLES = [
  "learning_events", "focus_progress", "mastery_topics",
  "study_streaks", "exams", "spaced_repetition_cards",
  "weak_topics"  // ← ADD (requires migration YYYYMMDD_enable_realtime_weak_topics.sql)
];

// 2. Accept new callbacks
export function useRealtimeProgress({
  refetch,
  refetchDailyPlan,
  refetchExam,        // ← ADD
  refetchWeakTopics,  // ← ADD
} = {}) { ... }

// 3. In handler function, call table-specific refetches
const handler = (table) => (payload) => {
  // ... existing logic ...
  if (table === "exams" && refetchExam) refetchExam();
  if (table === "weak_topics" && refetchWeakTopics) refetchWeakTopics();
};
```

### 5.4 DashboardContext — wire up new callbacks

```js
useRealtimeProgress({
  refetch: fetchProgressSummary,
  refetchDailyPlan: fetchDailyPlan,
  refetchExam: fetchExam,           // ← ADD
  refetchWeakTopics: fetchWeakTopics, // ← ADD
});
```

---

## 6. Navigation Integrations (sessionStorage Prefill)

All sessionStorage operations wrapped in `try/catch` — private browsing mode silently blocks storage; navigation proceeds without prefill rather than crashing.

### 6.1 Quiz page `/quiz`

```js
function navigateToQuiz(subject, topic) {
  try {
    sessionStorage.setItem("amn_prefill", JSON.stringify({ subject, topic }));
  } catch {}
  router.push("/quiz");
}
```

Quiz page `useEffect` on mount:
```js
useEffect(() => {
  try {
    const prefill = JSON.parse(sessionStorage.getItem("amn_prefill") || "null");
    if (prefill) {
      sessionStorage.removeItem("amn_prefill");
      // pre-select PDF matching subject, label quiz as topic-focused
      setPrefillContext(prefill);
    }
  } catch {}
}, []);
```

### 6.2 Focus page `/focus`

Same pattern with key `"amn_focus_prefill"`. Focus page reads on mount → generates task list centered on the prefilled topic.

### 6.3 Ask AI page `/ask-ai`

```js
function navigateToAskAI(subject, topic) {
  try {
    sessionStorage.setItem("amn_ask_prefill", `Explain ${topic} from ${subject} in simple terms`);
  } catch {}
  router.push("/ask-ai");
}
```

Ask AI page reads `"amn_ask_prefill"` on mount → pre-fills the question input (user still clicks send). Key cleared immediately after read.

---

## 7. Live Data Update Map

| Student Action | DB Tables Changed | Realtime Fires | Dashboard Update |
|---------------|-------------------|----------------|-----------------|
| Asks a question | `weak_topics` (via /api/weak-topics) | `weak_topics` | WeakTopicCard appears/count updates — ~1s |
| Completes quiz | `weak_topics`, `mastery_topics`, `learning_events` | all three | Accuracy bar jumps, card may disappear, Progress Snapshot refreshes — ~1s |
| Completes focus task | `focus_progress` (existing) | `focus_progress` | Progress Snapshot "last active" updates — ~1s |
| Adds exam | `exams` | `exams` | Countdown + subject filter reloads — ~1s |
| Tab refocuses | — | — | `guardedRefetch()` fires immediately — instant |
| WebSocket drops | — | — | 60s polling fallback kicks in automatically |

---

## 8. Robustness & Error Handling

| Pattern | Implementation |
|---------|---------------|
| React Error Boundary | `ExamCardErrorBoundary` class component wraps entire `ExamCard`. Fallback: "Something went wrong loading your exam data — [Retry]" |
| Skeleton loaders | `isLoading` boolean drives 3 placeholder cards in WeakTopicsSection. No layout shift. |
| Fetch retry | `fetchWeakTopics` and `fetchExam` retry up to 2× with exponential backoff before showing error state with Retry button |
| Race condition guard | Ref-based in-flight guard on `fetchWeakTopics` (mirrors existing pattern on `fetchProgressSummary`) |
| Double normalization | `normalizeSubject(t.subject) === normalizeSubject(selectedExam.subject)` — handles "DBMS", "dbms", "Database Management" all matching |
| Null subject fallback | `selectedExam.subject === null` → show all weak topics with banner "Subject not set — showing all weak topics" |
| sessionStorage try/catch | All reads and writes in `try/catch`. Failure → silent, navigation proceeds without prefill |
| Invalid exam date | `isNaN(new Date(exam_date).getTime())` guard already in ExamCountdownSection — unchanged |
| Deleted exam reset | `fetchExam()` re-runs on `exams` Realtime event. If `selectedExam.id` no longer in `trueActive`, context auto-selects nearest valid exam or sets `null` |
| Quiz-results non-fatal | `/api/quiz-results` failure logged but does not block navigation. User lands on dashboard, data syncs on next Realtime tick or tab refocus |
| Multiple exams | `selectedExam` already auto-selects nearest. ExamCard header shows selector when `activeExams.length > 1` (existing `isExamSelectorOpen` state) |

---

## 9. Performance

- `filteredWeakTopics` computed with `useMemo` — only recomputes when `weakTopics`, `selectedExam`, or `normalizeSubject` reference changes
- `StudyPlanModal` lazy-rendered — not mounted until "Generate Study Plan" clicked
- `ExamCard` does not trigger new API calls — reads only from context state
- `WeakTopicCard` is a pure functional component — memoizable if list grows large

---

## 10. Files Modified / Created Summary

| File | Change Type | What Changes |
|------|------------|--------------|
| `src/components/dashboard/exams/ExamCard.jsx` | NEW (replaces ExamsHeroCard) | Full component, reads context, memoized filter, error boundary |
| `src/components/dashboard/exams/WeakTopicsSection.jsx` | REFACTOR | Subject filter, 5 render states, receives filtered props |
| `src/components/dashboard/exams/WeakTopicCard.jsx` | NEW | Topic card with accuracy bar, Practice + Ask AI CTAs |
| `src/components/dashboard/exams/EmptyState.jsx` | NEW | 2 variants: no-exam, no-topics |
| `src/components/dashboard/exams/StudySuggestion.jsx` | NEW | Top 2 weak topics, Quick Quiz CTA |
| `src/components/dashboard/exams/StudyPlanModal.jsx` | NEW | Day-by-day calendar, all edge cases |
| `src/components/dashboard/exams/AddExamModal.jsx` | UPDATE | Add subject dropdown, validate subject |
| `src/components/dashboard/exams/ExamCountdownSection.jsx` | UPDATE | Fix urgency thresholds to >14/>7/<7 |
| `src/hooks/useRealtimeProgress.js` | UPDATE | Add weak_topics to TABLES, refetchExam + refetchWeakTopics callbacks |
| `src/context/DashboardContext.jsx` | UPDATE | Wire refetchExam + refetchWeakTopics to useRealtimeProgress |
| `src/app/api/exam/route.js` | UPDATE | Accept + return subject field |
| `src/app/api/quiz-results/route.js` | NEW | Quiz completion feedback loop — updates weak_topics + mastery |
| `src/app/quiz/page.jsx` | UPDATE | Call /api/quiz-results in handleFinish, read amn_prefill on mount |
| `src/app/focus/page.jsx` | UPDATE | Read amn_focus_prefill on mount |
| `src/app/ask-ai/page.js` | UPDATE | Read amn_ask_prefill on mount |
| `supabase/migrations/YYYYMMDD_add_subject_to_exams.sql` | NEW | ALTER TABLE exams ADD COLUMN subject TEXT |
| `supabase/migrations/YYYYMMDD_enable_realtime_weak_topics.sql` | NEW | Add weak_topics to supabase_realtime publication, REPLICA IDENTITY FULL, RLS SELECT policy |
| `src/components/dashboard/BentoGrid.jsx` | UPDATE | Replace ExamsHeroCard import with ExamCard |

---

## 11. Out of Scope

- Changes to the quiz question generation logic
- Changes to the focus session task generation
- Any new database tables beyond `subject` column on `exams`
- Redesign of the dashboard layout or BentoGrid structure
- Mobile-specific responsive breakpoints (existing responsive patterns apply)
