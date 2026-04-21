# PDF-Driven Focus Mode — Design Spec
**Date:** 2026-04-21
**Status:** Approved
**Cycle:** 1 of 2 (Cycle 2 = adaptive timer recalculation + advanced analytics)

---

## Problem

Focus Mode generates hardcoded demo tasks (`INITIAL_TASKS`) with no connection to the user's actual study material. The session duration is fixed at 25 minutes regardless of topic complexity. Focus page (`src/app/focus/page.jsx`) is a fully isolated component — it does not use DashboardContext, `dailyPlan`, `focusProgress`, or any live PDF data.

## Goal

Replace the hardcoded task system with an AI-driven, PDF-powered focus session that:
1. Requires selecting study material (framed as an elegant onboarding step, not a blocker)
2. Generates progressive study tasks from the selected PDF via GPT-4o-mini
3. Sets session duration from AI-estimated task times (not a fixed 25 min)
4. Reuses the active PDF from Ask AI seamlessly
5. Lets users select from previously uploaded PDFs without re-uploading
6. Updates tasks dynamically as the session progresses

---

## Architecture

### Approach: Gate-then-generate on `/focus`

`focus/page.jsx` gains a `sessionState` variable with three values:

```
"setup"      → PDF selector card (default on first visit)
"generating" → Loading skeleton while /api/generate-focus-tasks runs
"active"     → Timer + task UI (fully driven by AI-generated tasks)
```

On mount, the page checks:
1. Is `sessionState === "active"` already (session in progress)?
2. Does `DashboardContext.activePdf` exist?
3. Does `sessionStorage` have a `focusSelectedDocumentId` fallback?

If any condition is met, the relevant state is shown. Otherwise, fall through to `"setup"`.

### Component Tree After Redesign

```
FocusPage (src/app/focus/page.jsx)
  ├── sessionState: "setup" | "generating" | "active"
  ├── useDashboard() — reads: activePdf, documents, user, startFocusSession()
  │
  ├── setup    → <FocusSessionSetup onSelectPDF={handleSelectPDF} />
  ├── generating → <FocusModeLoader documentName={...} />
  └── active   → <FocusSessionActive
                    tasks={focusSessionTasks}
                    durationSeconds={focusSessionDuration}
                    documentName={focusSessionDocumentName}
                  />
```

### New Files

| File | Responsibility |
|---|---|
| `src/components/focus/FocusSessionSetup.jsx` | PDF selection card — 3 paths: active PDF, previous PDFs, upload new |
| `src/components/focus/FocusModeLoader.jsx` | Animated skeleton while tasks are generating |
| `src/components/focus/FocusSessionActive.jsx` | Extracted timer + task logic, now prop-driven |
| `src/app/api/generate-focus-tasks/route.js` | AI task generation from document chunks |

### Modified Files

| File | Changes |
|---|---|
| `src/app/focus/page.jsx` | Add sessionState, wire 3 render paths, remove INITIAL_TASKS |
| `src/context/DashboardContext.jsx` | Add focusSession* state + startFocusSession() function |
| `src/app/api/focus-progress/route.js` | Add documentId + documentName to logged entries |

---

## Feature 1 — PDF-Driven Task Generation

### User Flow

```
User navigates to /focus
  ↓
sessionState = "setup"
  ↓
FocusSessionSetup renders
  ↓
User selects PDF (active / previous / new upload)
  ↓
handleSelectPDF(documentId) called in focus/page.jsx
  ↓
sessionState → "generating"
sessionStorage.setItem("focusSelectedDocumentId", documentId)
  ↓
POST /api/generate-focus-tasks { documentId }
  ↓
API fetches top 8 document_chunks via match_documents RPC
API calls GPT-4o-mini with structured prompt
API returns { tasks, totalMinutes, documentId, documentName }
  ↓
startFocusSession(tasks, totalMinutes, documentId, documentName) called on context
  ↓
sessionState → "active"
sessionStorage.removeItem("focusSelectedDocumentId")
  ↓
FocusSessionActive renders with AI-generated tasks
```

### API: `POST /api/generate-focus-tasks`

**Request:**
```json
{ "documentId": "uuid" }
```

**Auth:** Bearer token (uses SERVICE_ROLE_KEY on server side)

**Server logic:**
1. Verify documentId belongs to the authenticated user (check `documents` table)
2. Fetch document name from `documents` table
3. Fetch top 8 chunks via direct query:
   ```js
   const { data: chunks } = await supabase
     .from("document_chunks")
     .select("content")
     .eq("document_id", documentId)
     .limit(8);
   ```
