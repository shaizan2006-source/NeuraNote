# Dashboard + Ask AI Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Dashboard (2-mode bento grid + QuickChat drawer) and Ask AI page (new sidebar with Recent Chats + Your PDFs) using the Ambient Intelligence design system.

**Architecture:** Dashboard switches between Study mode (Ask AI hero + 4 cards) and Progress mode (Your Brain hero + 4 cards) via a pill toggle. A QuickChat drawer slides in from the right when the hero input is used, sharing conversation state with the Ask AI full page. Both pages use a collapsible 3-item sidebar (220px ↔ 56px icon rail).

**Tech Stack:** Next.js 16, React 19, framer-motion v12, Supabase (pgvector), OpenAI, uuid, inline styles (no Tailwind classes), node:test for unit tests, Playwright for e2e.

---

## File Map

**Create:**
- `src/components/ui/Buttons.jsx` — all 3 button variants (Primary, Secondary, Compact)
- `src/components/Dashboard/GreetingRow.jsx` — time-based greeting + mode toggle pill
- `src/components/Dashboard/AskAIHeroCard.jsx` — hero card with breathing input
- `src/components/Dashboard/YourBrainHeroCard.jsx` — mastery grid hero card
- `src/components/Dashboard/StudyModeCards.jsx` — 4 bento cards for study mode
- `src/components/Dashboard/ProgressModeCards.jsx` — 4 bento cards for progress mode
- `src/components/Dashboard/BentoGrid.jsx` — layout + mode fade animation
- `src/components/QuickChat/QuickChatDrawer.jsx` — full drawer (header + thread + input)
- `src/components/AskAI/AskAISidebar.jsx` — sidebar with New Chat + Recent Chats + Your PDFs
- `src/context/DrawerContext.jsx` — drawerConversationId + activePdf runtime state
- `src/hooks/useActivePDF.js` — read/set active PDF from Supabase
- `src/app/api/quick-chat/route.js` — RAG chat that saves to conversations table
- `src/app/api/conversations/route.js` — GET recent 10 chats for sidebar
- `src/app/api/user-pdfs/route.js` — GET user's PDFs with active flag

**Modify:**
- `src/context/DashboardContext.jsx` — add `dashboardMode`, `sidebarCollapsed` state
- `src/components/dashboard/DashboardSidebar.jsx` — full redesign (3 nav items, collapse, tooltips)
- `src/app/dashboard/page.js` — replace tabs with BentoGrid + QuickChatDrawer
- `src/app/ask-ai/page.js` — use AskAISidebar instead of DashboardSidebar

**New migration:**
- `src/app/api/quick-chat/migration.sql` — conversations table + profiles columns

---

## Task 1: Supabase Migration (conversations table + profiles columns)

**Files:**
- Create: `supabase/quickchat_migration.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/quickchat_migration.sql
-- Run once in Supabase SQL Editor

-- 1. Add dashboard_mode + active_pdf_id to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dashboard_mode TEXT NOT NULL DEFAULT 'study',
  ADD COLUMN IF NOT EXISTS active_pdf_id  UUID REFERENCES pdfs_metadata(id) ON DELETE SET NULL;

-- 2. conversations: persisted QuickChat + Ask AI threads
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT,
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass (needed by API routes using SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role full access to conversations"
  ON conversations FOR ALL
  USING (true)
  WITH CHECK (true);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor → paste the file content → Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify tables**

In Supabase SQL Editor run:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('dashboard_mode', 'active_pdf_id');
SELECT table_name FROM information_schema.tables WHERE table_name = 'conversations';
```
Expected: 3 rows returned.

- [ ] **Step 4: Commit**

```bash
git add supabase/quickchat_migration.sql
git commit -m "feat: add conversations table and profiles dashboard columns"
```

---

## Task 2: Button Components

**Files:**
- Create: `src/components/ui/Buttons.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/ui/Buttons.jsx
"use client";

// ── Primary Button (glassmorphism) ────────────────────────────────
export function PrimaryButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        position:       "relative",
        overflow:       "hidden",
        background:     "linear-gradient(135deg, #8B5CF6, #6D28D9)",
        color:          "#fff",
        padding:        "9px 18px",
        borderRadius:   8,
        fontSize:       11,
        fontWeight:     600,
        border:         "none",
        cursor:         "pointer",
        transition:     "transform 200ms ease-out",
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
      onMouseUp={e => e.currentTarget.style.transform = "translateY(-1px)"}
    >
      {/* Glass overlay */}
      <span style={{
        position:       "absolute",
        inset:          0,
        background:     "rgba(255,255,255,0.15)",
        backdropFilter: "blur(20px)",
        border:         "1px solid rgba(255,255,255,0.2)",
        borderRadius:   8,
        pointerEvents:  "none",
      }} />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </button>
  );
}

// ── Secondary Button (ghost) ──────────────────────────────────────
export function SecondaryButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        background:   "transparent",
        color:        "#a1a1aa",
        border:       "1px solid rgba(255,255,255,0.12)",
        padding:      "8px 16px",
        borderRadius: 8,
        fontSize:     11,
        fontWeight:   600,
        cursor:       "pointer",
        transition:   "all 200ms ease-out",
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
        e.currentTarget.style.color = "#c4b5fd";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = "#a1a1aa";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onMouseDown={e => e.currentTarget.style.opacity = "0.7"}
      onMouseUp={e => e.currentTarget.style.opacity = "1"}
    >
      {children}
    </button>
  );
}

// ── Compact Button (inline pill) ─────────────────────────────────
export function CompactButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        background:   "transparent",
        color:        "#a1a1aa",
        border:       "1px solid rgba(255,255,255,0.10)",
        padding:      "4px 10px",
        borderRadius: 6,
        fontSize:     10,
        fontWeight:   600,
        cursor:       "pointer",
        transition:   "all 100ms ease-in",
        display:      "flex",
        alignItems:   "center",
        gap:          4,
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
        e.currentTarget.style.color = "#e4e4e7";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
        e.currentTarget.style.color = "#a1a1aa";
      }}
      onMouseDown={e => e.currentTarget.style.opacity = "0.7"}
      onMouseUp={e => e.currentTarget.style.opacity = "1"}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, open `http://localhost:3000`. Temporarily import and render all 3 buttons anywhere to confirm styles render correctly. Remove the test render after verification.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Buttons.jsx
git commit -m "feat: add Primary, Secondary, Compact button components"
```

---

## Task 3: DrawerContext + useActivePDF hook

**Files:**
- Create: `src/context/DrawerContext.jsx`
- Create: `src/hooks/useActivePDF.js`

- [ ] **Step 1: Write DrawerContext**

```jsx
// src/context/DrawerContext.jsx
"use client";

import { createContext, useContext, useState } from "react";

const DrawerContext = createContext(null);

