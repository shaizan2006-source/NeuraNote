# Mode Switcher (Coach → Ask AI Integration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone Coach page with a Claude-style mode switcher inside the Ask AI input, giving users one chat with two behaviors (Answering | Coach) switchable instantly without page reload.

**Architecture:** Add `chatMode` state to `DashboardContext`, branch the `/api/ask` route early when mode is `"coach"` (bypassing RAG/classification and using a Socratic system prompt), inject a compact `ModeSwitcher` pill into the `AskAISection` input row, and delete all coach-specific pages/routes.

**Tech Stack:** Next.js App Router, React Context, OpenAI streaming, Framer Motion (already in project), localStorage for mode persistence.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| CREATE | `src/lib/prompts/coach.js` | Coach system prompt (Socratic 4-step behavior) |
| CREATE | `src/components/AskAI/ModeSwitcher.jsx` | Pill-style animated mode selector dropdown |
| MODIFY | `src/context/DashboardContext.jsx` | Add `chatMode`/`setChatMode`, pass mode in `handleAsk` fetch body |
| MODIFY | `src/app/api/ask/route.js` | Accept `mode` param, early-branch to coach stream before RAG |
| MODIFY | `src/components/dashboard/AskAISection.jsx` | Inject ModeSwitcher, add mode indicator, consume `chatMode` from context |
| MODIFY | `src/components/shared/ContextualSidebar.jsx` | Remove `/coach` from PAGE_META and CONTEXTUAL_HREFS |
| MODIFY | `src/components/dashboard/StudyModeCards.jsx` | Change AI Coach card `href` from `/coach` to `/ask-ai` |
| DELETE | `src/app/coach/page.jsx` | Coach landing page |
| DELETE | `src/app/coach/session/page.jsx` | Coach session page |
| DELETE | `src/app/api/ai-coach/route.js` | Standalone coach API |
| DELETE | `src/app/api/ai/coach-status/route.js` | Coach status API |
| DELETE | `src/components/AskAI/CoachSidebar.jsx` | Coach-specific sidebar |
| DELETE | `src/lib/coachChatStorage.js` | Coach localStorage utilities |
| DELETE | `src/components/dashboard/AICoachSection.jsx` | Dead inline coach widget |

---

## Task 1: Create the coach system prompt

**Files:**
- Create: `src/lib/prompts/coach.js`

- [ ] **Step 1: Create the coach prompt file**

```js
// src/lib/prompts/coach.js

export const COACH_SYSTEM_PROMPT = `You are Ask My Notes in Coach Mode — a Socratic study mentor.

CRITICAL RULE: Do NOT directly solve or answer academic questions. Instead, guide the student.

BEHAVIOR FLOW (follow in order):

STEP 1 — DETECT INTENT
Identify what the student needs:
- Study planning ("what should I study", "help me prepare for X")
- Concept confusion ("I don't understand X", "explain X")
- Practice/testing ("quiz me on X", "test my knowledge")
- Revision/review

STEP 2 — ASK CLARIFYING QUESTIONS (maximum 2 at a time)
Always ask before giving guidance:
- What is your goal? (exam prep / deep understanding / quick revision)
- How much time do you have? (e.g., 2 hours, 3 days, 1 week)
- Which areas or topics feel weakest right now?
If the student has already answered these, skip to Step 3.

STEP 3 — GENERATE STRUCTURED GUIDANCE
Based on the student's responses, provide ONE of:
A) A study plan with time blocks and priority order
B) A concept breakdown — key ideas, common misconceptions, what to focus on
C) A practice sequence — what to attempt first, what to review after

STEP 4 — CONTINUE ADAPTIVELY
After giving guidance, ask one follow-up question to check progress or refine the plan.
Adjust recommendations if the student reports difficulty.

TONE RULES:
- Conversational, warm, and encouraging
- Short paragraphs — never more than 3 sentences in a row
- Use numbered lists for plans, bullet points for options
- Never lecture; always invite a response

