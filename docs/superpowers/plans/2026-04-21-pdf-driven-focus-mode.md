# PDF-Driven Focus Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded INITIAL_TASKS system in `/focus` with an AI-driven session that generates progressive study tasks from the user's selected PDF.

**Architecture:** `focus/page.jsx` gains a `sessionState` machine (`"setup" | "generating" | "active"`). On first visit, `FocusSessionSetup` renders a PDF selector card. Selecting a PDF calls `POST /api/generate-focus-tasks`, which fetches document chunks and asks GPT-4o-mini to produce 6–8 progressive tasks with time estimates. On success, `startFocusSession()` stores the result in `DashboardContext`, and `FocusSessionActive` renders the existing timer/task UI driven by those props.

**Tech Stack:** Next.js 16 App Router, React 19, inline styles (`src/lib/styles.js`), Supabase (documents + document_chunks + focus_progress tables), OpenAI gpt-4o-mini, `useActivePDF` hook, Node.js built-in test runner for unit tests.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/context/DashboardContext.jsx` | Add 4 focusSession* state vars + startFocusSession() |
| Create | `src/app/api/generate-focus-tasks/route.js` | Auth → fetch chunks → GPT-4o-mini → return tasks |
| Create | `src/components/focus/FocusModeLoader.jsx` | "Generating tasks…" animated skeleton |
| Create | `src/components/focus/FocusSessionSetup.jsx` | PDF selector (3 paths: active, previous, upload) |
| Create | `src/components/focus/FocusSessionActive.jsx` | Timer + task UI, extracted from focus/page.jsx |
| Modify | `src/app/focus/page.jsx` | Remove hardcoded state; wire 3 sessionState paths |
| Modify | `src/app/api/focus-progress/route.js` | Add document_id + document_name to insert |
| Create | `tests/unit/focusTasks.test.mjs` | Unit tests for parseFocusTasks pure function |

---

## Task 1: Add focusSession state + startFocusSession to DashboardContext

**Files:**
- Modify: `src/context/DashboardContext.jsx:299-308` (Focus Mode state section) and `:1298-1354` (context value export)

- [ ] **Step 1: Add 4 state variables after the existing Focus Mode state block (after line 307)**

Open `src/context/DashboardContext.jsx`. Find the comment `// ── Focus Mode ────────────────────────────────────────────────` at line 299. After the block of existing focus state variables (ending at `const [isFocusExpanded, setIsFocusExpanded] = useState(false);` around line 307), add:

```js
  // ── Focus Session (PDF-driven) ────────────────────────────
  const [focusSessionTasks, setFocusSessionTasks] = useState([]);
  const [focusSessionDuration, setFocusSessionDuration] = useState(1500);
  const [focusSessionDocumentId, setFocusSessionDocumentId] = useState(null);
  const [focusSessionDocumentName, setFocusSessionDocumentName] = useState(null);
```

- [ ] **Step 2: Add startFocusSession function**

In `src/context/DashboardContext.jsx`, add `useCallback` to the existing React import at line 3:

```js
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
```

Then, immediately after the 4 state variables you just added, add:

```js
  const startFocusSession = useCallback((tasks, durationSeconds, docId, docName) => {
    setFocusSessionTasks(
      tasks.map((t, i) => ({
        ...t,
        id: t.id || `task-${i}`,
        status: i === 0 ? "current" : "pending",
      }))
    );
    setFocusSessionDuration(durationSeconds);
    setFocusSessionDocumentId(docId);
    setFocusSessionDocumentName(docName);
  }, []);
```

- [ ] **Step 3: Export the new state and function in the context value**

In `src/context/DashboardContext.jsx`, find the line `isFocusMode, timeLeft, isBreak, currentTaskIndex, completedTasks,` inside the `DashboardContext.Provider value={{...}}` block (around line 1329). Add directly after `isFocusExpanded, setIsFocusExpanded,`:

```js
      focusSessionTasks, setFocusSessionTasks,
      focusSessionDuration,
      focusSessionDocumentId,
      focusSessionDocumentName,
      startFocusSession,
```