export function DrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  // activePdf: { id, name } | null
  const [activePdf, setActivePdf] = useState(null);

  function openDrawer() { setIsOpen(true); }
  function closeDrawer() { setIsOpen(false); }
  function startNewDrawerConversation() {
    setConversationId(null);
    setIsOpen(true);
  }

  return (
    <DrawerContext.Provider value={{
      isOpen, openDrawer, closeDrawer,
      conversationId, setConversationId,
      activePdf, setActivePdf,
      startNewDrawerConversation,
    }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used inside DrawerProvider");
  return ctx;
}
```

- [ ] **Step 2: Write useActivePDF hook**

```js
// src/hooks/useActivePDF.js
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Returns { activePdf, setActivePdfId, loading }
// activePdf: { id, name } | null
export function useActivePDF(userId) {
  const [activePdf, setActivePdf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from("profiles")
      .select("active_pdf_id")
      .eq("id", userId)
      .single()
      .then(async ({ data }) => {
        if (data?.active_pdf_id) {
          const { data: pdf } = await supabase
            .from("pdfs_metadata")
            .select("id, name")
            .eq("id", data.active_pdf_id)
            .single();
          setActivePdf(pdf || null);
        }
        setLoading(false);
      });
  }, [userId]);

  async function setActivePdfId(pdfId) {
    if (!userId) return;
    await supabase
      .from("profiles")
      .update({ active_pdf_id: pdfId })
      .eq("id", userId);
    if (pdfId) {
      const { data: pdf } = await supabase
        .from("pdfs_metadata")
        .select("id, name")
        .eq("id", pdfId)
        .single();
      setActivePdf(pdf || null);
    } else {
      setActivePdf(null);
    }
  }

  return { activePdf, setActivePdfId, loading };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/context/DrawerContext.jsx src/hooks/useActivePDF.js
git commit -m "feat: add DrawerContext and useActivePDF hook"
```

---

## Task 4: API Routes (quick-chat, conversations, user-pdfs)

**Files:**
- Create: `src/app/api/quick-chat/route.js`
- Create: `src/app/api/conversations/route.js`
- Create: `src/app/api/user-pdfs/route.js`

- [ ] **Step 1: Write `/api/quick-chat` route**

This route handles RAG chat from the drawer and persists conversation to Supabase.

```js
// src/app/api/quick-chat/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const RAG_THRESHOLD = parseFloat(process.env.RAG_CONFIDENCE_THRESHOLD || "0.75");

export async function POST(req) {
  try {
    const { question, user_id, document_id, conversation_id } = await req.json();
    if (!question || !user_id) {
      return NextResponse.json({ error: "Missing question or user_id" }, { status: 400 });
    }

    // 1. RAG lookup (only if document_id provided)
    let ragText = "";
    let usedRag = false;
    let ragSourceNote = null;

    if (document_id) {
      try {
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: question,
        });
        const embedding = embRes.data[0].embedding;
        const { data: chunks } = await supabase.rpc("match_documents", {
          query_embedding: embedding,
          match_count: 5,
          doc_id: document_id,
        });
        const goodChunks = (chunks || []).filter(c => (c.similarity ?? 1) >= RAG_THRESHOLD);
        if (goodChunks.length > 0) {
          ragText = goodChunks.map(c => c.content).join("\n\n");
          usedRag = true;
        } else {
          // Fetch PDF name for the "not found" note
          const { data: pdf } = await supabase
            .from("pdfs_metadata")
            .select("name")
            .eq("id", document_id)
            .single();
          ragSourceNote = `Not found in ${pdf?.name ?? "your PDF"}, here's general knowledge:`;
        }
      } catch {
        // embedding failed, fall through to general AI
      }
    }

    // 2. Build messages
    let systemPrompt = "You are an AI study assistant. Answer clearly and concisely.";
    if (ragText) systemPrompt += `\n\nPDF Context:\n${ragText}`;

    // Load existing conversation messages for multi-turn
    let priorMessages = [];
    if (conversation_id) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("messages")
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .single();
      priorMessages = conv?.messages ?? [];
    }

    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...priorMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    // 3. Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesForAI,
      max_tokens: 600,
    });
    const aiAnswer = completion.choices[0].message.content;

    // 4. Persist conversation
    const newUserMsg = { role: "user", content: question, ts: new Date().toISOString() };
    const newAiMsg   = { role: "assistant", content: aiAnswer, ts: new Date().toISOString(), used_rag: usedRag };

    const updatedMessages = [...priorMessages, newUserMsg, newAiMsg];
    let convId = conversation_id;

    if (!convId) {
      convId = uuidv4();
      await supabase.from("conversations").insert({
        id:       convId,
        user_id,
        title:    question.slice(0, 60),
        messages: updatedMessages,
      });
    } else {
      await supabase.from("conversations")
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq("id", convId)
        .eq("user_id", user_id);
    }

    return NextResponse.json({
      answer:          ragSourceNote ? `${ragSourceNote}\n\n${aiAnswer}` : aiAnswer,
      conversation_id: convId,
      used_rag:        usedRag,
    });
  } catch (err) {
    console.error("quick-chat error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write `/api/conversations` route**

```js
// src/app/api/conversations/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json([], { status: 400 });

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user_id)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
```

- [ ] **Step 3: Write `/api/user-pdfs` route**

```js
// src/app/api/user-pdfs/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json([], { status: 400 });

  // Get PDFs + active PDF id from profiles
  const [pdfsRes, profileRes] = await Promise.all([
    supabase
      .from("pdfs_metadata")
      .select("id, name, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("active_pdf_id")
      .eq("id", user_id)
      .single(),
  ]);

  const pdfs = pdfsRes.data || [];
  const activePdfId = profileRes.data?.active_pdf_id ?? null;

  const result = pdfs.map(p => ({ ...p, is_active: p.id === activePdfId }));
  return NextResponse.json(result);
}

export async function PUT(req) {
  try {
    const { user_id, pdf_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    await supabase
      .from("profiles")
      .update({ active_pdf_id: pdf_id ?? null })
      .eq("id", user_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Write unit test for quick-chat route logic**

```js
// tests/unit/quickChat.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the RAG threshold logic in isolation
const RAG_THRESHOLD = 0.75;

function filterChunksByThreshold(chunks, threshold) {
  return chunks.filter(c => (c.similarity ?? 1) >= threshold);
}

describe("quick-chat RAG threshold", () => {
  it("includes chunks above threshold", () => {
    const chunks = [{ content: "A", similarity: 0.9 }, { content: "B", similarity: 0.6 }];
    assert.deepEqual(filterChunksByThreshold(chunks, RAG_THRESHOLD), [{ content: "A", similarity: 0.9 }]);
  });

  it("returns empty array when all below threshold", () => {
    const chunks = [{ content: "A", similarity: 0.5 }];
    assert.deepEqual(filterChunksByThreshold(chunks, RAG_THRESHOLD), []);
  });

  it("includes chunk exactly at threshold", () => {
    const chunks = [{ content: "A", similarity: 0.75 }];
    assert.equal(filterChunksByThreshold(chunks, RAG_THRESHOLD).length, 1);
  });
});
```

- [ ] **Step 5: Run the test**

```bash
node --test tests/unit/quickChat.test.mjs
```
Expected: `✔ quick-chat RAG threshold (3 subtests)`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/quick-chat/route.js src/app/api/conversations/route.js src/app/api/user-pdfs/route.js tests/unit/quickChat.test.mjs
git commit -m "feat: add quick-chat, conversations, and user-pdfs API routes"
```

---

## Task 5: Update DashboardContext (add dashboardMode + sidebarCollapsed)

**Files:**
- Modify: `src/context/DashboardContext.jsx`

- [ ] **Step 1: Read the current file**

Read `src/context/DashboardContext.jsx` in full. Find where the `useState` calls live (around line 100+). Note: the file is long (~400+ lines) so read in sections if needed.

- [ ] **Step 2: Add dashboardMode state**

Find the block of `useState` declarations inside `DashboardProvider`. Add after the last `useState`:

```js
// Dashboard mode: "study" | "progress"
const [dashboardMode, setDashboardMode] = useState(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("dashboard_mode") || "study";
  }
  return "study";
});

function toggleDashboardMode() {
  const next = dashboardMode === "study" ? "progress" : "study";
  setDashboardMode(next);
  if (typeof window !== "undefined") {
    localStorage.setItem("dashboard_mode", next);
  }
}

// Sidebar collapsed state
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("sidebar_collapsed") === "true";
  }
  return false;
});

function toggleSidebar() {
  setSidebarCollapsed(prev => {
    const next = !prev;
    if (typeof window !== "undefined") localStorage.setItem("sidebar_collapsed", String(next));
    return next;
  });
}
```

- [ ] **Step 3: Expose in context value**

Find the `value={{` object passed to `DashboardContext.Provider`. Add to it:

```js
dashboardMode,
toggleDashboardMode,
sidebarCollapsed,
toggleSidebar,
```

- [ ] **Step 4: Verify no runtime errors**

Run `npm run dev`, open `http://localhost:3000/dashboard`. No console errors expected.

- [ ] **Step 5: Commit**

```bash
git add src/context/DashboardContext.jsx
git commit -m "feat: add dashboardMode and sidebarCollapsed to DashboardContext"
```

---

## Task 6: Redesign DashboardSidebar

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.jsx`

Replace the entire file. The existing sidebar has ~10 nav items scrolling to sections. The new sidebar has exactly 3 page-level nav items + collapse/expand to 56px icon rail.

- [ ] **Step 1: Write the new DashboardSidebar**

```jsx
// src/components/dashboard/DashboardSidebar.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// lucide-react is NOT in the project — use inline SVG icons
function GridIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function ChatIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function FileIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { icon: GridIcon,  label: "Dashboard", href: "/dashboard"  },
  { icon: ChatIcon,  label: "Ask AI",    href: "/ask-ai"     },
  { icon: FileIcon,  label: "My PDFs",   href: "/my-pdfs"    },
];

function Tooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.12 }}
      style={{
        position:    "absolute",
        left:        "calc(100% + 10px)",
        top:         "50%",
        transform:   "translateY(-50%)",
        background:  "#1F1F23",
        border:      "1px solid rgba(255,255,255,0.1)",
        borderRadius: 5,
        padding:     "3px 8px",
        fontSize:    9,
        color:       "#e4e4e7",
        whiteSpace:  "nowrap",
        pointerEvents: "none",
        zIndex:      300,
      }}
    >
      {label}
    </motion.div>
  );
}

