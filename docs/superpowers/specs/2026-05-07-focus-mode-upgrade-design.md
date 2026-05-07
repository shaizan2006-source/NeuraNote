# Focus Mode Intelligence Upgrade — Design Spec
**Date:** 2026-05-07  
**Status:** Approved  
**Scope:** Backend task-generation pipeline + UI atmosphere + intelligence-rich task cards

---

## 1. Problem Statement

The current focus mode generates near-identical task structures on every PDF:

- Hard-coded 8-chunk fetch — sees only a tiny fraction of large documents
- Fixed "6–8 tasks" instruction — ignores document complexity entirely
- `gpt-4o-mini` with a generic prompt — produces flat, repetitive outputs
- No exam prioritisation, no task typing, no cognitive sequencing
- Timer is based on the sum of those generic estimates

Result: the feature feels like a dumb chunking algorithm, not a smart study coach.

---

## 2. Decisions

| Question | Decision |
|---|---|
| Atmosphere direction | Deep Void (near-black + slow purple horizon glow) |
| Backend architecture | Two-pass pipeline (blueprint → task synthesis) |
| Task card visual layer | Intelligence-rich: `examWeight` badge + `taskType` pill |
| Implementation strategy | Approach 1 — in-place upgrade with extracted `focusPlanner.js` module |
| Fallback philosophy | Never surface errors to user; every layer has a silent fallback |

---

## 3. Backend Design

### 3.1 New File: `src/lib/focusPlanner.js`

Owns all analysis logic. The route stays thin (auth, chunk fetch, call planner, return).

#### Pass 1 — `buildBlueprint(chunks, docName)`

- Input: array of chunk content strings, document name
- Model: **GPT-4o** (`gpt-4o`)
- Token cap: concatenated text hard-capped at **80,000 characters** before sending. If total chunk text exceeds this, use the first 80k chars (covers the large majority of academic PDFs within GPT-4o context).
- Prompt instructs the model to return a single JSON object — the document blueprint.

**Blueprint schema:**
```json
{
  "subject": "Computer Networks",
  "totalConcepts": 14,
  "complexityScore": 7,
  "examHeaviness": 8,
  "estimatedStudyMinutes": 95,
  "conceptClusters": [
    {
      "title": "TCP/IP Fundamentals",
      "type": "conceptual",
      "examWeight": "high",
      "estimatedMinutes": 20,
      "keyTerms": ["OSI model", "packet flow", "handshake"]
    }
  ]
}
```

**`type` values:** `conceptual` | `memorisation` | `derivation` | `practice` | `revision`  
**`examWeight` values:** `high` | `medium` | `standard`

- `complexityScore` and `examHeaviness` are 1–10 integers used to size the task list in Pass 2.
- `estimatedStudyMinutes` is the AI's holistic session estimate (not a sum of cluster minutes).

#### Pass 2 — `synthesizeTasks(blueprint)`

- Input: blueprint object (no raw text)
- Model: **GPT-4o-mini** (structured input → cheaper, sufficient quality)
- Instructs the model to produce a task list from the concept clusters with:
  - Cognitive sequencing: easier/definitional first, harder/derivation/practice after, revision last
  - Dynamic count: derived from `complexityScore × totalConcepts` — no fixed number
  - Exam prioritisation: `high` examWeight clusters appear before `standard` ones (unless sequencing forbids it)
  - Actionable wording: "Understand X", "Memorise Y differences", "Derive Z", "Practice examples for W"
  - Realistic per-task durations (not equal-sized)

**Task schema (per item, as returned by API):**
```json
{
  "id": "t1",
  "name": "Understand TCP/IP layers and packet flow",
  "estimatedMinutes": 20,
  "taskType": "conceptual",
  "examWeight": "high"
}
```
Note: `status` (`"current"` / `"pending"`) is set client-side by `startFocusSession` in `DashboardContext`, not by the API. The planner does not set it.

#### Dynamic task count logic

```
base = clamp(totalConcepts, 4, 25)
if complexityScore >= 8:  base += 3
if examHeaviness >= 8:    base += 2
cap at 25
```

The blueprint prompt tells GPT-4o these bounds; it decides the final count within them.

---

### 3.2 Fallback Chain — Never Surfaces Errors

Every layer degrades silently. The user always gets a working session.

```
Attempt Pass 1 (GPT-4o blueprint)
  └── Success → attempt Pass 2 (gpt-4o-mini tasks)
        └── Success → return intelligence-rich tasks ✓
        └── Fail / bad JSON → retry Pass 2 once with "return only JSON array" nudge
              └── Success → return tasks (may lack taskType/examWeight fields — UI handles missing fields gracefully)
              └── Fail → fall back to single-pass legacy path (gpt-4o-mini, full text, uncapped prompt — no "6–8 tasks" instruction)
                    └── Success → return legacy tasks (no taskType/examWeight — UI degrades gracefully)
                    └── Fail / bad JSON → return ENHANCED_FALLBACK_TASKS ✓
  └── Fail → skip Pass 1 entirely, run single-pass legacy path directly (same uncapped prompt)
        └── Same sub-chain as above
```