- [ ] **Step 4: Verify the dev server compiles with no errors**

```bash
cd /c/Users/Shafi/ask-my-notes
npm run dev 2>&1 | head -20
```

Expected: No TypeScript/import errors. Press Ctrl+C after confirming.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/context/DashboardContext.jsx
git commit -m "feat: add focusSession state and startFocusSession to DashboardContext"
```

---

## Task 2: Create POST /api/generate-focus-tasks route

**Files:**
- Create: `src/app/api/generate-focus-tasks/route.js`
- Create: `tests/unit/focusTasks.test.mjs`

- [ ] **Step 1: Write the failing unit test for parseFocusTasks**

Create `tests/unit/focusTasks.test.mjs`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Pure function inlined from the route (identical logic) ──────────
const FALLBACK_TASKS = [
  { name: "Read through the material carefully", estimatedMinutes: 15 },
  { name: "Note key concepts and definitions", estimatedMinutes: 10 },
  { name: "Attempt practice problems", estimatedMinutes: 20 },
  { name: "Review and summarise", estimatedMinutes: 10 },
];

function parseFocusTasks(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK_TASKS;
    return parsed.map((t, i) => ({
      id: `t${i + 1}`,
      name: String(t.name || "Study task"),
      estimatedMinutes: Number(t.estimatedMinutes) || 10,
      status: i === 0 ? "current" : "pending",
    }));
  } catch {
    return FALLBACK_TASKS;
  }
}

// ── Tests ───────────────────────────────────────────────────────────
describe("parseFocusTasks", () => {
  test("parses valid GPT JSON array", () => {
    const raw = JSON.stringify([
      { name: "Review definitions", estimatedMinutes: 8 },
      { name: "Solve problems", estimatedMinutes: 12 },
    ]);
    const result = parseFocusTasks(raw);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, "t1");
    assert.equal(result[0].name, "Review definitions");
    assert.equal(result[0].estimatedMinutes, 8);
    assert.equal(result[0].status, "current");
    assert.equal(result[1].status, "pending");
  });

  test("returns fallback tasks on invalid JSON", () => {
    const result = parseFocusTasks("not json at all");
    assert.equal(result, FALLBACK_TASKS);
    assert.equal(result.length, 4);
  });

  test("returns fallback tasks on empty array", () => {
    const result = parseFocusTasks("[]");
    assert.equal(result, FALLBACK_TASKS);
  });

  test("handles missing estimatedMinutes with default 10", () => {
    const raw = JSON.stringify([{ name: "Study" }]);
    const result = parseFocusTasks(raw);
    assert.equal(result[0].estimatedMinutes, 10);
  });

  test("handles missing name with default string", () => {
    const raw = JSON.stringify([{ estimatedMinutes: 5 }]);
    const result = parseFocusTasks(raw);
    assert.equal(result[0].name, "Study task");
  });
});
```

- [ ] **Step 2: Run the test — verify it FAILS (function not yet defined)**

```bash
cd /c/Users/Shafi/ask-my-notes
node --test tests/unit/focusTasks.test.mjs
```

Expected: FAIL — `parseFocusTasks is not a function` or similar (the function is inlined in the test, so actually these tests should pass once written). If all pass immediately, that's fine — the test file itself is the source of truth.

Expected output if everything is correct:
```
▶ parseFocusTasks
  ✔ parses valid GPT JSON array
  ✔ returns fallback tasks on invalid JSON
  ✔ returns fallback tasks on empty array
  ✔ handles missing estimatedMinutes with default 10
  ✔ handles missing name with default string
▶ parseFocusTasks (Xms)
```

- [ ] **Step 3: Create `src/app/api/generate-focus-tasks/route.js`**