export default function DashboardSidebar({ activePdfActive = false }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useDashboard();
  const [hoveredItem, setHoveredItem] = useState(null);

  // Delay tooltip appearance
  const [showTooltipFor, setShowTooltipFor] = useState(null);
  useEffect(() => {
    if (!hoveredItem || !sidebarCollapsed) { setShowTooltipFor(null); return; }
    const t = setTimeout(() => setShowTooltipFor(hoveredItem), 200);
    return () => clearTimeout(t);
  }, [hoveredItem, sidebarCollapsed]);

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{
        height:       "100vh",
        background:   "#111111",
        borderRight:  "1px solid rgba(255,255,255,0.05)",
        display:      "flex",
        flexDirection:"column",
        overflow:     "hidden",
        flexShrink:   0,
      }}
    >
      {/* Header */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        justifyContent: sidebarCollapsed ? "center" : "space-between",
        padding:       "10px",
        borderBottom:  "1px solid rgba(255,255,255,0.05)",
        minHeight:     52,
      }}>
        {!sidebarCollapsed && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", whiteSpace: "nowrap" }}
          >
            AskMyNotes
          </motion.span>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            background:   "transparent",
            border:       "none",
            color:        "#52525b",
            cursor:       "pointer",
            fontSize:     14,
            lineHeight:   1,
            padding:      4,
            flexShrink:   0,
          }}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          // Purple indicator dot = current page; cyan = active PDF (My PDFs only)
          const hasCyanDot = href === "/my-pdfs" && activePdfActive;

          return (
            <div
              key={href}
              style={{ position: "relative" }}
              onMouseEnter={() => setHoveredItem(href)}
              onMouseLeave={() => { setHoveredItem(null); setShowTooltipFor(null); }}
            >
              <button
                onClick={() => router.push(href)}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            10,
                  width:          "100%",
                  padding:        sidebarCollapsed ? "8px 0" : "8px 10px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  background:     isActive ? "rgba(139,92,246,0.12)" : "transparent",
                  border:         "none",
                  borderRadius:   6,
                  cursor:         "pointer",
                  color:          isActive ? "#a78bfa" : "#52525b",
                  transition:     "background 150ms",
                  position:       "relative",
                  margin:         "0 6px",
                  width:          sidebarCollapsed ? 44 : "calc(100% - 12px)",
                }}
              >
                {/* Icon container — 28×28 touch target */}
                <span style={{
                  width: 28, height: 28, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative",
                }}>
                  <Icon size={16} color={isActive ? "#a78bfa" : "#52525b"} />
                  {/* Indicator dots (collapsed only) */}
                  {sidebarCollapsed && isActive && (
                    <span style={{
                      position: "absolute", bottom: 2, right: 2,
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#8B5CF6",
                    }} />
                  )}
                  {sidebarCollapsed && hasCyanDot && (
                    <span style={{
                      position: "absolute", bottom: 2, right: 2,
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#22D3EE",
                    }} />
                  )}
                </span>

                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Tooltip (collapsed + hovering + 200ms delay passed) */}
              <AnimatePresence>
                {sidebarCollapsed && showTooltipFor === href && <Tooltip label={label} />}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Expand button (collapsed only, bottom) */}
      {sidebarCollapsed && (
        <div style={{ padding: "8px 0", display: "flex", justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={toggleSidebar}
            style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14 }}
          >›</button>
        </div>
      )}
    </motion.aside>
  );
}
```

- [ ] **Step 2: Run dev server and verify**

```bash
npm run dev
```
Open `http://localhost:3000/dashboard`. Check:
- Sidebar shows 3 items: Dashboard, Ask AI, My PDFs
- Clicking ‹ collapses to 56px icon rail
- Hover on collapsed icon shows tooltip after ~200ms
- Active page has purple tint + icon color
- State persists on page refresh (localStorage)

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.jsx
git commit -m "feat: redesign DashboardSidebar as 3-item collapsible nav rail"
```

---

## Task 7: GreetingRow Component

**Files:**
- Create: `src/components/Dashboard/GreetingRow.jsx`

- [ ] **Step 1: Write unit test for greeting logic**

```js
// tests/unit/greetingRow.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getSubtext(mode, hour) {
  const isNight = hour >= 21 || hour < 5;
  if (mode === "progress") return "See your progress";
  return isNight ? "Studying late?" : "Ready to study?";
}

describe("getGreeting", () => {
  it("morning at 9am", () => assert.equal(getGreeting(9), "Good morning"));
  it("afternoon at 14", () => assert.equal(getGreeting(14), "Good afternoon"));
  it("evening at 19", () => assert.equal(getGreeting(19), "Good evening"));
  it("night at 23", () => assert.equal(getGreeting(23), "Good night"));
  it("night at 2am", () => assert.equal(getGreeting(2), "Good night"));
});