DO NOT:
- Write full essay answers or solve complete problems
- Give long walls of text in one response
- Say "Great question!" or similar filler phrases
- Directly give answers even if the student insists — instead, ask a guiding question
`;
```

- [ ] **Step 2: Verify file exists**

```bash
ls src/lib/prompts/coach.js
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts/coach.js
git commit -m "feat: add Socratic coach system prompt"
```

---

## Task 2: Add `chatMode` state to DashboardContext

**Files:**
- Modify: `src/context/DashboardContext.jsx` (lines 226-237 for state, ~1097-1107 for fetch body, ~1380-1422 for context value)

- [ ] **Step 1: Add `chatMode` state after existing Q&A state block (after line 237)**

Find this block in `DashboardContext.jsx`:
```js
  // ── Q&A ────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  queueRef ...
```

Add immediately after `const [downloadUrl, setDownloadUrl] = useState(null);` (line 237):
```js
  // ── Chat mode (answering | coach) ─────────────────────────────
  const [chatMode, setChatModeState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("amn_chat_mode") || "answering";
    }
    return "answering";
  });
  const setChatMode = (m) => {
    setChatModeState(m);
    if (typeof window !== "undefined") localStorage.setItem("amn_chat_mode", m);
  };
```

- [ ] **Step 2: Pass `chatMode` in the `handleAsk` fetch body**

Find the fetch call in `handleAsk` (around line 1097-1108):
```js
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...askAuthHeader },
        body: JSON.stringify({
          question:        questionText,
          documentId:      documentIds[0] || null,
          documentIds:     documentIds.length > 0 ? documentIds : undefined,
          // Continuation context — only set when coming from QuickChat / a saved conversation
          conversationId:  opts.conversationId  || undefined,
          priorMessages:   opts.priorMessages?.length ? opts.priorMessages : undefined,
        }),
      });
```

Replace with:
```js
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...askAuthHeader },
        body: JSON.stringify({
          question:        questionText,
          documentId:      documentIds[0] || null,
          documentIds:     documentIds.length > 0 ? documentIds : undefined,
          mode:            chatMode,
          conversationId:  opts.conversationId  || undefined,
          priorMessages:   opts.priorMessages?.length ? opts.priorMessages : undefined,
        }),
      });
```

- [ ] **Step 3: Expose `chatMode` and `setChatMode` in the context value**

Find the context value object closing (around line 1422):
```js
      handleAsk, handleInputChange, queue, enqueue,
    }}>
```

Change to:
```js
      handleAsk, handleInputChange, queue, enqueue,
      chatMode, setChatMode,
    }}>
```

- [ ] **Step 4: Verify no syntax errors**

```bash
node --input-type=module < /dev/null 2>&1 | head -5
# Or just check the file looks correct
head -1 src/context/DashboardContext.jsx
```

Run the dev server briefly and check for errors: `npm run dev` then Ctrl+C after a few seconds.

- [ ] **Step 5: Commit**

```bash
git add src/context/DashboardContext.jsx
git commit -m "feat: add chatMode state to DashboardContext with localStorage persistence"
```

---

## Task 3: Add coach branch to `/api/ask` route

**Files:**
- Modify: `src/app/api/ask/route.js` (lines 83-93 for body parsing, lines 119+ for coach branch)

- [ ] **Step 1: Add `COACH_SYSTEM_PROMPT` import at top of route.js**

Find the existing imports at the top of `src/app/api/ask/route.js`. Add after the last import:
```js
import { COACH_SYSTEM_PROMPT } from "@/lib/prompts/coach";
```

- [ ] **Step 2: Extract `mode` from request body**

Find the body destructuring (lines 84-93):
```js
    const {
      question,
      documentId,
      documentIds,
      subject,                   // optional: from UI subject selector
      marks: metaMarks,          // optional: from UI marks selector
      // Continuation — set when user navigated from QuickChat "Open full chat"
      conversationId,            // existing conversation to append Q&A to
      priorMessages,             // [{role:"user"|"assistant", content:string}] history
    } = body;
```