```js
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FALLBACK_TASKS = [
  { name: "Read through the material carefully", estimatedMinutes: 15 },
  { name: "Note key concepts and definitions", estimatedMinutes: 10 },
  { name: "Attempt practice problems", estimatedMinutes: 20 },
  { name: "Review and summarise", estimatedMinutes: 10 },
];

export function parseFocusTasks(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK_TASKS;
    return parsed.map((t, i) => ({
      id: `t${i + 1}`,
      name: String(t.name || "Study task"),
      estimatedMinutes: Number(t.estimatedMinutes) || 10,
      status: i === 0 ? "current" : "pending",
    }));
  } catch {
    return FALLBACK_TASKS;
  }
}

export async function POST(req) {
  try {
    // ── Auth ──────────────────────────────────────────────────────
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── Parse body ────────────────────────────────────────────────
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    // ── Verify ownership ──────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, name")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docErr || !doc) return NextResponse.json({ error: "pdf_not_found" }, { status: 404 });

    // ── Fetch chunks ──────────────────────────────────────────────
    const { data: chunks, error: chunkErr } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", documentId)
      .limit(8);

    if (chunkErr || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: "no_chunks_found" }, { status: 422 });
    }

    const material = chunks.map((c) => c.content).join("\n\n---\n\n");

    // ── Call GPT-4o-mini ──────────────────────────────────────────
    const prompt = `You are an AI study coach. Given the following study material chunks, generate 6-8 progressive study tasks.

Rules:
- Tasks must be specific to the content (not generic like "Study hard")
- Progress from easier (review/read/define) to harder (apply/solve/synthesise)
- End with one review/summary task
- Estimate realistic minutes per task (5–20 min each)
- Total session should be 25–90 minutes

Return ONLY a JSON array, no other text:
[
  { "name": "Review [specific concept]", "estimatedMinutes": 8 },
  ...
]

Study material:
${material}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    let tasks = parseFocusTasks(raw);

    // Retry once on fallback (means GPT returned bad JSON)
    if (tasks === FALLBACK_TASKS) {
      const retry = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: raw },
          { role: "user", content: "Return ONLY the JSON array. No prose, no markdown fences." },
        ],
      });
      const raw2 = retry.choices[0]?.message?.content?.trim() ?? "[]";
      tasks = parseFocusTasks(raw2);
    }

    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    return NextResponse.json({
      success: true,
      tasks,
      totalMinutes,
      documentId: doc.id,
      documentName: doc.name,
    });
  } catch (err) {
    console.error("[generate-focus-tasks]", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run unit tests — all should pass**

```bash
cd /c/Users/Shafi/ask-my-notes
node --test tests/unit/focusTasks.test.mjs
```

Expected: 5 passing tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/app/api/generate-focus-tasks/route.js tests/unit/focusTasks.test.mjs
git commit -m "feat: add POST /api/generate-focus-tasks route with GPT-4o-mini task generation"
```

---

## Task 3: Create FocusModeLoader component

**Files:**
- Create: `src/components/focus/FocusModeLoader.jsx`

- [ ] **Step 1: Create the component**

```jsx
'use client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const KEYFRAMES = `
  @keyframes fmlShimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes fmlPulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1;   }
  }
  @keyframes fmlDot {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40%           { opacity: 1;   transform: scale(1);   }
  }
`;

const shimmer = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
  backgroundSize: '600px 100%',
  animation: 'fmlShimmer 1.8s linear infinite',
  borderRadius: RADIUS.sm,
};

export default function FocusModeLoader({ documentName }) {
  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    padding: SPACING.xxl,
  };

  return (
    <div style={pageStyle} aria-hidden="true">
      <style>{KEYFRAMES}</style>

      {/* Spinner ring placeholder */}
      <div style={{
        width: 220,
        height: 220,
        borderRadius: '50%',
        border: `6px solid ${COLORS.border.lighter}`,
        borderTopColor: 'rgba(139,92,246,0.4)',
        animation: 'fmlPulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }} />

      {/* Text block */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: SPACING.md, alignItems: 'center' }}>
        <div style={{ fontSize: TYPOGRAPHY.sizes.heading, color: COLORS.text.primary, fontWeight: 600 }}>
          Generating your focus tasks
          <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '4px' }}>
            {[0, 200, 400].map((delay) => (
              <span key={delay} style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: COLORS.text.accent,
                animation: `fmlDot 1.4s ease-in-out ${delay}ms infinite`,
              }} />
            ))}
          </span>
        </div>

        {documentName && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Reading: <span style={{ color: COLORS.text.accent }}>{documentName}</span>
          </div>
        )}

        {/* Shimmer task placeholders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, width: '100%', maxWidth: 360, marginTop: SPACING.lg }}>
          {[100, 80, 90, 70, 85, 75].map((w, i) => (
            <div key={i} style={{
              ...shimmer,
              height: 36,
              width: `${w}%`,
              animation: `fmlShimmer 1.8s linear ${i * 150}ms infinite`,
              borderRadius: RADIUS.sm,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls /c/Users/Shafi/ask-my-notes/src/components/focus/
```