4. Build prompt and call GPT-4o-mini
5. Parse and validate JSON response
6. Return structured tasks

**Prompt sent to GPT-4o-mini:**
```
You are an AI study coach. Given the following study material chunks, generate 6-8 progressive study tasks.

Rules:
- Tasks must be specific to the content (not generic like "Study hard")
- Progress from easier (review/read/define) to harder (apply/solve/synthesize)
- End with one review/summary task
- Estimate realistic minutes per task (5-20 min each)
- Total session should be 25-90 minutes

Return ONLY a JSON array, no other text:
[
  { "name": "Review [specific concept from doc]", "estimatedMinutes": 8 },
  ...
]

Study material:
[CHUNKS INSERTED HERE]
```

**Response:**
```json
{
  "success": true,
  "tasks": [
    { "id": "t1", "name": "Review Carnot Cycle definition and stages", "estimatedMinutes": 8, "status": "current" },
    { "id": "t2", "name": "Derive the Carnot efficiency formula", "estimatedMinutes": 12, "status": "pending" },
    { "id": "t3", "name": "Solve 3 entropy calculation problems", "estimatedMinutes": 15, "status": "pending" },
    { "id": "t4", "name": "Compare isothermal vs adiabatic processes", "estimatedMinutes": 10, "status": "pending" },
    { "id": "t5", "name": "Explain second law in your own words", "estimatedMinutes": 8, "status": "pending" },
    { "id": "t6", "name": "Review and summarise all key formulas", "estimatedMinutes": 7, "status": "pending" }
  ],
  "totalMinutes": 60,
  "documentId": "uuid",
  "documentName": "Thermodynamics Chapter 2-3"
}
```

**Error handling:**
- 403 if documentId doesn't belong to user
- 422 if AI returns malformed JSON → retry once, then return generic fallback tasks:
  ```json
  [
    { "name": "Read through the material carefully", "estimatedMinutes": 15 },
    { "name": "Note key concepts and definitions", "estimatedMinutes": 10 },
    { "name": "Attempt practice problems", "estimatedMinutes": 20 },
    { "name": "Review and summarise", "estimatedMinutes": 10 }
  ]
  ```
- 404 if document not found → return `{ "error": "pdf_not_found" }`

---

## Feature 2 — Adaptive Session Duration

### Implementation

Session duration is set once at session start from the sum of AI-estimated task durations:

```js
// In focus/page.jsx after API returns
const totalSeconds = tasks.reduce((sum, t) => sum + t.estimatedMinutes * 60, 0);
startFocusSession(tasks, totalSeconds, documentId, documentName);
```

### UX

- Timer counts down from `totalSeconds` (not hardcoded 1500)
- Below timer ring: `"Est. 60 min session"` (small muted text)
- Each task card shows: `"⏱ 12 min"` on the right edge
- No mid-session timer recalculation (timer runs to zero)
- If user finishes all tasks before timer: show "Session complete early!" state

---

## Feature 3 — Reuse Active PDF From Ask AI

### How Active PDF State Works Today

```
useActivePDF() hook
  → reads profiles.active_pdf_id from Supabase
  → returns { activePdf: { id, name } | null, setActivePdfId, loading }

DashboardPage passes activePdf → BentoGrid → AskAIHeroCard
```

### Enhancement (no new state management)

`focus/page.jsx` reads `activePdf` directly from `useDashboard()` (already exported via DashboardContext). On mount:

```js
const { activePdf, documents } = useDashboard();

useEffect(() => {
  // If activePdf is available and no session in progress, pre-fill the selector
  if (activePdf && sessionState === "setup") {
    setPreselectedPdf(activePdf);  // local state in FocusSessionSetup
  }
}, [activePdf]);
```

`FocusSessionSetup` receives `activePdf` as prop and renders the "Continue with active PDF?" card at the top if present.

**No Supabase reads added, no context changes for this sub-feature** — activePdf already flows through DashboardContext.

---

## Feature 4 — Previously Uploaded PDFs Selector

### Data Source

`DashboardContext.documents` — already fetched on dashboard load via `/api/documents`. Contains:
```js
[{ id, name, subject, created_at, ... }]
```

`activePdf` from `useActivePDF` hook carries `{ id, name }` — the user's pinned active document.

### Display Logic in FocusSessionSetup

```js
const sortedDocuments = useMemo(() => {
  return [...documents].sort((a, b) => {
    if (a.id === activePdf?.id) return -1;  // active PDF first
    if (b.id === activePdf?.id) return 1;
    return new Date(b.created_at) - new Date(a.created_at);  // then newest
  });
}, [documents, activePdf]);
```