Replace with:
```js
    const {
      question,
      documentId,
      documentIds,
      subject,                   // optional: from UI subject selector
      marks: metaMarks,          // optional: from UI marks selector
      mode = "answering",        // "answering" | "coach"
      // Continuation — set when user navigated from QuickChat "Open full chat"
      conversationId,            // existing conversation to append Q&A to
      priorMessages,             // [{role:"user"|"assistant", content:string}] history
    } = body;
```

- [ ] **Step 3: Add coach branch immediately after the auth check block**

Find this comment in the route (around line 119):
```js
    // ── Classify query ────────────────────────────────────────
    let classification = classifyQuery(question, {
```

Insert the entire coach branch BEFORE this classify block:

```js
    // ── Coach mode: Socratic guidance, no RAG pipeline ────────
    if (mode === "coach") {
      const sanitisedPrior = Array.isArray(priorMessages)
        ? priorMessages
            .filter(m => (m.role === "user" || m.role === "assistant") && m.content?.trim())
            .slice(-8)
        : [];

      const coachMessages = [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        ...sanitisedPrior,
        { role: "user", content: question },
      ];

      const coachStream = await openai.chat.completions.create({
        model:       "gpt-4o-mini",
        temperature: 0.5,
        max_tokens:  700,
        stream:      true,
        messages:    coachMessages,
      });

      const coachReadableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const meta = JSON.stringify({
              sources:        [],
              usedContext:    false,
              classification: { domain: "coach", marks: 0, questionType: "theory", language: "en" },
            }) + "\n";
            controller.enqueue(encoder.encode(`__META__${meta}`));

            let fullAnswer = "";
            for await (const chunk of coachStream) {
              const text = chunk.choices[0]?.delta?.content || "";
              if (text) {
                fullAnswer += text;
                controller.enqueue(encoder.encode(text));
              }
            }

            const ts = new Date().toISOString();

            if (conversationId && fullAnswer) {
              try {
                const { data: conv } = await supabase
                  .from("conversations")
                  .select("messages")
                  .eq("id", conversationId)
                  .single();
                const existing = Array.isArray(conv?.messages) ? conv.messages : [];
                await supabase
                  .from("conversations")
                  .update({
                    messages:   [...existing,
                      { role: "user",      content: question,   ts },
                      { role: "assistant", content: fullAnswer, ts },
                    ],
                    updated_at: ts,
                  })
                  .eq("id", conversationId);
              } catch (saveErr) {
                console.error("coach conversation save error:", saveErr);
              }
            } else if (!conversationId && userId && fullAnswer) {
              try {
                const title = question.trim().slice(0, 80) || "Coach Session";
                const { data: newConv } = await supabase
                  .from("conversations")
                  .insert({
                    user_id:    userId,
                    title,
                    messages:   [
                      { role: "user",      content: question,   ts },
                      { role: "assistant", content: fullAnswer, ts },
                    ],
                    created_at: ts,
                    updated_at: ts,
                  })
                  .select("id")
                  .single();
                if (newConv?.id) {
                  controller.enqueue(
                    encoder.encode(`\n__CONV__${JSON.stringify({ conversation_id: newConv.id })}`)
                  );
                }
              } catch (err) {
                console.error("coach new conversation create error:", err);
              }
            }

            controller.close();
          } catch (err) {
            console.error("Coach stream error:", err);
            controller.error(err);
          }
        },
      });

      return new Response(coachReadableStream, {
        headers: {
          "Content-Type":           "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control":          "no-cache",
          "X-Sources":              "[]",
          "X-Used-Context":         "false",
          "X-From-Cache":           "false",
        },
      });
    }

    // ── Classify query ────────────────────────────────────────
```

- [ ] **Step 4: Verify the server starts without import errors**

```bash
npm run dev
```