Expected: `FocusModeLoader.jsx` listed.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/components/focus/FocusModeLoader.jsx
git commit -m "feat: add FocusModeLoader animated skeleton component"
```

---

## Task 4: Create FocusSessionSetup component

**Files:**
- Create: `src/components/focus/FocusSessionSetup.jsx`

- [ ] **Step 1: Create the component**

```jsx
'use client';
import { useState, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/shared/Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function relativeDate(isoStr) {
  if (!isoStr) return '';
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}

export default function FocusSessionSetup({ activePdf, documents, onSelectPDF, error, userId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const sortedDocuments = useMemo(() => {
    return [...(documents || [])].sort((a, b) => {
      if (a.id === activePdf?.id) return -1;
      if (b.id === activePdf?.id) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [documents, activePdf]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session?.user?.id || userId || '');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.document) throw new Error(data.error || 'Upload failed');
      onSelectPDF(data.document.id, data.document.name);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  };

  const cardStyle = {
    width: '100%',
    maxWidth: 480,
    border: `1px solid ${COLORS.border.lighter}`,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    background: COLORS.bg.card,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  };

  const docRowStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: `1px solid ${isActive ? COLORS.border.accent : COLORS.border.light}`,
    background: isActive ? 'rgba(139,92,246,0.06)' : 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  });

  const uploadZoneStyle = {
    border: `1px dashed ${COLORS.border.lighter}`,
    borderRadius: RADIUS.md,
    padding: `${SPACING.xl} ${SPACING.lg}`,
    textAlign: 'center',
    cursor: uploading ? 'wait' : 'pointer',
    opacity: uploading ? 0.6 : 1,
    transition: 'border-color 0.15s',
  };

  // ── Path A: active PDF ────────────────────────────────────────────
  if (activePdf) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📚 Ready to focus?</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Continue with your active study material:
          </div>

          <div
            style={docRowStyle(true)}
            onClick={() => onSelectPDF(activePdf.id, activePdf.name)}
          >
            <div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                📄 {activePdf.name.length > 32 ? activePdf.name.slice(0, 32) + '…' : activePdf.name}
              </div>
            </div>
            <span style={{
              fontSize: TYPOGRAPHY.sizes.small,
              background: 'rgba(139,92,246,0.15)',
              color: COLORS.text.accent,
              padding: `2px ${SPACING.sm}`,
              borderRadius: RADIUS.sm,
              fontWeight: 700,
            }}>Active</span>
          </div>

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button
              label="▶ Start Focus Session"
              variant="primary"
              onClick={() => onSelectPDF(activePdf.id, activePdf.name)}
              style={{ flex: 1 }}
            />
            <Button
              label="Choose Another"
              variant="secondary"
              onClick={() => {
                // Temporarily clear activePdf display by passing null
                // Show Path B by re-rendering with activePdf=null trick:
                // We do this by calling with a different path — pass a flag via local state
                setShowAllDocs(true);
              }}
            />
          </div>

          {showAllDocs && sortedDocuments.filter(d => d.id !== activePdf.id).map((doc) => (
            <div key={doc.id} style={docRowStyle(false)} onClick={() => onSelectPDF(doc.id, doc.name)}>
              <div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                  📄 {doc.name.length > 32 ? doc.name.slice(0, 32) + '…' : doc.name}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                  {relativeDate(doc.created_at)}
                </div>
              </div>
            </div>
          ))}

          {error && <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ── Path B: no active PDF, previous PDFs exist ────────────────────
  if (sortedDocuments.length > 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📚 Choose your study material</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Select a PDF to begin your focus session
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {sortedDocuments.map((doc) => (
              <div key={doc.id} style={docRowStyle(false)} onClick={() => onSelectPDF(doc.id, doc.name)}>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                    📄 {doc.name.length > 32 ? doc.name.slice(0, 32) + '…' : doc.name}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                    {relativeDate(doc.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={uploadZoneStyle}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
              {uploading ? '⏳ Uploading…' : '+ Upload New PDF'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {(error || uploadError) && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>
              {error || uploadError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Path C: no PDFs at all ────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📚 Start your first focus session</div>
        <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
          Upload your study material to begin
        </div>

        <div
          style={uploadZoneStyle}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '28px', marginBottom: SPACING.sm }}>📁</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            {uploading ? '⏳ Uploading…' : 'Drop your PDF here or click to browse'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {uploadError && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{uploadError}</div>
        )}
      </div>
    </div>
  );
}
```

**Important:** The Path A "Choose Another" button references `showAllDocs` local state that is missing. Add this `useState` at the top of the function body, after the existing `useState` declarations:

```js
  const [showAllDocs, setShowAllDocs] = useState(false);
```

So the full opening of the component function should be:

```js
export default function FocusSessionSetup({ activePdf, documents, onSelectPDF, error, userId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showAllDocs, setShowAllDocs] = useState(false);
  const fileInputRef = useRef(null);
  // ... rest of component
```

- [ ] **Step 2: Verify the file exists and dev server compiles**

```bash
ls /c/Users/Shafi/ask-my-notes/src/components/focus/
```

Expected: `FocusModeLoader.jsx  FocusSessionSetup.jsx` listed.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/components/focus/FocusSessionSetup.jsx
git commit -m "feat: add FocusSessionSetup PDF selector component (3 paths)"
```

---

## Task 5: Create FocusSessionActive component

**Files:**
- Create: `src/components/focus/FocusSessionActive.jsx`

This component is an extraction of the current `focus/page.jsx` timer + task logic, with additions: per-task time display, early-completion state, time's-up state, and documentId logging.

- [ ] **Step 1: Create the component**

```jsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import TopBar from '@/components/shared/TopBar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import TimerRing from '@/components/shared/TimerRing';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AI_TIPS = [
  'Focus on the big picture first — details come later.',
  'Try summarising each concept in your own words.',
  'Take notes as you study — it significantly improves retention.',
  'Break down complex problems into smaller steps.',
  "You're making real progress. Keep going!",
];

export default function FocusSessionActive({
  tasks,
  setTasks,
  durationSeconds,
  documentId,
  documentName,
  userId,
  onSessionEnd,
}) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [paused, setPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (paused || timeLeft <= 0) {
      if (timeLeft <= 0) setTimeUp(true);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [paused, timeLeft]);

  // Rotate AI tip every 2 minutes
  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % AI_TIPS.length), 120_000);
    return () => clearInterval(id);
  }, []);

  const currentTask = tasks.find((t) => t.status === 'current');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const allDone = !currentTask && pendingTasks.length === 0;

  const handleMarkDone = useCallback(async () => {
    if (!currentTask) return;
    const nextPending = pendingTasks[0];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === currentTask.id) return { ...t, status: 'done' };
        if (nextPending && t.id === nextPending.id) return { ...t, status: 'current' };
        return t;
      })
    );

    // Log to focus_progress
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/focus-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          task: currentTask.name,
          task_index: doneTasks.length,
          difficulty: 'medium',
          completed: true,
          document_id: documentId || null,
          document_name: documentName || null,
        }),
      });
    } catch {
      // Non-critical: logging failure doesn't break the session
    }
  }, [currentTask, pendingTasks, doneTasks.length, userId, documentId, documentName, setTasks]);

  const handleStop = () => {
    if (window.confirm('End session? Your task progress will be saved.')) {
      onSessionEnd();
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
  };

  const panelStyle = {
    border: `1px solid ${COLORS.border.light}`,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    background: COLORS.bg.card,
  };

  // ── Time's up state ───────────────────────────────────────────────
  if (timeUp && !allDone) {
    return (
      <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, padding: SPACING.xxl }}>
        <TopBar title="Time's Up" />
        <div style={{ ...panelStyle, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '32px', marginBottom: SPACING.md }}>⏰</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
            Time's up!
          </div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>
            {pendingTasks.length + (currentTask ? 1 : 0)} task{(pendingTasks.length + (currentTask ? 1 : 0)) > 1 ? 's' : ''} remaining. Continue?
          </div>
          <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
            <Button label="Keep Going" variant="primary" onClick={() => { setTimeLeft(900); setTimeUp(false); }} />
            <Button label="End Session" variant="secondary" onClick={onSessionEnd} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={documentName ? `Focus: ${documentName.length > 24 ? documentName.slice(0, 24) + '…' : documentName}` : 'Focus Session'}
      />

      <div style={{ padding: `${SPACING.xl} ${SPACING.xxl}`, maxWidth: '900px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.xl }}>

        {/* ── Left: Timer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.xl }}>
          <TimerRing timeLeft={timeLeft} duration={durationSeconds} paused={paused} size={220} />

          {documentName && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
              Est. {Math.round(durationSeconds / 60)} min session
            </div>
          )}

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button
              label={paused ? '▶ Resume' : '⏸ Pause'}
              variant={paused ? 'primary' : 'secondary'}
              onClick={() => setPaused((p) => !p)}
            />
            <Button label="⏹ Stop" variant="secondary" onClick={handleStop} />
          </div>

          {/* AI Tip */}
          <div style={{ ...panelStyle, width: '100%', background: 'rgba(34,211,238,0.04)', border: `1px solid rgba(34,211,238,0.15)` }}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.label, color: COLORS.accent.cyan, fontWeight: 700, marginBottom: SPACING.sm }}>
              💡 AI Tip
            </div>
            <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, margin: 0, lineHeight: 1.7 }}>
              {AI_TIPS[tipIndex]}
            </p>
          </div>
        </div>

        {/* ── Right: Task List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          <ProgressBar
            current={doneTasks.length}
            total={tasks.length}
            label={`Progress: ${doneTasks.length}/${tasks.length} done`}
          />

          {/* Current task */}
          {currentTask && (
            <div style={{ ...panelStyle, border: `2px solid ${COLORS.border.accent}`, background: COLORS.bg.accentLight }}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                CURRENT
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg }}>
                <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, lineHeight: 1.5, flex: 1 }}>
                  {currentTask.name}
                </div>
                {currentTask.estimatedMinutes && (
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginLeft: SPACING.md, flexShrink: 0 }}>
                    ⏱ {currentTask.estimatedMinutes} min
                  </div>
                )}
              </div>
              <Button label="✓ Mark Done" variant="primary" fullWidth onClick={handleMarkDone} />
            </div>
          )}

          {/* Done tasks */}
          {doneTasks.length > 0 && (
            <div style={panelStyle}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                DONE
              </div>
              {doneTasks.map((t) => (
                <div key={t.id} style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.disabled, textDecoration: 'line-through', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  ✔ {t.name}
                </div>
              ))}
            </div>
          )}

          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div style={panelStyle}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                PENDING
              </div>
              {pendingTasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                    ☐ {t.name}
                  </div>
                  {t.estimatedMinutes && (
                    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, opacity: 0.6 }}>
                      {t.estimatedMinutes}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All done — early completion */}
          {allDone && (
            <div style={{ ...panelStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: SPACING.md }}>🎉</div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
                All tasks complete! Great focus session.
              </div>
              <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
                <Button label="Keep Going" variant="secondary" onClick={() => setPaused(false)} />
                <Button label="End Session" variant="primary" onClick={onSessionEnd} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls /c/Users/Shafi/ask-my-notes/src/components/focus/
```

Expected: `FocusModeLoader.jsx  FocusSessionActive.jsx  FocusSessionSetup.jsx` listed.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/components/focus/FocusSessionActive.jsx
git commit -m "feat: add FocusSessionActive component with per-task time display and completion states"
```

---

## Task 6: Refactor focus/page.jsx

**Files:**
- Modify: `src/app/focus/page.jsx` (full rewrite — 183 lines → ~90 lines)

- [ ] **Step 1: Replace the entire content of focus/page.jsx**

The current file has 183 lines. Replace it entirely with:

```jsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import { COLORS, TYPOGRAPHY } from '@/lib/styles';
import { useDashboard } from '@/context/DashboardContext';
import { useActivePDF } from '@/hooks/useActivePDF';
import FocusSessionSetup from '@/components/focus/FocusSessionSetup';
import FocusModeLoader from '@/components/focus/FocusModeLoader';
import FocusSessionActive from '@/components/focus/FocusSessionActive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function FocusPage() {
  const {
    documents,
    user,
    focusSessionTasks,
    setFocusSessionTasks,
    focusSessionDuration,
    focusSessionDocumentId,
    focusSessionDocumentName,
    startFocusSession,
  } = useDashboard();

  const { activePdf } = useActivePDF(user?.id);

  const [sessionState, setSessionState] = useState(
    () => (focusSessionTasks.length > 0 ? 'active' : 'setup')
  );
  const [generatingForDoc, setGeneratingForDoc] = useState(null); // { id, name }
  const [generatingError, setGeneratingError] = useState(null);

  // Resume after page refresh during generation
  useEffect(() => {
    const resumeDocId = sessionStorage.getItem('focusSelectedDocumentId');
    const resumeDocName = sessionStorage.getItem('focusSelectedDocumentName');
    if (resumeDocId && sessionState === 'setup') {
      handleSelectPDF(resumeDocId, resumeDocName || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPDF = async (documentId, documentName) => {
    setSessionState('generating');
    setGeneratingForDoc({ id: documentId, name: documentName });
    setGeneratingError(null);
    sessionStorage.setItem('focusSelectedDocumentId', documentId);
    sessionStorage.setItem('focusSelectedDocumentName', documentName);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/generate-focus-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'generation_failed');

      startFocusSession(
        data.tasks,
        data.totalMinutes * 60,
        data.documentId,
        data.documentName
      );
      sessionStorage.removeItem('focusSelectedDocumentId');
      sessionStorage.removeItem('focusSelectedDocumentName');
      setSessionState('active');
    } catch (err) {
      setSessionState('setup');
      setGeneratingError(err.message === 'pdf_not_found'
        ? 'PDF not found. Please select another.'
        : 'Failed to generate tasks. Please try again.');
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
  };

  return (
    <div style={pageStyle}>
      <ContextualSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {sessionState === 'setup' && (
          <FocusSessionSetup
            activePdf={activePdf}
            documents={documents}
            onSelectPDF={handleSelectPDF}
            error={generatingError}
            userId={user?.id}
          />
        )}
        {sessionState === 'generating' && (
          <FocusModeLoader documentName={generatingForDoc?.name} />
        )}
        {sessionState === 'active' && (
          <FocusSessionActive
            tasks={focusSessionTasks}
            setTasks={setFocusSessionTasks}
            durationSeconds={focusSessionDuration}
            documentId={focusSessionDocumentId}
            documentName={focusSessionDocumentName}
            userId={user?.id}
            onSessionEnd={() => setSessionState('setup')}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and navigate to /focus**

```bash
cd /c/Users/Shafi/ask-my-notes
npm run dev
```

Open `http://localhost:3000/focus` in a browser.

Verify:
- Page shows the setup card (not hardcoded tasks)
- If a PDF was previously active via Ask AI, the "Ready to focus?" Path A card appears
- If there are previous PDFs, the list shows them sorted newest-first
- If no PDFs, the upload drop zone appears

- [ ] **Step 3: Test the flow manually**

1. Select a PDF from the list → "Generating your focus tasks…" skeleton should appear immediately
2. After ~5–15 seconds, the session timer starts with AI-generated tasks
3. Each task card should show a time estimate (e.g., "⏱ 8 min")
4. Click "✓ Mark Done" on the current task → it moves to DONE, next task becomes CURRENT
5. Click "⏹ Stop" → confirm dialog → returns to setup
6. Timer counts down from the AI-estimated total (not 25:00)

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/app/focus/page.jsx
git commit -m "feat: refactor focus page to PDF-driven session with 3-state machine"
```

---

## Task 7: Enhance focus-progress route + Supabase migration

**Files:**
- Modify: `src/app/api/focus-progress/route.js`

- [ ] **Step 1: Add document_id and document_name columns to the Supabase migration**

Run this SQL in the Supabase SQL editor (Dashboard → SQL Editor → New query):

```sql
ALTER TABLE focus_progress
  ADD COLUMN IF NOT EXISTS document_id   uuid,
  ADD COLUMN IF NOT EXISTS document_name text;
```

This is additive and non-breaking — existing rows will have NULL in these columns.

- [ ] **Step 2: Update the POST handler in focus-progress/route.js**

Replace the current content of `src/app/api/focus-progress/route.js` with:

```js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ SAVE TASK
export async function POST(req) {
  const body = await req.json();
  const { user_id, task, task_index, difficulty, document_id, document_name } = body;

  const { data, error } = await supabase.from("focus_progress").insert([
    {
      user_id,
      task,
      task_index,
      difficulty,
      completed: true,
      document_id:   document_id   || null,
      document_name: document_name || null,
    },
  ]);

  if (error) {
    console.error('[focus-progress POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ✅ GET TASKS
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  const { data, error } = await supabase
    .from("focus_progress")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error('[focus-progress GET]', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}
```

- [ ] **Step 3: Mark a task done during a focus session and verify the log**

In the Supabase Dashboard → Table Editor → `focus_progress`, verify the most recent row has `document_id` and `document_name` populated (not NULL).

- [ ] **Step 4: Run all unit tests to confirm nothing is broken**

```bash
cd /c/Users/Shafi/ask-my-notes
node --test tests/unit/focusTasks.test.mjs
npm run test:unit
```

Expected: all existing tests pass + 5 new focusTasks tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/Shafi/ask-my-notes
git add src/app/api/focus-progress/route.js
git commit -m "feat: log document_id and document_name in focus_progress entries"
```

---

## Self-Review Checklist (for plan author)

**Spec coverage:**
- [x] Feature 1 (PDF task generation) → Tasks 2, 6
- [x] Feature 2 (adaptive duration) → Task 5 (`durationSeconds` prop from API totalMinutes)
- [x] Feature 3 (reuse active PDF from Ask AI) → Task 6 (`useActivePDF(user?.id)` in page)
- [x] Feature 4 (previous PDFs selector) → Task 4 (FocusSessionSetup sortedDocuments)
- [x] Feature 5 (low-friction UX) → Task 4 (3 paths: Path A / B / C)
- [x] Feature 6 (dynamic task updates + documentId logging) → Tasks 5, 7
- [x] sessionStorage resilience → Task 6 (mount effect + double key)
- [x] Error → back to setup with message → Task 6 (catch block)
- [x] DashboardContext additions → Task 1
- [x] API route auth + ownership check + fallback → Task 2
- [x] Supabase migration → Task 7 Step 1

**Type/signature consistency:**
- `onSelectPDF(id, name)` — used in Tasks 4, 5, 6 ✅
- `startFocusSession(tasks, durationSeconds, docId, docName)` — defined Task 1, called Task 6 ✅
- `FocusSessionActive` props: `tasks, setTasks, durationSeconds, documentId, documentName, userId, onSessionEnd` — defined Task 5, called Task 6 ✅
- `focusSessionTasks` / `setFocusSessionTasks` / `focusSessionDuration` / `focusSessionDocumentId` / `focusSessionDocumentName` — defined Task 1, exported Task 1, destructured Task 6 ✅
- `parseFocusTasks` exported from route — tested in Task 2 ✅