### Metadata Display

Each PDF in the list shows:
- File name (truncated to 32 chars)
- `"Active"` badge if it matches `activePdf.id`
- `"Uploaded X days ago"` (relative from `created_at`)

### Selection Behaviour

- Click any PDF → `onSelectPDF(pdf.id, pdf.name)` called immediately
- No confirmation step
- Selector closes, `sessionState` → `"generating"`

---

## Feature 5 — Low-Friction PDF Selection UX

### Component: `FocusSessionSetup`

Three visual paths depending on state:

**Path A — Active PDF exists:**
```
┌────────────────────────────────────────────┐
│ 📚 Ready to focus?                         │
│                                            │
│ Continue with your active study material:  │
│ ┌──────────────────────────────────────┐   │
│ │ 📄 Thermodynamics Chapter 2-3  Active│   │
│ │    Uploaded 3 days ago               │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [▶ Start Focus Session]  [Choose Another] │
└────────────────────────────────────────────┘
```

**Path B — No active PDF, previous PDFs exist:**
```
┌────────────────────────────────────────────┐
│ 📚 Choose your study material              │
│ Select a PDF to begin your focus session   │
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │ 📄 Thermodynamics Chapter 2-3        │   │
│ │    Uploaded 3 days ago               │   │
│ ├──────────────────────────────────────┤   │
│ │ 📄 Linear Algebra Notes              │   │
│ │    Uploaded 1 week ago               │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [+ Upload New PDF]                         │
└────────────────────────────────────────────┘
```