Open `/ask-ai` in browser. Switch to coach mode (not wired up yet, but server should not crash).
Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ask/route.js
git commit -m "feat: add coach mode branch to /api/ask route with Socratic streaming"
```

---

## Task 4: Build the ModeSwitcher component

**Files:**
- Create: `src/components/AskAI/ModeSwitcher.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/AskAI/ModeSwitcher.jsx
"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

const MODES = [
  {
    id:    "answering",
    label: "Answering",
    icon:  "⚡",
    desc:  "Direct answers with full detail",
    color: "#a78bfa",
    bg:    "rgba(139,92,246,0.12)",
    border:"rgba(139,92,246,0.3)",
  },
  {
    id:    "coach",
    label: "Coach",
    icon:  "🎯",
    desc:  "Guided learning with questions",
    color: "#fbbf24",
    bg:    "rgba(251,191,36,0.12)",
    border:"rgba(251,191,36,0.3)",
  },
];

export default function ModeSwitcher() {
  const { chatMode, setChatMode } = useDashboard();
  const [open, setOpen]           = useState(false);
  const ref                       = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const current = MODES.find(m => m.id === chatMode) ?? MODES[0];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Pill trigger */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(o => !o)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          5,
          padding:      "4px 9px 4px 7px",
          background:   current.bg,
          border:       `1px solid ${current.border}`,
          borderRadius: 9999,
          cursor:       "pointer",
          fontSize:     12,
          color:        current.color,
          fontWeight:   500,
          lineHeight:   1,
          whiteSpace:   "nowrap",
          transition:   "background 0.18s, border-color 0.18s, color 0.18s",
          userSelect:   "none",
        }}
        title="Switch mode"
      >
        <span style={{ fontSize: 11, lineHeight: 1 }}>{current.icon}</span>
        <span>{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ fontSize: 9, lineHeight: 1, marginTop: 1, opacity: 0.7 }}
        >
          ▾
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{
              position:       "absolute",
              bottom:         "calc(100% + 8px)",
              left:           0,
              background:     "rgba(18, 18, 20, 0.97)",
              border:         "1px solid rgba(255,255,255,0.09)",
              borderRadius:   12,
              padding:        5,
              zIndex:         200,
              minWidth:       200,
              boxShadow:      "0 8px 30px rgba(0,0,0,0.5)",
              backdropFilter: "blur(14px)",
            }}
          >
            {MODES.map(m => {
              const active = chatMode === m.id;
              return (
                <motion.button
                  key={m.id}
                  whileHover={{ background: "rgba(255,255,255,0.05)" }}
                  onClick={() => { setChatMode(m.id); setOpen(false); }}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          10,
                    width:        "100%",
                    padding:      "8px 10px",
                    background:   active ? "rgba(255,255,255,0.04)" : "transparent",
                    border:       "none",
                    borderRadius: 8,
                    cursor:       "pointer",
                    textAlign:    "left",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          6,
                      fontSize:     13,
                      fontWeight:   500,
                      color:        active ? m.color : "var(--text-primary, #e4e4e7)",
                      marginBottom: 2,
                    }}>
                      {m.label}
                      {active && (
                        <span style={{
                          fontSize:     10,
                          color:        m.color,
                          background:   m.bg,
                          padding:      "1px 5px",
                          borderRadius: 4,
                          fontWeight:   600,
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize:   11,
                      color:      "var(--text-muted, #71717a)",
                      lineHeight: 1.35,
                    }}>
                      {m.desc}
                    </div>
                  </div>
                  {active && (
                    <span style={{ fontSize: 11, color: m.color }}>✓</span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Verify file created**

```bash
ls src/components/AskAI/ModeSwitcher.jsx
```

Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add src/components/AskAI/ModeSwitcher.jsx
git commit -m "feat: create ModeSwitcher pill-dropdown component"
```

---

## Task 5: Integrate ModeSwitcher into AskAISection

**Files:**
- Modify: `src/components/dashboard/AskAISection.jsx`

- [ ] **Step 1: Add imports at the top of AskAISection.jsx**

Find the existing import section at the top of the file. Add these two imports (after existing imports):
```js
import ModeSwitcher from "@/components/AskAI/ModeSwitcher";
import { useDashboard } from "@/context/DashboardContext";
```

Note: Check if `useDashboard` is already imported. If it is, skip adding it again — just add `ModeSwitcher`.

- [ ] **Step 2: Destructure `chatMode` from context**

Inside the `AskAISection` component function body, find where `useDashboard()` is already called (look for `const { ... } = useDashboard()`). Add `chatMode` and `setChatMode` to that destructure:

```js
const {
  // ...existing destructured values...
  chatMode,
  setChatMode,
} = useDashboard();
```

If `useDashboard` is not yet called in this component, add near the top of the component:
```js
const { chatMode } = useDashboard();
```

- [ ] **Step 3: Inject ModeSwitcher into the input row**

Find the input row div and the `+` button (line 1307-1341):
```jsx
          {/* ── Input row ── */}
          <div style={{
            display:    "flex",
            alignItems: "flex-end",
          }}>
            {/* + button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setMenuOpen(o => !o)}
              ...
```

Insert the ModeSwitcher BETWEEN the `+` button closing tag and the textarea. The structure should be:

```jsx
          {/* ── Input row ── */}
          <div style={{
            display:    "flex",
            alignItems: "flex-end",
          }}>
            {/* + button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setMenuOpen(o => !o)}
              style={{ /* existing styles unchanged */ }}
              title="Attach file"
            >
              +
            </motion.button>

            {/* Mode switcher */}
            <div style={{ alignSelf: "flex-end", paddingBottom: 10, paddingRight: 4 }}>
              <ModeSwitcher />
            </div>

            {/* textarea — unchanged */}
            <textarea
              ...
```

Exact edit: find the `+` closing `</motion.button>` followed by `{/*` comment and `<textarea`. Insert after the `</motion.button>` for the + button and before the textarea's comment:

```jsx
            {/* Mode switcher */}
            <div style={{ alignSelf: "flex-end", paddingBottom: 10, paddingRight: 4 }}>
              <ModeSwitcher />
            </div>
```

- [ ] **Step 4: Add coach mode indicator below the pill container**

Find the closing of the pill container (look for the outer container div closing after the send button, around line 1438). The structure is:
```jsx
        </div>  {/* end input row */}
      </div>    {/* end pill container */}
    </div>      {/* end outer container */}
```

Add the mode indicator AFTER the closing `</div>` of the pill container but BEFORE the outer container closes:

```jsx
        </div> {/* end input row */}
      </div>   {/* end pill container */}

      {/* Coach mode indicator */}
      {chatMode === "coach" && (
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        5,
          padding:    "5px 16px 0",
          fontSize:   11,
          color:      "rgba(251,191,36,0.7)",
          userSelect: "none",
        }}>
          <span style={{ fontSize: 10 }}>🎯</span>
          <span>Coach Mode — I&apos;ll ask questions to guide you</span>
        </div>
      )}
    </div> {/* end outer container */}
```

- [ ] **Step 5: Update the placeholder text to reflect coach mode**

Find the textarea `placeholder` prop (line 1353):
```jsx
              placeholder={stagedFiles.length > 0 ? "Add a message about these files…" : "Ask any academic question"}
```

Replace with:
```jsx
              placeholder={
                stagedFiles.length > 0
                  ? "Add a message about these files…"
                  : chatMode === "coach"
                    ? "Tell me what you want to study…"
                    : "Ask any academic question"
              }
```

- [ ] **Step 6: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000/ask-ai`. Verify:
1. ModeSwitcher pill appears left of textarea in input row
2. Clicking pill opens dropdown with Answering / Coach options
3. Switching to Coach changes pill color to amber, adds indicator below input
4. Switching back to Answering removes indicator, restores purple pill
5. Typing a question and sending in Coach mode works (check network tab → `/api/ask` with `mode: "coach"` in payload)
6. Response streams correctly in coach mode

Ctrl+C to stop.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/AskAISection.jsx
git commit -m "feat: add ModeSwitcher to input row with mode indicator and placeholder"
```

---

## Task 6: Update navigation references to remove coach route

**Files:**
- Modify: `src/components/shared/ContextualSidebar.jsx` (lines 64-81)
- Modify: `src/components/dashboard/StudyModeCards.jsx` (line 77)

### ContextualSidebar.jsx

- [ ] **Step 1: Remove `/coach` from PAGE_META**

Find (lines 64-70):
```js
const PAGE_META = {
  "/dashboard": { label: "Dashboard", Icon: GridIcon  },
  "/ask-ai":    { label: "Ask AI",    Icon: ChatIcon  },
  "/focus":     { label: "Focus",     Icon: TimerIcon },
  "/coach":     { label: "AI Coach",  Icon: StarIcon  },
  "/quiz":      { label: "Quiz",      Icon: ZapIcon   },
};
```

Replace with:
```js
const PAGE_META = {
  "/dashboard": { label: "Dashboard", Icon: GridIcon  },
  "/ask-ai":    { label: "Ask AI",    Icon: ChatIcon  },
  "/focus":     { label: "Focus",     Icon: TimerIcon },
  "/quiz":      { label: "Quiz",      Icon: ZapIcon   },
};
```

- [ ] **Step 2: Remove `/coach` from CONTEXTUAL_HREFS**

Find (lines 77-81):
```js
const CONTEXTUAL_HREFS = {
  "/focus": ["/coach", "/quiz"],
  "/coach": ["/focus", "/quiz"],
  "/quiz":  ["/focus", "/coach"],
};
```

Replace with:
```js
const CONTEXTUAL_HREFS = {
  "/focus": ["/quiz"],
  "/quiz":  ["/focus"],
};
```

- [ ] **Step 3: Check if StarIcon is still used elsewhere in the file**

```bash
grep -n "StarIcon" src/components/shared/ContextualSidebar.jsx
```

If `StarIcon` only appeared in the `/coach` PAGE_META entry and nowhere else, remove its import too. Find the import line and delete `StarIcon` from it.

### StudyModeCards.jsx

- [ ] **Step 4: Update AI Coach card to link to /ask-ai**

Find (line 73-83):
```jsx
      <BentoCard
        icon="💬"
        title="AI Coach"
        subtitle="3 suggestions"
        href="/coach"
        glowColor="rgba(34,211,238,0.25)"
        style={{
          borderLeft: "3px solid rgba(34,211,238,0.3)",
          boxShadow:  "0 0 16px rgba(34,211,238,0.08)",
        }}
      />
```

Replace with:
```jsx
      <BentoCard
        icon="💬"
        title="AI Coach"
        subtitle="Switch to Coach mode"
        href="/ask-ai"
        glowColor="rgba(34,211,238,0.25)"
        style={{
          borderLeft: "3px solid rgba(34,211,238,0.3)",
          boxShadow:  "0 0 16px rgba(34,211,238,0.08)",
        }}
      />
```

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/ContextualSidebar.jsx src/components/dashboard/StudyModeCards.jsx
git commit -m "fix: remove /coach route from navigation, redirect coach card to /ask-ai"
```

---

## Task 7: Delete coach pages and dead files

- [ ] **Step 1: Verify no imports remain before deleting**

```bash
grep -r "from.*CoachSidebar\|from.*coachChatStorage\|from.*AICoachSection\|href.*\/coach\b" src/ --include="*.{js,jsx}" | grep -v "coach/page\|coach/session"
```

Expected: no output (or only the files you're about to delete). If any unexpected files appear, fix those first.

- [ ] **Step 2: Delete coach page directory**

```bash
rm -rf src/app/coach
```

Expected: no error.

- [ ] **Step 3: Delete standalone coach API**

```bash
rm src/app/api/ai-coach/route.js
# Remove empty directory if it exists
rmdir src/app/api/ai-coach 2>/dev/null || true
```

- [ ] **Step 4: Delete coach-status API**

```bash
rm src/app/api/ai/coach-status/route.js
rmdir src/app/api/ai/coach-status 2>/dev/null || true
rmdir src/app/api/ai 2>/dev/null || true
```

- [ ] **Step 5: Delete dead components**

```bash
rm src/components/AskAI/CoachSidebar.jsx
rm src/components/dashboard/AICoachSection.jsx
```

- [ ] **Step 6: Delete coachChatStorage**

```bash
rm src/lib/coachChatStorage.js
```

- [ ] **Step 7: Start dev server and verify no errors**

```bash
npm run dev
```

Check the terminal for any import errors. Open:
- `http://localhost:3000/ask-ai` — should load correctly
- `http://localhost:3000/coach` — should return 404 (Next.js auto 404 for deleted routes)
- `http://localhost:3000/dashboard` — should load, coach card now links to `/ask-ai`

Ctrl+C to stop.

- [ ] **Step 8: Commit deletions**

```bash
git add -A
git commit -m "feat: remove coach page, routes, and dead components — functionality moved into Ask AI mode switcher"
```

---

## Task 8: Clean up dead state in DashboardContext

**Files:**
- Modify: `src/context/DashboardContext.jsx`

- [ ] **Step 1: Verify `messages`, `input`, `setInput`, `sendMessage` are only used by dead code**

```bash
grep -n "sendMessage\|AICoachSection" src/context/DashboardContext.jsx | head -10
```

Expected: only the definition lines for `sendMessage` and maybe its exposure in context value.

```bash
grep -rn "sendMessage\b" src/ --include="*.{js,jsx}" | grep -v "DashboardContext\|coachChatStorage\|AICoachSection\|useFocusSessionChat\|useChatMessages\|QuickChatDrawer\|FocusInlineChat\|chat/page"
```

Expected: no output. (The `sendMessage` in other files is locally defined, not from DashboardContext.)

- [ ] **Step 2: Remove coach-specific state from DashboardContext**

Find these lines (around 340-341):
```js
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
```

Delete them.

Find `showHistory, setShowHistory` state if it's also coach-specific:
```bash
grep -n "showHistory" src/context/DashboardContext.jsx | head -5
```

If `showHistory` only appears in the coach section, delete it too. Check usage first:
```bash
grep -rn "showHistory" src/ --include="*.{js,jsx}" | grep -v DashboardContext
```

- [ ] **Step 3: Remove the `sendMessage` function (lines 705-721)**

Find and delete:
```js
  // ================================================================
  // AI COACH
  // ================================================================
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, context: { exams, weakTopics, readiness, analytics } }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };
```

- [ ] **Step 4: Remove `messages`, `input`, `setInput`, `sendMessage`, `showHistory`, `setShowHistory` from the context value**

Find in context value (around line 1403-1404):
```js
      messages, input, setInput,
      showHistory, setShowHistory,
      ...
      sendMessage, handleLogin,
```

Remove these entries. Keep `handleLogin` and everything else.

- [ ] **Step 5: Verify dev server still starts**

```bash
npm run dev
```

No errors in terminal. Test Ask AI page in browser — send a message in both Answering and Coach modes.

- [ ] **Step 6: Commit**

```bash
git add src/context/DashboardContext.jsx
git commit -m "refactor: remove dead coach inline chat state from DashboardContext"
```

---

## Task 9: Mobile responsiveness check

**Files:**
- Modify: `src/components/AskAI/ModeSwitcher.jsx` (if needed)

- [ ] **Step 1: Open dev tools and simulate mobile (375px width)**

In Chrome DevTools, toggle device toolbar and set to iPhone SE (375px).
Navigate to `http://localhost:3000/ask-ai`.

Check:
- ModeSwitcher pill is fully visible in input row (not cut off)
- Dropdown opens upward and fits within viewport
- Dropdown doesn't overflow the left/right edges of the screen

- [ ] **Step 2: Fix dropdown overflow on small screens if needed**

If the dropdown overflows left on mobile, update the dropdown positioning in `ModeSwitcher.jsx`:

Find:
```jsx
            style={{
              position:       "absolute",
              bottom:         "calc(100% + 8px)",
              left:           0,
```

Replace with:
```jsx
            style={{
              position:       "absolute",
              bottom:         "calc(100% + 8px)",
              left:           0,
              maxWidth:       "calc(100vw - 32px)",
```

- [ ] **Step 3: Verify input row doesn't overflow on mobile**

Check that the input row `[+ button] [ModeSwitcher] [textarea] [send]` doesn't shrink the textarea too much. If the textarea becomes too narrow (<100px), adjust the ModeSwitcher label to be icon-only on small screens by checking viewport width. 

If the row is too crowded, update ModeSwitcher to hide the label on very small screens:
```jsx
      {/* Pill trigger - hide text label on very small screens */}
      <motion.button
        ...
      >
        <span style={{ fontSize: 11 }}>{current.icon}</span>
        <span style={{ display: window.innerWidth < 400 ? "none" : "inline" }}>
          {current.label}
        </span>
        ...
      </motion.button>
```

Note: `window.innerWidth` inside JSX only works client-side. A better approach uses CSS media queries or a `useMediaQuery` hook. Use inline style `display: "none"` is not reactive. Instead, just keep the label — the pill width is ~90px which fits fine in most cases.

- [ ] **Step 4: Commit if changes made**

```bash
git add src/components/AskAI/ModeSwitcher.jsx
git commit -m "fix: improve ModeSwitcher mobile overflow handling"
```

---

## Task 10: End-to-end verification

- [ ] **Step 1: Full smoke test**

```bash
npm run dev
```

Test checklist:
1. **Answering mode** — type a question, send, verify streaming response renders, verify network tab shows `mode: "answering"` in request
2. **Switch to Coach mode** — click pill, select Coach, verify pill turns amber, indicator appears below input
3. **Coach mode** — type "I want to prepare for my OS exam tomorrow", send, verify response is a Socratic clarifying question (NOT a direct answer)
4. **Mode persistence** — refresh page, verify mode stays as Coach
5. **Chat history persists on mode switch** — send one message, switch mode, verify previous messages still visible
6. **Continuation** — send second message in coach mode, verify it uses conversation history (priorMessages in network request)
7. **Back to answering** — switch to Answering, ask a direct question, verify full answer returned
8. **Navigation** — go to Dashboard, click "AI Coach" card, verify it goes to `/ask-ai` not `/coach`
9. **404** — navigate to `/coach` directly, verify 404 page
10. **No console errors** — check browser console for any React errors

- [ ] **Step 2: Check for TypeScript/lint errors if applicable**

```bash
npm run build 2>&1 | head -50
```

Fix any import errors or unused variable warnings that surface.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Ask AI mode switcher — coach integrated, pages removed"
```

---

## Self-Review Against Spec

| Spec Requirement | Covered In |
|-----------------|------------|
| Remove Coach page, routes, nav links | Task 7 |
| No orphan imports | Task 7 Step 1 + Task 8 |
| Claude-style pill/dropdown in input | Task 4, 5 |
| Mode flag in single chat session | Task 2, 3 |
| Mode switch doesn't reset chat | Mode flag only affects future requests; `messages` local state unchanged |
| Answering mode — no changes to logic | Coach branch returns early, answering pipeline untouched |
| Coach — question-first, guided | COACH_SYSTEM_PROMPT enforces Socratic behavior |
| Mode label visible inside input | Task 5 Step 4 (indicator below input) |
| No layout shift | ModeSwitcher in flex row, stable width |
| Conversation history across modes | `priorMessages` always passed from AskAISection; context unaffected by mode |
| Mobile responsiveness | Task 9 |
| No double renders / race conditions | Mode only read at request time; no extra effects |
| Performance — no RAG in coach mode | Coach branch exits before embedding + vector search |
| Smart suggestion (optional) | Not implemented — deferred as enhancement |
| Inline quick actions (optional) | Not implemented — deferred as enhancement |