**`ENHANCED_FALLBACK_TASKS`** replaces current `FALLBACK_TASKS`. Five tasks with proper `taskType` and `examWeight` fields so even the fallback looks intelligent:
```js
[
  { name: "Read through and identify key concepts", estimatedMinutes: 15, taskType: "conceptual", examWeight: "standard" },
  { name: "Note all definitions and terminology",   estimatedMinutes: 10, taskType: "memorisation", examWeight: "medium" },
  { name: "Work through any examples or problems",  estimatedMinutes: 20, taskType: "practice",     examWeight: "high" },
  { name: "Summarise the core ideas in your own words", estimatedMinutes: 10, taskType: "revision", examWeight: "medium" },
  { name: "Review high-priority concepts once more",    estimatedMinutes: 10, taskType: "revision", examWeight: "high" },
]
```

**UI resilience:** All badge/tag renders check `taskType` and `examWeight` before rendering — missing fields simply show nothing. No UI crash possible from missing fields.

---

### 3.3 Updated `generate-focus-tasks/route.js`

Changes from current:
- Import `buildBlueprint`, `synthesizeTasks` from `focusPlanner.js`
- Remove `.limit(8)` on chunk fetch — fetch ALL chunks
- Replace single GPT call + retry with `buildBlueprint` → `synthesizeTasks` call chain
- Add `blueprint` to response payload (for future adaptive use, ignored for now by frontend)
- Entire try/catch still present; internal errors caught at planner level before reaching route

No auth logic changes. No response shape breaking changes (tasks/totalMinutes/documentId/documentName all preserved).

---

## 4. UI Design

### 4.1 New Component: `src/components/focus/FocusAmbience.jsx`

```
position: fixed, inset: 0, zIndex: 0, pointerEvents: none
```

Three CSS-only layers:

| Layer | Description | Animation |
|---|---|---|
| Base void | `radial-gradient` from bottom, wide ellipse, purple `rgba(88,28,235,0.28)` | Static |
| Breathing pulse | Same gradient, tighter + slightly brighter | `opacity 0.55→1.0`, 6s ease-in-out infinite alternate |
| Floating accent | Small faint indigo orb at `~80% 20%` | `opacity + translateY`, 14s ease-in-out infinite alternate |

All animations use `opacity` and `transform` only — GPU-composited, zero reflow, zero JS timers.

Drop-in usage:
```jsx
<FocusAmbience />  // first child in FocusSessionActive and FocusModeLoader
```

Parent `pageStyle` background gradient stays unchanged. Ambience sits at `zIndex: 0`; all content remains at `zIndex: 1+`.

---

### 4.2 Task Card Badge System (`FocusSessionActive.jsx`)

**`examWeight` badge** — top-right of active task card header row:

| Value | Label | Style |
|---|---|---|
| `high` | HIGH YIELD | `background: rgba(239,68,68,0.15)`, `border: rgba(239,68,68,0.4)`, `color: #ef4444` |
| `medium` | MUST KNOW | `background: rgba(245,158,11,0.12)`, `border: rgba(245,158,11,0.3)`, `color: #f59e0b` |
| `standard` | *(not shown)* | — |

**`taskType` pill** — small pill below the task name (active card only):

| Value | Label | Colour |
|---|---|---|
| `conceptual` | conceptual | Purple tint `rgba(139,92,246,0.15)` |
| `memorisation` | memorise | Amber tint |
| `derivation` | derivation | Blue tint |
| `practice` | practice | Cyan tint |
| `revision` | revision | Green tint |

**Pending task cards** — show `examWeight` badge only. No `taskType` pill (keeps them compact).  
**Done task cards** — no badges (strikethrough only).  
**Missing fields** — both badge and pill render only when their field is present. Graceful degradation guaranteed.

---

## 5. Files Changed

| File | Type | Description |
|---|---|---|
| `src/lib/focusPlanner.js` | **New** | Blueprint + task synthesis, full fallback chain |
| `src/app/api/generate-focus-tasks/route.js` | **Modified** | Remove chunk limit, call planner, return blueprint |
| `src/components/focus/FocusAmbience.jsx` | **New** | Deep Void ambient background layers |
| `src/components/focus/FocusSessionActive.jsx` | **Modified** | Import FocusAmbience, add examWeight + taskType badges |
| `src/components/focus/FocusModeLoader.jsx` | **Modified** | Import FocusAmbience |

---

## 6. What Does NOT Change

- `FocusSessionContext.jsx` — no changes
- `DashboardContext.jsx` — no changes (new task fields flow through as-is)
- `focus/page.jsx` — no changes
- Timer behaviour — single session countdown, unchanged
- Layout, spacing, typography — unchanged
- Session persistence (localStorage) — unchanged
- All other dashboard features — untouched

---

## 7. Future Extensibility Hooks

The `blueprint` field returned in the API response is stored for future use:
- Adaptive re-planning mid-session
- Weak topic detection from incomplete tasks
- Cross-session spaced repetition seeding
- Personalised difficulty adjustment

No implementation now. Structure is ready.

---

## 8. Success Criteria

- [ ] Focus session tasks are always unique per PDF — no two PDFs produce identical task lists
- [ ] Task count varies between 4 and 25 based on document complexity
- [ ] No user-visible errors under any AI failure condition
- [ ] `examWeight` and `taskType` badges render correctly on active and pending cards
- [ ] Deep Void atmosphere visible in both loader and active session screens
- [ ] Performance: no layout shifts, no JS animation loops, 60 fps
- [ ] Existing resume-session flow works unchanged with new task shape