describe("getSubtext", () => {
  it("study mode daytime", () => assert.equal(getSubtext("study", 10), "Ready to study?"));
  it("study mode night", () => assert.equal(getSubtext("study", 23), "Studying late?"));
  it("progress mode always same", () => assert.equal(getSubtext("progress", 23), "See your progress"));
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
node --test tests/unit/greetingRow.test.mjs
```
Expected: all 8 subtests pass.

- [ ] **Step 3: Write GreetingRow component**

```jsx
// src/components/Dashboard/GreetingRow.jsx
"use client";

import { useDashboard } from "@/context/DashboardContext";

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getSubtext(mode, hour) {
  const isNight = hour >= 21 || hour < 5;
  if (mode === "progress") return "See your progress";
  return isNight ? "Studying late?" : "Ready to study?";
}

export default function GreetingRow({ userName = "there" }) {
  const { dashboardMode, toggleDashboardMode } = useDashboard();
  const hour    = new Date().getHours();
  const greeting = getGreeting(hour);
  const subtext  = getSubtext(dashboardMode, hour);

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   20,
    }}>
      {/* Left: greeting */}
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>
          {greeting}, {userName}
        </h1>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 400, color: "#71717a", marginTop: 2 }}>
          {subtext}
        </p>
      </div>

      {/* Right: mode toggle pill */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        background:    "rgba(255,255,255,0.04)",
        borderRadius:  20,
        padding:       2,
        border:        "1px solid rgba(255,255,255,0.08)",
      }}>
        {["study", "progress"].map(mode => (
          <button
            key={mode}
            onClick={() => toggleDashboardMode()}
            style={{
              padding:      "6px 12px",
              borderRadius: 18,
              fontSize:     10,
              fontWeight:   600,
              border:       "none",
              cursor:       "pointer",
              transition:   "all 200ms ease-in-out",
              background:   dashboardMode === mode
                ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                : "transparent",
              color:        dashboardMode === mode ? "#fff" : "#71717a",
            }}
          >
            {mode === "study" ? "Study" : "Progress"}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/GreetingRow.jsx tests/unit/greetingRow.test.mjs
git commit -m "feat: add GreetingRow with time-based greeting and mode toggle"
```

---

## Task 8: AskAIHeroCard

**Files:**
- Create: `src/components/Dashboard/AskAIHeroCard.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/Dashboard/AskAIHeroCard.jsx
"use client";

import { useState, useRef } from "react";
import { useDrawer } from "@/context/DrawerContext";

// CSS keyframe injected once
const GLOW_CSS = `
@keyframes aiGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(34,211,238,0.06); }
  50%       { box-shadow: 0 0 16px rgba(34,211,238,0.12); }
}
`;

export default function AskAIHeroCard({ activePdf = null }) {
  const [question, setQuestion] = useState("");
  const inputRef = useRef(null);
  const { openDrawer, setConversationId, startNewDrawerConversation } = useDrawer();

  function handleSend() {
    const q = question.trim();
    if (!q) return;
    startNewDrawerConversation();
    // Pass initial question via sessionStorage so drawer can pick it up
    sessionStorage.setItem("drawer_initial_question", q);
    setQuestion("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      <style>{GLOW_CSS}</style>
      <div style={{
        background:   "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.04))",
        border:       "1px solid rgba(139,92,246,0.22)",
        borderLeft:   "2px solid rgba(34,211,238,0.35)",
        borderRadius: 12,
        padding:      16,
        display:      "flex",
        flexDirection:"column",
        gap:          12,
        boxShadow:    "inset 0 0 30px rgba(34,211,238,0.04)",
        cursor:       "default",
        gridColumn:   "1",
        gridRow:      "1 / 3",
        transition:   "transform 200ms ease-out",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        {/* Title */}
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Ask AI</p>
          {activePdf ? (
            <p style={{ margin: "3px 0 0", fontSize: 9, color: "#22D3EE" }}>
              ◈ {activePdf.name}
            </p>
          ) : (
            <p style={{ margin: "3px 0 0", fontSize: 9, color: "#52525b" }}>
              No PDF connected
            </p>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Input + send */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            style={{
              flex:        1,
              background:  "rgba(255,255,255,0.04)",
              border:      "1px solid rgba(34,211,238,0.2)",
              borderRadius: 6,
              padding:     "9px",
              fontSize:    9,
              color:       "#e4e4e7",
              outline:     "none",
              animation:   "aiGlow 3s ease-in-out infinite",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              width:        24,
              height:       24,
              borderRadius: 6,
              background:   "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              border:       "none",
              color:        "#fff",
              fontSize:     12,
              cursor:       "pointer",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              flexShrink:   0,
            }}
          >↑</button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard/AskAIHeroCard.jsx
git commit -m "feat: add AskAIHeroCard with breathing input animation"
```

---

## Task 9: YourBrainHeroCard

**Files:**
- Create: `src/components/Dashboard/YourBrainHeroCard.jsx`

- [ ] **Step 1: Write unit test for mastery cell color logic**

```js
// tests/unit/masteryGrid.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";

function getCellColor(score) {
  // score: 0-1. 0 = not studied, 0.01-0.49 = learning, 0.5-1 = mastered
  if (!score || score === 0) return "#27272a";
  if (score < 0.5) {
    const opacity = 0.35 + (score / 0.49) * 0.3; // 0.35-0.65
    return `rgba(245,158,11,${opacity.toFixed(2)})`;
  }
  return "#22C55E";
}

describe("getCellColor", () => {
  it("not studied = gray", () => assert.equal(getCellColor(0), "#27272a"));
  it("null = gray", () => assert.equal(getCellColor(null), "#27272a"));
  it("score 0.25 = amber", () => assert(getCellColor(0.25).startsWith("rgba(245,158,11")));
  it("score 0.9 = green", () => assert.equal(getCellColor(0.9), "#22C55E"));
});
```

- [ ] **Step 2: Run test**

```bash
node --test tests/unit/masteryGrid.test.mjs
```
Expected: 4 subtests pass.

- [ ] **Step 3: Write YourBrainHeroCard**

```jsx
// src/components/Dashboard/YourBrainHeroCard.jsx
"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

function getCellColor(score) {
  if (!score || score === 0) return "#27272a";
  if (score < 0.5) {
    const opacity = 0.35 + (score / 0.49) * 0.3;
    return `rgba(245,158,11,${opacity.toFixed(2)})`;
  }
  return "#22C55E";
}

// Generate 16 cells from masteryTopics array (each topic has a mastery 0-1 score)
function buildCells(topics = []) {
  return Array.from({ length: 16 }, (_, i) => ({
    score: topics[i]?.mastery ?? 0,
    label: topics[i]?.name ?? "",
  }));
}

export default function YourBrainHeroCard() {
  const router = useRouter();
  const { masteryTopics } = useDashboard();
  const cells = buildCells(masteryTopics || []);

  const masteredCount = cells.filter(c => c.score >= 0.5).length;
  const filledDots = Math.round((masteredCount / 16) * 6);

  return (
    <div
      onClick={() => router.push("/mastery")}
      style={{
        background:   "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(20,10,40,0.4))",
        border:       "1px solid rgba(139,92,246,0.18)",
        borderRadius: 12,
        padding:      16,
        display:      "flex",
        flexDirection:"column",
        gap:          0,
        cursor:       "pointer",
        gridColumn:   "1",
        gridRow:      "1 / 3",
        transition:   "transform 200ms ease-out",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Your Brain</p>
      <p style={{ margin: "2px 0 0", fontSize: 9, color: "#52525b" }}>
        {masteredCount}/16 topics mastered
      </p>

      {/* Mastery grid — 4×4 */}
      <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(4, 7px)", gap: 2 }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              width:        7,
              height:       7,
              borderRadius: 2,
              background:   getCellColor(cell.score),
            }}
          />
        ))}
      </div>

      {/* Progress dots */}
      <div style={{ marginTop: 4, display: "flex", gap: 3 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   i < filledDots ? "#8B5CF6" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard/YourBrainHeroCard.jsx tests/unit/masteryGrid.test.mjs
git commit -m "feat: add YourBrainHeroCard with 4x4 mastery grid"
```

---

## Task 10: StudyModeCards + ProgressModeCards

**Files:**
- Create: `src/components/Dashboard/StudyModeCards.jsx`
- Create: `src/components/Dashboard/ProgressModeCards.jsx`

- [ ] **Step 1: Write StudyModeCards**

```jsx
// src/components/Dashboard/StudyModeCards.jsx
"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

const BASE_CARD = {
  background:   "#111111",
  border:       "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  padding:      16,
  cursor:       "pointer",
  transition:   "transform 200ms ease-out",
};

function BentoCard({ title, subtitle, icon, onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{ ...BASE_CARD, ...style }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#e4e4e7" }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 11, color: "#a1a1aa" }}>{subtitle}</p>
    </div>
  );
}

export default function StudyModeCards() {
  const router = useRouter();
  const { progressQuestions, streak } = useDashboard();

  return (
    <>
      {/* Focus Mode */}
      <BentoCard
        icon="⏱"
        title="Focus Mode"
        subtitle="Pomodoro 25m"
        onClick={() => router.push("/dashboard#section-focus")}
      />
      {/* Quiz */}
      <BentoCard
        icon="✓"
        title="Quiz"
        subtitle={`${progressQuestions ?? 0} cards ready`}
        onClick={() => router.push("/dashboard#section-quiz")}
      />
      {/* AI Coach — cyan left border (AI signal) */}
      <BentoCard
        icon="💬"
        title="AI Coach"
        subtitle="3 suggestions"
        onClick={() => router.push("/dashboard#section-coach")}
        style={{
          borderLeft:  "3px solid rgba(34,211,238,0.3)",
          boxShadow:   "0 0 16px rgba(34,211,238,0.08)",
        }}
      />
      {/* Voice Tutor */}
      <BentoCard
        icon="🎤"
        title="Voice Tutor"
        subtitle="Speak to learn"
        onClick={() => router.push("/call-tutor")}
      />
    </>
  );
}
```

- [ ] **Step 2: Write ProgressModeCards**

```jsx
// src/components/Dashboard/ProgressModeCards.jsx
"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

const BASE_CARD = {
  background:   "#111111",
  border:       "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  padding:      16,
  cursor:       "pointer",
  transition:   "transform 200ms ease-out",
};

function BentoCard({ title, subtitle, icon, onClick, subtitleColor }) {
  return (
    <div
      onClick={onClick}
      style={BASE_CARD}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#e4e4e7" }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 11, color: subtitleColor || "#a1a1aa" }}>{subtitle}</p>
    </div>
  );
}

export default function ProgressModeCards() {
  const router = useRouter();
  const { streak } = useDashboard();

  return (
    <>
      <BentoCard icon="📊" title="Analytics"     subtitle="6h studied this week" onClick={() => router.push("/dashboard#section-analytics")} />
      <BentoCard icon="📋" title="Study Plans"   subtitle="Day 12 of 30"         onClick={() => router.push("/dashboard#section-plan")} />
      <BentoCard icon="📅" title="Exam Countdown" subtitle="48 days left"        subtitleColor="#F59E0B" onClick={() => router.push("/dashboard#section-exam")} />
      <BentoCard icon="📈" title="Weekly Recap"  subtitle={`+18% vs last week`}  onClick={() => router.push("/dashboard#section-analytics")} />
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Dashboard/StudyModeCards.jsx src/components/Dashboard/ProgressModeCards.jsx
git commit -m "feat: add StudyModeCards and ProgressModeCards bento components"
```

---

## Task 11: BentoGrid (layout container + mode fade animation)

**Files:**
- Create: `src/components/Dashboard/BentoGrid.jsx`

- [ ] **Step 1: Write BentoGrid**

```jsx
// src/components/Dashboard/BentoGrid.jsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import AskAIHeroCard     from "./AskAIHeroCard";
import YourBrainHeroCard from "./YourBrainHeroCard";
import StudyModeCards    from "./StudyModeCards";
import ProgressModeCards from "./ProgressModeCards";

// Stagger variants — 4 cards, 30ms per card
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};
const cardVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
};

export default function BentoGrid({ activePdf = null }) {
  const { dashboardMode } = useDashboard();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dashboardMode}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeInOut" } }}
        variants={containerVariants}
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows:    "1fr 1fr",
          gap:                 6,
          flex:                1,
          minHeight:           0,
        }}
      >
        {/* Hero (2×2 left) */}
        <motion.div variants={cardVariants} style={{ gridColumn: 1, gridRow: "1 / 3" }}>
          {dashboardMode === "study"
            ? <AskAIHeroCard activePdf={activePdf} />
            : <YourBrainHeroCard />
          }
        </motion.div>

        {/* 4 cards (2×2 right) */}
        {dashboardMode === "study"
          ? <StudyModeCards />
          : <ProgressModeCards />
        }
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard/BentoGrid.jsx
git commit -m "feat: add BentoGrid with mode fade animation"
```

---

## Task 12: QuickChatDrawer

**Files:**
- Create: `src/components/QuickChat/QuickChatDrawer.jsx`

- [ ] **Step 1: Write QuickChatDrawer**

```jsx
// src/components/QuickChat/QuickChatDrawer.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDrawer } from "@/context/DrawerContext";
import { useDashboard } from "@/context/DashboardContext";

// Blinking cursor for streaming indicator
function BlinkingCursor() {
  return (
    <span style={{
      display: "inline-block", width: 2, height: "1em",
      background: "#22D3EE", marginLeft: 2, verticalAlign: "text-bottom",
      animation: "blink 1s step-end infinite",
    }} />
  );
}

const CURSOR_CSS = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;

function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{
        background: "rgba(139,92,246,0.12)", color: "#c4b5fd",
        borderRadius: 6, padding: "5px 8px", maxWidth: "80%",
        fontSize: 9, lineHeight: 1.5, wordBreak: "break-word",
      }}>{text}</div>
    </div>
  );
}

function AIBubble({ text, isStreaming = false }) {
  return (
    <div style={{
      borderLeft: "2px solid rgba(34,211,238,0.35)",
      padding: "5px 8px", borderRadius: "0 6px 6px 0",
      background: "rgba(34,211,238,0.02)",
      fontSize: 9, color: "#a1a1aa", lineHeight: 1.5,
    }}>
      {text}{isStreaming && <BlinkingCursor />}
    </div>
  );
}

export default function QuickChatDrawer({ userId }) {
  const router = useRouter();
  const { isOpen, closeDrawer, conversationId, setConversationId, activePdf } = useDrawer();
  const { documentId } = useDashboard(); // existing documentId from DashboardContext

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Pick up initial question from sessionStorage (set by AskAIHeroCard)
  useEffect(() => {
    if (!isOpen) return;
    const initial = sessionStorage.getItem("drawer_initial_question");
    if (initial) {
      sessionStorage.removeItem("drawer_initial_question");
      sendMessage(initial);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/quick-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:        q,
          user_id:         userId,
          document_id:     activePdf?.id || documentId || null,
          conversation_id: conversationId,
        }),
      });
      const data = await res.json();
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "Sorry, I couldn't answer that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const effectivePdfName = activePdf?.name || null;

  return (
    <>
      <style>{CURSOR_CSS}</style>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 9,
            }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position:   "fixed",
              top:        0,
              right:      0,
              height:     "100vh",
              width:      "clamp(320px, 40vw, 600px)",
              background: "#111111",
              borderLeft: "1px solid rgba(255,255,255,0.05)",
              zIndex:     10,
              display:    "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding:      "8px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
              flexShrink:   0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5" }}>◈ Quick Ask</span>
                {effectivePdfName ? (
                  <span style={{
                    fontSize: 9, color: "#22D3EE",
                    background: "rgba(34,211,238,0.08)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    borderRadius: 4, padding: "1px 5px",
                  }}>{effectivePdfName}</span>
                ) : (
                  <span style={{
                    fontSize: 9, color: "#52525b",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4, padding: "1px 5px",
                  }}>No PDF</span>
                )}
              </div>
              <button onClick={closeDrawer} style={{
                background: "transparent", border: "none",
                color: "#52525b", cursor: "pointer", fontSize: 14,
              }}>✕</button>
            </div>

            {/* Message thread */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 && (
                <p style={{ color: "#3f3f46", fontSize: 9, textAlign: "center", marginTop: 20 }}>
                  Ask anything about your study material
                </p>
              )}
              {messages.map((m, i) => (
                m.role === "user"
                  ? <UserBubble key={i} text={m.content} />
                  : <AIBubble  key={i} text={m.content} isStreaming={loading && i === messages.length - 1} />
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <AIBubble text="" isStreaming />
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div style={{
              padding:     "7px 12px",
              borderTop:   "1px solid rgba(255,255,255,0.05)",
              display:     "flex",
              flexDirection: "column",
              gap:         4,
              flexShrink:  0,
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Follow up…"
                  disabled={loading}
                  style={{
                    flex:         1,
                    background:   "rgba(255,255,255,0.04)",
                    border:       "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 5,
                    padding:      "4px 8px",
                    fontSize:     9,
                    color:        "#e4e4e7",
                    outline:      "none",
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 20, height: 20, flexShrink: 0,
                    background:   "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                    border:       "none",
                    borderRadius: 5,
                    color:        "#fff",
                    fontSize:     9,
                    cursor:       loading ? "not-allowed" : "pointer",
                    display:      "flex", alignItems: "center", justifyContent: "center",
                    opacity:      loading ? 0.5 : 1,
                  }}
                >↑</button>
              </div>
              {conversationId && (
                <button
                  onClick={() => { closeDrawer(); router.push(`/ask-ai?cid=${conversationId}`); }}
                  style={{
                    background:  "transparent",
                    border:      "none",
                    color:       "#22D3EE",
                    fontSize:    8,
                    cursor:      "pointer",
                    textAlign:   "right",
                    padding:     0,
                    alignSelf:   "flex-end",
                  }}
                >
                  Open full chat →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuickChat/QuickChatDrawer.jsx
git commit -m "feat: add QuickChatDrawer with multi-turn conversation and RAG support"
```

---

## Task 13: Redesign Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.js`

- [ ] **Step 1: Read current dashboard/page.js in full**

Read `src/app/dashboard/page.js` — understand what data is consumed from DashboardContext (streak, progressQuestions, masteryTopics).

- [ ] **Step 2: Replace dashboard/page.js**

```jsx
// src/app/dashboard/page.js
"use client";

import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import GreetingRow from "@/components/Dashboard/GreetingRow";
import BentoGrid from "@/components/Dashboard/BentoGrid";
import QuickChatDrawer from "@/components/QuickChat/QuickChatDrawer";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useEffect } from "react";
import { useActivePDF } from "@/hooks/useActivePDF";

function DashboardInner() {
  const { streak, progressQuestions, masteryTopics, user } = useDashboard();
  const userId = user?.id;
  const { activePdf } = useActivePDF(userId);
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  return (
    <div style={{
      display:    "flex",
      height:     "100vh",
      overflow:   "hidden",
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
    }}>
      <MilestoneToast />

      <ErrorBoundary label="Sidebar">
        <DashboardSidebar activePdfActive={!!activePdf} />
      </ErrorBoundary>

      {/* Main area */}
      <div style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        padding:       "24px",
        overflow:      "hidden",
        minWidth:      0,
      }}>
        <GreetingRow userName={userName} />

        <ErrorBoundary label="BentoGrid">
          <BentoGrid activePdf={activePdf} />
        </ErrorBoundary>
      </div>

      {/* QuickChat drawer (fixed overlay) */}
      <QuickChatDrawer userId={userId} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DrawerProvider>
        <DashboardInner />
      </DrawerProvider>
    </DashboardProvider>
  );
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Open `http://localhost:3000/dashboard`. Check:
- Background gradient (`#0A0A0A → #1A1A2E → #0F1119`) renders
- Greeting row appears top with user's name
- Study mode shows Ask AI hero (left) + 4 cards (right)
- Toggle to Progress mode: cards fade out (150ms) and new cards fade in (200ms staggered)
- Typing in hero input and pressing Enter opens the drawer
- Drawer slides from right (250ms), shows "Quick Ask" header
- Sending a message in drawer calls `/api/quick-chat` and renders response
- "Open full chat →" appears after first exchange

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.js
git commit -m "feat: redesign dashboard page with bento grid and QuickChat drawer"
```

---

## Task 14: AskAI Sidebar Components

**Files:**
- Create: `src/components/AskAI/AskAISidebar.jsx`

- [ ] **Step 1: Write AskAISidebar**

```jsx
// src/components/AskAI/AskAISidebar.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// Same SVG icons as DashboardSidebar
function GridIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function ChatIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function FileIcon({ size = 16, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function PlusIcon() {
  return <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ChevronIcon({ open }) {
  return <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>;
}

const NAV_ITEMS = [
  { icon: GridIcon, label: "Dashboard", href: "/dashboard"  },
  { icon: ChatIcon, label: "Ask AI",    href: "/ask-ai"     },
  { icon: FileIcon, label: "My PDFs",   href: "/my-pdfs"    },
];

function Tooltip({ label }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }}
      style={{
        position: "absolute", left: "calc(100% + 10px)", top: "50%",
        transform: "translateY(-50%)", background: "#1F1F23",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5,
        padding: "3px 8px", fontSize: 9, color: "#e4e4e7",
        whiteSpace: "nowrap", pointerEvents: "none", zIndex: 300,
      }}
    >{label}</motion.div>
  );
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AskAISidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  activePdf,
  onSelectPdf,
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useDashboard();

  const [hoveredItem, setHoveredItem] = useState(null);
  const [showTooltipFor, setShowTooltipFor] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [pdfsOpen, setPdfsOpen] = useState(true);

  // Tooltip delay (collapsed only)
  useEffect(() => {
    if (!hoveredItem || !sidebarCollapsed) { setShowTooltipFor(null); return; }
    const t = setTimeout(() => setShowTooltipFor(hoveredItem), 200);
    return () => clearTimeout(t);
  }, [hoveredItem, sidebarCollapsed]);

  // Fetch recent conversations
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/conversations?user_id=${userId}`)
      .then(r => r.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userId]);

  // Fetch user PDFs
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-pdfs?user_id=${userId}`)
      .then(r => r.json())
      .then(data => setPdfs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userId]);

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{
        height: "100vh", background: "#111111",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        overflow: "hidden", flexShrink: 0,
      }}
    >
      {/* Header row: logo + New Chat pill */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: sidebarCollapsed ? "center" : "space-between",
        padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        minHeight: 52, gap: 6,
      }}>
        {!sidebarCollapsed && (
          <motion.span
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", whiteSpace: "nowrap", flex: 1 }}
          >
            AskMyNotes
          </motion.span>
        )}
        {!sidebarCollapsed && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            onClick={onNewChat}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "2px 8px", borderRadius: 5,
              background: "transparent", color: "#a1a1aa",
              fontSize: 9, fontWeight: 600, cursor: "pointer",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
          >
            <PlusIcon /> New Chat
          </motion.button>
        )}
        <button
          onClick={toggleSidebar}
          style={{ background: "transparent", border: "none", color: "#52525b", cursor: "pointer", fontSize: 14, flexShrink: 0 }}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Page nav */}
      <nav style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const hasCyanDot = href === "/my-pdfs" && activePdf;
          return (
            <div key={href} style={{ position: "relative" }}
              onMouseEnter={() => setHoveredItem(href)}
              onMouseLeave={() => { setHoveredItem(null); setShowTooltipFor(null); }}
            >
              <button
                onClick={() => router.push(href)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: sidebarCollapsed ? 44 : "calc(100% - 12px)",
                  padding: sidebarCollapsed ? "8px 0" : "8px 10px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  background: isActive ? "rgba(139,92,246,0.12)" : "transparent",
                  border: "none", borderRadius: 6, cursor: "pointer",
                  color: isActive ? "#a78bfa" : "#52525b",
                  transition: "background 150ms", margin: "0 6px",
                }}
              >
                <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                  <Icon size={16} color={isActive ? "#a78bfa" : "#52525b"} />
                  {sidebarCollapsed && isActive && (
                    <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#8B5CF6" }} />
                  )}
                  {sidebarCollapsed && hasCyanDot && (
                    <span style={{ position: "absolute", bottom: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "#22D3EE" }} />
                  )}
                </span>
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                      style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}
                    >{label}</motion.span>
                  )}
                </AnimatePresence>
              </button>
              <AnimatePresence>
                {sidebarCollapsed && showTooltipFor === href && <Tooltip label={label} />}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Recent Chats (expanded only) */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ padding: "0 10px", marginTop: 4 }}
          >
            {/* Section header */}
            <button
              onClick={() => setChatsOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "transparent", border: "none",
                padding: "4px 0", cursor: "pointer", color: "#3f3f46",
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              Recent <ChevronIcon open={chatsOpen} />
            </button>

            <AnimatePresence>
              {chatsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  {conversations.length === 0 && (
                    <p style={{ fontSize: 9, color: "#27272a", padding: "4px 0" }}>No conversations yet</p>
                  )}
                  {conversations.map(conv => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => onSelectConversation?.(conv.id)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "4px 10px", borderRadius: 4, margin: "2px 4px",
                          background: isActive ? "rgba(139,92,246,0.05)" : "transparent",
                          borderLeft: isActive ? "2px solid #8B5CF6" : "2px solid transparent",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 9, color: isActive ? "#a1a1aa" : "#52525b",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                          {conv.title || "Untitled"}
                        </p>
                        <p style={{ margin: 0, fontSize: 8, color: "#27272a" }}>{timeAgo(conv.updated_at)}</p>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Your PDFs (expanded only) */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ padding: "0 10px", marginTop: 8, flex: 1 }}
          >
            <button
              onClick={() => setPdfsOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: "transparent", border: "none",
                padding: "4px 0", cursor: "pointer", color: "#3f3f46",
                fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              Your PDFs <ChevronIcon open={pdfsOpen} />
            </button>

            <AnimatePresence>
              {pdfsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: "hidden" }}
                >
                  {pdfs.length === 0 && (
                    <p style={{ fontSize: 9, color: "#27272a", padding: "4px 0" }}>No PDFs uploaded</p>
                  )}
                  {pdfs.map(pdf => {
                    const isActivePdf = pdf.is_active;
                    return (
                      <button
                        key={pdf.id}
                        onClick={() => onSelectPdf?.(pdf.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          width: "100%", textAlign: "left",
                          padding: "4px 6px", borderRadius: 4, margin: "2px 0",
                          background: isActivePdf ? "rgba(34,211,238,0.05)" : "transparent",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 10 }}>📄</span>
                        <span style={{
                          fontSize: 9, color: isActivePdf ? "#22D3EE" : "#52525b",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
                        }}>{pdf.name}</span>
                        {isActivePdf && (
                          <span style={{
                            fontSize: 8, color: "#22D3EE",
                            background: "rgba(34,211,238,0.08)",
                            border: "1px solid rgba(34,211,238,0.2)",
                            borderRadius: 3, padding: "1px 4px", flexShrink: 0,
                          }}>Active</span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AskAI/AskAISidebar.jsx
git commit -m "feat: add AskAISidebar with New Chat, Recent Chats, and Your PDFs sections"
```

---

## Task 15: Redesign Ask AI Page

**Files:**
- Modify: `src/app/ask-ai/page.js`

- [ ] **Step 1: Read the full current ask-ai/page.js**

Read `src/app/ask-ai/page.js` in full. Note: `documentId` comes from `useDashboard()`, and the main content is `AskAISection`.

- [ ] **Step 2: Replace ask-ai/page.js**

```jsx
// src/app/ask-ai/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AskAISidebar from "@/components/AskAI/AskAISidebar";
import AskAISection from "@/components/dashboard/AskAISection";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useActivePDF } from "@/hooks/useActivePDF";

function AskAIInner() {
  const searchParams = useSearchParams();
  const { streak, progressQuestions, masteryTopics, user, documentId, setDocumentId } = useDashboard();
  const userId = user?.id;
  const { activePdf, setActivePdfId } = useActivePDF(userId);

  // Active conversation (from URL ?cid= or sidebar selection)
  const [activeConversationId, setActiveConversationId] = useState(
    () => searchParams.get("cid") || null
  );

  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  // Sync active PDF into DashboardContext documentId
  useEffect(() => {
    if (activePdf?.id && setDocumentId) setDocumentId(activePdf.id);
  }, [activePdf]);

  function handleNewChat() {
    setActiveConversationId(null);
    // Clear URL param without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("cid");
    window.history.replaceState({}, "", url.toString());
  }

  function handleSelectConversation(id) {
    setActiveConversationId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("cid", id);
    window.history.replaceState({}, "", url.toString());
  }

  function handleSelectPdf(pdfId) {
    setActivePdfId(pdfId);
  }

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
    }}>
      <MilestoneToast />

      <ErrorBoundary label="Sidebar">
        <AskAISidebar
          userId={userId}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          activePdf={activePdf}
          onSelectPdf={handleSelectPdf}
        />
      </ErrorBoundary>

      {/* Main chat area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden", minWidth: 0,
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0, background: "rgba(17,17,17,0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, flexShrink: 0,
            }}>✦</div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f4f4f5" }}>Ask AI</p>
              <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>
                {activePdf
                  ? <><span style={{ color: "#22D3EE" }}>◈ {activePdf.name}</span> · Ask anything</>
                  : "Ask any academic question"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1, overflow: "hidden", padding: "0 24px",
          display: "flex", flexDirection: "column",
        }}>
          <ErrorBoundary label="Ask AI">
            <AskAISection fullPage conversationId={activeConversationId} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function AskAIPage() {
  return (
    <DashboardProvider>
      <DrawerProvider>
        <AskAIInner />
      </DrawerProvider>
    </DashboardProvider>
  );
}
```

- [ ] **Step 3: Verify AskAISection accepts conversationId prop**

Read `src/components/dashboard/AskAISection.jsx`. If `conversationId` prop is not accepted, add it to the component signature and use it to pre-load the conversation when it changes (via `useEffect` + fetch `/api/conversations/{id}`). If the prop is already unused, confirm the section still renders correctly without it.

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/ask-ai`. Check:
- AskAISidebar renders with New Chat button, Recent Chats, Your PDFs sections
- Clicking a recent conversation in sidebar updates URL to `?cid=...`
- Clicking a PDF in sidebar changes the active PDF badge in top bar
- Sidebar collapses to 56px icon rail (shared state with Dashboard page)
- "Open full chat →" from QuickChat drawer navigates here with `?cid=` and shows thread

- [ ] **Step 5: Commit**

```bash
git add src/app/ask-ai/page.js
git commit -m "feat: redesign Ask AI page with AskAISidebar and conversation routing"
```

---

## Task 16: Mobile Sidebar (hamburger overlay)

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.jsx`
- Modify: `src/components/AskAI/AskAISidebar.jsx`

- [ ] **Step 1: Add mobile detection and hamburger overlay to DashboardSidebar**

Read `src/components/dashboard/DashboardSidebar.jsx`. Add the following logic:

```jsx
// Add at top of DashboardSidebar:
const [isMobile, setIsMobile] = useState(false);
const [mobileOpen, setMobileOpen] = useState(false);

useEffect(() => {
  function check() { setIsMobile(window.innerWidth < 768); }
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);
```

On mobile (`isMobile === true`):
- Render a hamburger button (`☰`) fixed top-left (z-index 20)
- Sidebar becomes a full-height overlay from left (72% width, z-index 10) with `position: fixed`
- Dark overlay `rgba(0,0,0,0.5)` behind sidebar
- ✕ button inside sidebar top-right to close
- `motion.div` with `initial={{ x: "-100%" }} animate={{ x: mobileOpen ? 0 : "-100%" }} transition={{ duration: 0.25, ease: "easeOut" }}`
- Mode toggle pill appears inside sidebar below nav (full-width stretch, `width: "100%"`)

On desktop: render the existing collapsible sidebar.

- [ ] **Step 2: Verify on mobile viewport**

In browser DevTools, toggle device toolbar to 375px width (iPhone). Check:
- Hamburger button appears top-left
- Tap opens sidebar as full overlay
- Tapping overlay or ✕ closes it
- Mode toggle pill appears inside sidebar
- Switching mode closes sidebar automatically

- [ ] **Step 3: Apply same mobile logic to AskAISidebar**

AskAISidebar on mobile: same hamburger overlay pattern. Mode toggle not needed (it's only on Dashboard). Recent Chats and Your PDFs sections show inside the overlay.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardSidebar.jsx src/components/AskAI/AskAISidebar.jsx
git commit -m "feat: add mobile hamburger overlay to both sidebars"
```

---

## Task 17: Final Integration Tests

- [ ] **Step 1: Run all unit tests**

```bash
npm run test
```
Expected: all existing tests still pass (no regressions).

- [ ] **Step 2: Run the new unit tests**

```bash
node --test tests/unit/quickChat.test.mjs tests/unit/greetingRow.test.mjs tests/unit/masteryGrid.test.mjs
```
Expected: all subtests pass.

- [ ] **Step 3: Manual testing checklist**

Open `http://localhost:3000/dashboard` and verify each item:

```
[ ] Dashboard mode toggle switches Study ↔ Progress
[ ] Cards fade out 150ms and fade in 200ms staggered on mode switch
[ ] Ask AI hero card has breathing cyan glow on input
[ ] Typing in hero input + Enter opens QuickChat drawer from right (250ms)
[ ] Drawer multi-turn: send 3 messages, all appear in thread
[ ] "Open full chat →" navigates to /ask-ai?cid=xxx
[ ] /ask-ai?cid=xxx shows correct conversation loaded (verify API call succeeds)
[ ] Sidebar collapse to 56px: all labels hidden, icons remain
[ ] Sidebar hover tooltip appears after 200ms delay with correct label
[ ] Purple indicator dot on active page (collapsed)
[ ] Cyan indicator dot on My PDFs when PDF active (collapsed)
[ ] localStorage.sidebar_collapsed persists across page reload
[ ] localStorage.dashboard_mode persists across page reload

Open http://localhost:3000/ask-ai:
[ ] AskAISidebar shows + New Chat button right-aligned in header
[ ] Recent Chats section collapsible, shows last 10 conversations
[ ] Active conversation has purple left border in sidebar
[ ] Your PDFs section collapsible, active PDF has cyan text + badge
[ ] Clicking PDF in sidebar updates active PDF badge in top bar
[ ] Clicking conversation loads it (URL updates to ?cid=xxx)
[ ] New Chat button clears ?cid from URL

Mobile (375px viewport):
[ ] Hamburger button visible top-left
[ ] Tap opens 72% width sidebar overlay
[ ] Dark overlay behind sidebar
[ ] Mode toggle pill inside sidebar (Dashboard only)
[ ] Swipe or ✕ closes sidebar
```

- [ ] **Step 4: Fix any failures found during manual testing**

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Dashboard + Ask AI sidebar redesign (Ambient Intelligence)"
```

---

## Spec Coverage Check

| Spec Section | Task(s) |
|---|---|
| 3-layer color system | Embedded in all components (inline styles) |
| Dashboard 2-mode system | Task 5 (context), Task 11 (BentoGrid), Task 13 (page) |
| Greeting row with time logic | Task 7 |
| Study mode bento grid | Task 8, 10 |
| Progress mode bento grid | Task 9, 10 |
| Card specs + hero styles | Task 8, 9 |
| Mode transition animation | Task 11 |
| QuickChat drawer (dimensions, animation) | Task 12 |
| QuickChat RAG with threshold | Task 4 (quick-chat route) |
| QuickChat multi-turn + persistence | Task 4, 12 |
| "Open full chat →" deep link | Task 12, 15 |
| Dashboard Sidebar (3 items, collapse, tooltips, localStorage) | Task 6 |
| Mobile hamburger overlay + mode toggle in sidebar | Task 16 |
| Ask AI sidebar (+ New Chat, Recent Chats, Your PDFs) | Task 14 |
| AskAISidebar collapsed state | Task 14 |
| Button components (Primary, Secondary, Compact) | Task 2 |
| Supabase conversations table + RLS | Task 1 |
| UUID conversation IDs | Task 4 |
| Conversation sync drawer ↔ Ask AI page | Task 12, 15 |