**Path C — No PDFs at all:**
```
┌────────────────────────────────────────────┐
│ 📚 Start your first focus session          │
│                                            │
│ Upload your study material to begin        │
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │   📁 Drop your PDF here              │   │
│ │   or click to browse                 │   │
│ └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### "Upload New PDF" Behaviour

Clicking "+ Upload New PDF" (Path B) or the drop zone (Path C) triggers the existing Supabase upload flow already present in the dashboard. `FocusSessionSetup` renders an `<input type="file" accept=".pdf" />` that calls the existing `/api/upload` route. On upload completion, the returned document id is immediately passed to `onSelectPDF(newDocId, newDocName)` — no redirect required.

### UX Principles Applied

- Heading is always positive/inviting: "Ready to focus?", "Choose your study material", "Start your first focus session"
- Active PDF card is always shown first when available
- Upload is always available but never the only option
- Zero confirmation dialogs for selection (one click = session starts)
- The entire card is centered on the page (not a sidebar element)

---

## Feature 6 — Dynamic Task Updates During Session

### Current Behaviour (Preserved)

The existing `handleMarkDone` logic in `focus/page.jsx` already:
- Moves current task → `"done"`
- Promotes next pending → `"current"`
- Fires `/api/focus-progress` with task name and difficulty

This logic is **extracted into `FocusSessionActive.jsx`** unchanged.

### Enhancement: Log documentId

`/api/focus-progress` POST body adds two new fields:
```json
{
  "user_id": "uuid",
  "task": "Derive the Carnot efficiency formula",
  "task_index": 2,
  "difficulty": "hard",
  "completed": true,
  "documentId": "uuid",        // NEW
  "documentName": "Thermo Ch2"  // NEW
}
```

Server-side (`src/app/api/focus-progress/route.js`): add `documentId` and `documentName` columns to the insert. Requires a Supabase migration to add these nullable columns to `focus_progress` table.

### Session Completion State

When all tasks are marked done:
- If timer still running → show "🎉 All tasks complete! Great focus session."
- Option to "Keep going" (timer continues) or "End session"
- If timer hits zero before tasks done → show "Time's up. Continue with remaining tasks?" with remaining task count

---

## DashboardContext Changes

### New State Variables (lines ~254 in DashboardContext.jsx)

```js
const [focusSessionTasks, setFocusSessionTasks] = useState([]);
const [focusSessionDuration, setFocusSessionDuration] = useState(1500);  // seconds, default 25 min
const [focusSessionDocumentId, setFocusSessionDocumentId] = useState(null);
const [focusSessionDocumentName, setFocusSessionDocumentName] = useState(null);
```

### New Function

```js
const startFocusSession = useCallback((tasks, durationSeconds, docId, docName) => {
  setFocusSessionTasks(tasks.map((t, i) => ({
    ...t,
    id: t.id || `task-${i}`,
    status: i === 0 ? "current" : "pending",
  })));
  setFocusSessionDuration(durationSeconds);
  setFocusSessionDocumentId(docId);
  setFocusSessionDocumentName(docName);
}, []);
```

### Context Value Export (add alongside isFocusMode line)

```js
focusSessionTasks, setFocusSessionTasks,
focusSessionDuration,
focusSessionDocumentId,
focusSessionDocumentName,
startFocusSession,
```

---

## `focus/page.jsx` Refactor

### What Gets Removed
- `INITIAL_TASKS` hardcoded array
- `SESSION_DURATION` constant
- `AI_TIPS` array (move into FocusSessionActive)
- All local task/timer state (moves into FocusSessionActive)

### What Stays / Is Added
```js
export default function FocusPage() {
  const {
    activePdf, documents, user,
    focusSessionTasks, focusSessionDuration,
    focusSessionDocumentId, focusSessionDocumentName,
    startFocusSession,
  } = useDashboard();

  const [sessionState, setSessionState] = useState(
    focusSessionTasks.length > 0 ? "active" : "setup"
  );
  const [generatingForDoc, setGeneratingForDoc] = useState(null);  // { id, name }
  const [generatingError, setGeneratingError] = useState(null);

  const handleSelectPDF = async (documentId, documentName) => {
    setSessionState("generating");
    setGeneratingForDoc({ id: documentId, name: documentName });
    setGeneratingError(null);
    sessionStorage.setItem("focusSelectedDocumentId", documentId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/generate-focus-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "generation_failed");

      startFocusSession(
        data.tasks,
        data.totalMinutes * 60,
        data.documentId,
        data.documentName
      );
      sessionStorage.removeItem("focusSelectedDocumentId");
      setSessionState("active");
    } catch (err) {
      // On error: go back to setup with inline error message
      setSessionState("setup");
      setGeneratingError(err.message);
    }
  };

  return (
    <div style={{ ...pageStyle, display: "flex" }}>
      <ContextualSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {sessionState === "setup" && (
          <FocusSessionSetup
            activePdf={activePdf}
            documents={documents}
            onSelectPDF={handleSelectPDF}
            error={generatingError}
          />
        )}
        {sessionState === "generating" && (
          <FocusModeLoader documentName={generatingForDoc?.name} />
        )}
        {sessionState === "active" && (
          <FocusSessionActive
            tasks={focusSessionTasks}
            durationSeconds={focusSessionDuration}
            documentName={focusSessionDocumentName}
            onSessionEnd={() => setSessionState("setup")}
          />
        )}
      </div>
    </div>
  );
}
```

---

## sessionStorage Resilience

| Key | Set when | Cleared when | Used for |
|---|---|---|---|
| `focusSelectedDocumentId` | User clicks a PDF in setup | Session transitions to "active" | Resume on page refresh during generating |

On mount, `focus/page.jsx` checks:
```js
useEffect(() => {
  const resumeDocId = sessionStorage.getItem("focusSelectedDocumentId");
  if (resumeDocId && sessionState === "setup") {
    handleSelectPDF(resumeDocId);  // re-trigger generation
  }
}, []);
```

---

## What Is NOT Changed

- Quiz page, Ask AI, Dashboard, Onboarding — untouched
- `useActivePDF` hook — read-only from Focus, no writes
- `DashboardContext` timer functions (`startFocus`, `stopFocus`) — kept as-is (used by dashboard widget)
- Existing `/api/focus-progress` schema — only additive (new nullable columns)
- `FocusModeSection.jsx` dashboard widget — untouched
- All auth, Supabase, and upload logic — untouched

---

## Acceptance Criteria

- [ ] `/focus` renders PDF selection card on first visit (no hardcoded tasks visible)
- [ ] If `activePdf` exists, it appears at the top of the selection card as the default
- [ ] User can select any previously uploaded PDF with one click
- [ ] User can upload a new PDF inline in the selection card
- [ ] After PDF selection, "Generating your focus tasks..." skeleton appears immediately
- [ ] AI returns 6-8 tasks specific to the PDF content
- [ ] Session duration is set from AI task estimates (not fixed 25 min)
- [ ] Each task card shows per-task time estimate
- [ ] Timer counts down from AI-estimated total
- [ ] Tasks advance (current → done → next pending) on "Mark Done"
- [ ] Task completion is logged with `documentId` to `/api/focus-progress`
- [ ] Page refresh during "generating" resumes task generation from sessionStorage
- [ ] Error in task generation shows message and returns to setup (no dead state)
- [ ] All existing quiz/ask-ai/dashboard functionality unchanged

---

## Out of Scope (Cycle 2)

- Mid-session timer recalculation based on actual task time
- AI detects "user is struggling" and adds remediation task
- SRS (spaced repetition) integration in task ordering
- Focus session analytics dashboard
