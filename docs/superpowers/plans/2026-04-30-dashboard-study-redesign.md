# Dashboard Study Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the dashboard Study view to pixel-match the target image — 5 rich bento cards, minimal sidebar with user info, smooth Framer Motion animations, all wired to existing backend.

**Architecture:** Refactor 5 existing component files in-place. BentoGrid.jsx already has the correct 3-column grid structure — we adjust gap and row sizing. StudyModeCards.jsx is fully rebuilt with 4 self-contained rich cards (FocusModeCard, QuizCard, CallTutorCard, ExamsCard). AskAIHeroCard.jsx gets a visual redesign but keeps its existing drawer logic. DashboardSidebar.jsx gets an Upgrade-to-Pro panel and dynamic user avatar at the bottom. GreetingRow.jsx gets emoji polish only.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (inline styles for all dashboard components — matches codebase convention), Framer Motion 12, Supabase (existing client), DashboardContext (existing React Context)

---

## File Map

| File | Change | Reason |
|------|--------|--------|
| `src/components/dashboard/BentoGrid.jsx` | Modify | Increase gap (6→16px), fix row heights (auto→1fr 1fr auto) |
| `src/components/dashboard/AskAIHeroCard.jsx` | Full rewrite | Purple gradient redesign matching image |
| `src/components/dashboard/StudyModeCards.jsx` | Full rewrite | 4 rich cards replacing the tiny link cards |
| `src/components/dashboard/DashboardSidebar.jsx` | Modify | Add Upgrade-to-Pro card + dynamic user section at bottom |
| `src/components/dashboard/GreetingRow.jsx` | Minor edit | Add wave emoji to greeting text |

**Files NOT touched:** `FocusModeSection.jsx`, `QuizSection.jsx`, `VoiceCallSection.jsx`, `ExamsHeroCard.jsx`, `ProgressLayout.jsx`, all API routes, DashboardContext.jsx

---

## Task 1: Update BentoGrid.jsx — Grid Gap and Row Heights

**Files:**
- Modify: `src/components/dashboard/BentoGrid.jsx`

- [ ] **Step 1: Open and read the current BentoGrid**

  Confirm these two sections in the file:
  1. `StudyModeSkeleton` function (lines ~52-76) — has inline `gap: 6`
  2. Main grid `motion.div` (lines ~106-120) — has `gap: 6, gridTemplateRows: "auto auto auto"`

- [ ] **Step 2: Update the skeleton grid**

  In `StudyModeSkeleton`, change:
  ```jsx
  // FROM:
  gap: 6,
  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
  gridTemplateRows: "auto auto auto",
  
  // TO:
  gap: 16,
  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
  gridTemplateRows: isMobile ? "auto" : "1fr 1fr auto",
  ```

- [ ] **Step 3: Update the real grid**

  In the main `motion.div` (the one with `key="study"`), change:
  ```jsx
  // FROM:
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
  gridTemplateRows: "auto auto auto",
  gap: 6,
  flex: 1,
  minHeight: 0,
  
  // TO:
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
  gridTemplateRows: isMobile ? "auto" : "1fr 1fr auto",
  gap: 16,
  flex: 1,
  minHeight: 0,
  ```

- [ ] **Step 4: Start dev server and verify layout**

  ```bash
  cd c:/Users/Shafi/ask-my-notes && npm run dev
  ```

  Open `http://localhost:3000/dashboard`. Confirm:
  - Cards have visible spacing between them (was too tight before)
  - AskAI takes top-left 2 columns, 2 rows
  - Focus + Quiz stack on right
  - Bottom row: small card (left) + wider card (right)

- [ ] **Step 5: Commit**

  ```bash
  cd c:/Users/Shafi/ask-my-notes
  git add src/components/dashboard/BentoGrid.jsx
  git commit -m "feat(dashboard): increase bento grid gap and fix row heights"
  ```

---

## Task 2: Redesign AskAIHeroCard.jsx — Purple Gradient Hero

**Files:**
- Modify: `src/components/dashboard/AskAIHeroCard.jsx`

**Design:** Full-height dark purple gradient card. Header (Ask AI + subtitle) top-left. Animated sparkles + "Ask anything. Get instant answers." centered. Input + send button at the bottom. Preserves existing `startNewDrawerConversation` + `handleSend` logic.

- [ ] **Step 1: Replace the entire file with this content**

  ```jsx
  // src/components/dashboard/AskAIHeroCard.jsx
  "use client";

  import { useState, useRef } from "react";
  import { motion } from "framer-motion";
  import { useDrawer } from "@/context/DrawerContext";

  export default function AskAIHeroCard({ activePdf = null }) {
    const [question, setQuestion] = useState("");
    const inputRef = useRef(null);
    const { startNewDrawerConversation } = useDrawer();

    function handleSend() {
      const q = question.trim();
      if (!q) return;
      startNewDrawerConversation();
      sessionStorage.setItem("drawer_initial_question", q);
      setQuestion("");
    }

    function handleKeyDown(e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.01, y: -2 }}
        onClick={() => inputRef.current?.focus()}
        style={{
          height: "100%",
          borderRadius: 20,
          background: "linear-gradient(160deg, #1a0533 0%, #2d1060 45%, #1a0533 100%)",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 8px 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          cursor: "text",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Ambient glow blob */}
        <div style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Arc decoration */}
        <div style={{
          position: "absolute",
          top: 60,
          right: -20,
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: "1px solid rgba(139,92,246,0.15)",
          pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>Ask AI</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6d6d80" }}>Your AI study assistant</p>
          </div>
          <div style={{ display: "flex", gap: 6, opacity: 0.55 }}>
            <span style={{ fontSize: 14, color: "#a78bfa" }}>✦</span>
            <span style={{ fontSize: 10, color: "#a78bfa", alignSelf: "flex-end", marginBottom: 2 }}>✧</span>
            <span style={{ fontSize: 16, color: "#a78bfa" }}>✦</span>
          </div>
        </div>

        {/* Center content */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "16px 8px",
          position: "relative",
          zIndex: 1,
        }}>
          <motion.div
            animate={{ opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: 22, marginBottom: 18, letterSpacing: 12, color: "#a78bfa" }}
          >
            ✦ ✧ ✦
          </motion.div>
          <p style={{
            margin: "0 0 10px",
            fontSize: 17,
            fontWeight: 700,
            color: "#f4f4f5",
            lineHeight: 1.35,
          }}>
            Ask anything. Get instant answers.
          </p>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: "#6d6d80",
            lineHeight: 1.6,
            maxWidth: 280,
          }}>
            From explanations to study guidance, I&apos;m here to help.
          </p>
        </div>

        {/* Input row */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
          onClick={e => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: 10,
              padding: "11px 14px",
              fontSize: 13,
              color: "#e4e4e7",
              outline: "none",
              transition: "border-color 200ms ease, box-shadow 200ms ease",
            }}
            onFocus={e => {
              e.target.style.borderColor = "rgba(139,92,246,0.65)";
              e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
            }}
            onBlur={e => {
              e.target.style.borderColor = "rgba(139,92,246,0.25)";
              e.target.style.boxShadow = "none";
            }}
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.93 }}
            onClick={handleSend}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              border: "none",
              color: "#fff",
              fontSize: 17,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
            }}
          >
            ↑
          </motion.button>
        </div>
      </motion.div>
    );
  }
  ```

- [ ] **Step 2: Verify in browser**

  Open `http://localhost:3000/dashboard`. Confirm:
  - AskAI card has deep purple gradient background
  - Sparkles pulse in the center
  - Input focused → purple glow border
  - Typing and pressing Enter → drawer opens with question pre-filled
  - Card hovering → slight lift animation

- [ ] **Step 3: Commit**

  ```bash
  cd c:/Users/Shafi/ask-my-notes
  git add src/components/dashboard/AskAIHeroCard.jsx
  git commit -m "feat(dashboard): redesign AskAI hero card with purple gradient and sparkle animation"
  ```

---

## Task 3: Rebuild StudyModeCards.jsx — 4 Rich Bento Cards

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx`

**What it renders (in order, as siblings in BentoGrid's CSS grid):**
1. `FocusModeCard` → auto-flows to col 3, row 1
2. `QuizCard` → auto-flows to col 3, row 2
3. `CallTutorCard` → auto-flows to col 1, row 3
4. `<div style={{ gridColumn:"span 2", height:"100%" }}>` wrapping `ExamsCard` → cols 2-3, row 3

- [ ] **Step 1: Replace the entire file with this content**

  ```jsx
  "use client";

  import { useRouter } from "next/navigation";
  import { motion } from "framer-motion";
  import { useDashboard } from "@/context/DashboardContext";

  // ── Shared constants ───────────────────────────────────────────────
  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const CARD = {
    borderRadius: 20,
    background: "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
  };

  const ENTRY = (delay) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  });

  // ── Focus Mode Card ────────────────────────────────────────────────
  function FocusModeCard() {
    const router = useRouter();
    const { timeLeft, isBreak } = useDashboard();

    const totalSecs = isBreak ? 5 * 60 : 25 * 60;
    const secs = timeLeft ?? 25 * 60;
    const dashOffset = CIRCUMFERENCE * (1 - secs / totalSecs);
    const mm = Math.floor(secs / 60).toString().padStart(2, "0");
    const ss = (secs % 60).toString().padStart(2, "0");
    const stroke = "#22d3ee";

    return (
      <motion.div
        {...ENTRY(0.08)}
        whileHover={{ scale: 1.03, y: -3, boxShadow: "0 0 40px rgba(34,211,238,0.15)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/focus")}
        style={CARD}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: "rgba(34,211,238,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>Focus Mode</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6d6d80" }}>Pomodoro 25m</p>
          </div>
        </div>

        {/* Timer ring */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 96, height: 96 }}>
            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="48" cy="48" r={RADIUS}
                fill="none" stroke={stroke}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                style={{ filter: `drop-shadow(0 0 5px ${stroke})` }}
              />
            </svg>
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: "#f4f4f5", letterSpacing: "-0.5px" }}>
                {mm}:{ss}
              </span>
              <span style={{ fontSize: 9, color: "#6d6d80", marginTop: 1 }}>Start focus</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Quiz Card ──────────────────────────────────────────────────────
  function QuizCard() {
    const router = useRouter();
    const { progressQuestions } = useDashboard();
    const count = progressQuestions ?? 0;

    return (
      <motion.div
        {...ENTRY(0.16)}
        whileHover={{ scale: 1.03, y: -3, boxShadow: "0 0 40px rgba(139,92,246,0.2)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/quiz")}
        style={CARD}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>Quiz</p>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid rgba(139,92,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {/* Stacked cards icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
          </div>
        </div>

        {/* Count */}
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingTop: 10 }}>
          <div>
            <motion.p
              key={count}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#f4f4f5", lineHeight: 1 }}
            >
              {count}
            </motion.p>
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#6d6d80" }}>cards ready</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Call Tutor Card ────────────────────────────────────────────────
  function CallTutorCard() {
    const router = useRouter();

    return (
      <motion.div
        {...ENTRY(0.24)}
        whileHover={{ scale: 1.03, y: -3, boxShadow: "0 0 40px rgba(34,197,94,0.15)" }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/call-tutor")}
        style={CARD}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: "rgba(34,197,94,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>Call Tutor</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6d6d80" }}>Speak to learn</p>
          </div>
        </div>

        {/* Beta badge */}
        <div style={{
          display: "inline-block",
          padding: "2px 9px",
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.22)",
          borderRadius: 20,
          fontSize: 9,
          color: "#22c55e",
          fontWeight: 700,
          marginBottom: 10,
          alignSelf: "flex-start",
        }}>
          Beta
        </div>

        {/* Pulsing mic */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative" }}>
            {/* Outer pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: -14,
                borderRadius: "50%",
                border: "2px solid rgba(34,197,94,0.3)",
              }}
            />
            {/* Inner pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.05, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
              style={{
                position: "absolute",
                inset: -7,
                borderRadius: "50%",
                border: "2px solid rgba(34,197,94,0.4)",
              }}
            />
            {/* Mic circle */}
            <div style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))",
              border: "2px solid rgba(34,197,94,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="11" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </div>
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={e => { e.stopPropagation(); router.push("/call-tutor"); }}
          style={{
            width: "100%",
            padding: "9px",
            background: "transparent",
            border: "1px solid rgba(34,197,94,0.22)",
            borderRadius: 10,
            color: "#22c55e",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            marginTop: 10,
            transition: "all 200ms ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(34,197,94,0.08)";
            e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(34,197,94,0.22)";
          }}
        >
          Start a session →
        </button>
      </motion.div>
    );
  }

  // ── Exams Card ─────────────────────────────────────────────────────
  function ExamsCard() {
    const router = useRouter();
    const { activeExams = [] } = useDashboard();

    const nextExam = activeExams.length > 0
      ? [...activeExams].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0]
      : null;

    const daysLeft = nextExam?.exam_date
      ? Math.ceil((new Date(nextExam.exam_date + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const isFinalSprint = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
    const syllabus = nextExam?.syllabus_progress ?? 0;
    const subjectsDone = nextExam?.subjects_completed ?? 0;
    const totalSubjects = nextExam?.total_subjects ?? 0;

    return (
      <motion.div
        {...ENTRY(0.32)}
        whileHover={{ scale: 1.015, y: -3 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => router.push("/exams")}
        style={{
          ...CARD,
          background: isFinalSprint
            ? "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(15,23,42,0.95))"
            : "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          border: isFinalSprint
            ? "1px solid rgba(239,68,68,0.2)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: isFinalSprint
            ? "0 8px 40px rgba(239,68,68,0.12)"
            : "0 8px 30px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: "rgba(239,68,68,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f4f4f5" }}>Exams</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6d6d80", lineHeight: 1.35 }}>
                Track upcoming exams and focus on weak areas
              </p>
            </div>
          </div>

          {/* Final sprint badge */}
          {isFinalSprint && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                padding: "3px 10px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.28)",
                borderRadius: 20,
                fontSize: 10,
                color: "#ef4444",
                fontWeight: 700,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Final sprint! 🔥
            </motion.div>
          )}
        </div>

        {/* Exam countdown row */}
        {nextExam ? (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#6d6d80" }}>
                {nextExam.name || "Exam"}
              </p>
              <p style={{
                margin: "3px 0 0",
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1,
                color: isFinalSprint ? "#ef4444" : "#f4f4f5",
              }}>
                {daysLeft <= 0 ? "Today!" : daysLeft}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 10, color: "#6d6d80" }}>days left</p>
              {isFinalSprint && (
                <p style={{ margin: "3px 0 0", fontSize: 10, color: "#ef4444", fontWeight: 600 }}>
                  Final sprint!
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>
              No upcoming exams — add one on the Exams page
            </p>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { value: nextExam ? `${syllabus}%` : "—", label: "Syllabus", color: "#22c55e" },
            {
              value: nextExam && totalSubjects > 0
                ? `${subjectsDone}/${totalSubjects}`
                : nextExam ? "—" : "—",
              label: "Subjects",
              color: "#a78bfa",
            },
            { value: "—", label: "Mock Tests", color: "#71717a" },
          ].map(({ value, label, color }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8,
              padding: "8px 10px",
              textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color }}>{value}</p>
              <p style={{ margin: "3px 0 0", fontSize: 9, color: "#52525b" }}>{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Main export ────────────────────────────────────────────────────
  export default function StudyModeCards() {
    return (
      <>
        <FocusModeCard />
        <QuizCard />
        <CallTutorCard />
        {/* Exams spans 2 columns of the bottom row */}
        <div style={{ gridColumn: "span 2", height: "100%" }}>
          <ExamsCard />
        </div>
      </>
    );
  }
  ```

- [ ] **Step 2: Verify all 4 cards in browser**

  Confirm each card:
  - **FocusModeCard**: Circular ring with MM:SS time — click → navigates to `/focus`
  - **QuizCard**: Shows card count (number from context), click → `/quiz`
  - **CallTutorCard**: Pulsing mic animation, "Start a session →" button, click → `/call-tutor`
  - **ExamsCard**: Shows next exam or "No upcoming exams", stats row, click → `/exams`
  - Exams card spans 2 columns in bottom row ✓
  - Hover animations work on all cards ✓

- [ ] **Step 3: Commit**

  ```bash
  cd c:/Users/Shafi/ask-my-notes
  git add src/components/dashboard/StudyModeCards.jsx
  git commit -m "feat(dashboard): rebuild StudyModeCards with 4 rich bento cards matching target design"
  ```

---

## Task 4: Update DashboardSidebar.jsx — Add Upgrade Panel + User Section

**Files:**
- Modify: `src/components/dashboard/DashboardSidebar.jsx`

**Changes:**
1. Add `getInitials` helper function
2. Add `UserSection` component (avatar + name + email, collapsed shows just avatar)
3. Add `UpgradePro` component (card with crown icon, upgrade button)
4. Add `user` to `useDashboard()` destructuring in main component
5. Render `UpgradePro` + `UserSection` at the bottom of the desktop sidebar
6. Render same bottom section in mobile sidebar drawer

- [ ] **Step 1: Add helpers and sub-components after the existing `Tooltip` function (around line 197)**

  Insert these 3 additions immediately after the closing brace of the `Tooltip` function (~line 224):

  ```jsx
  // ── Initials from full name or email ──────────────────────────────
  function getInitials(nameOrEmail = "") {
    const words = nameOrEmail.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return nameOrEmail.slice(0, 2).toUpperCase();
  }

  // ── User avatar section ───────────────────────────────────────────
  function UserSection({ user, collapsed }) {
    const fullName = user?.user_metadata?.full_name || "";
    const email    = user?.email || "";
    const display  = fullName || email.split("@")[0] || "User";
    const initials = getInitials(fullName || email);

    const avatar = (
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: "#fff",
      }}>
        {initials}
      </div>
    );

    if (collapsed) {
      return (
        <div style={{
          padding: "8px 0",
          display: "flex",
          justifyContent: "center",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {avatar}
        </div>
      );
    }

    return (
      <div style={{
        padding: "10px 10px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}>
        {avatar}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 600, color: "#e4e4e7",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {display}
          </p>
          <p style={{
            margin: "1px 0 0", fontSize: 9, color: "#52525b",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {email}
          </p>
        </div>
        <button style={{
          background: "transparent", border: "none",
          color: "#3f3f46", cursor: "pointer", fontSize: 14,
          padding: "2px 4px", flexShrink: 0,
        }}>⋯</button>
      </div>
    );
  }

  // ── Upgrade to Pro card ───────────────────────────────────────────
  function UpgradePro({ router, collapsed }) {
    if (collapsed) return null;
    return (
      <div style={{
        margin: "0 8px 8px",
        padding: "12px",
        background: "rgba(139,92,246,0.07)",
        border: "1px solid rgba(139,92,246,0.18)",
        borderRadius: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 12 }}>👑</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#f4f4f5" }}>Upgrade to Pro</span>
        </div>
        <p style={{
          margin: "0 0 10px", fontSize: 10, color: "#71717a", lineHeight: 1.45,
        }}>
          Unlock unlimited AI, PDFs and advanced features.
        </p>
        <button
          onClick={() => router.push("/pricing")}
          style={{
            width: "100%",
            padding: "7px",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "none",
            borderRadius: 7,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            transition: "opacity 150ms ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Upgrade Now →
        </button>
      </div>
    );
  }
  ```

- [ ] **Step 2: Add `user` to useDashboard destructuring in the main DashboardSidebar component**

  Find this line (around line 294-297):
  ```jsx
  const { sidebarCollapsed, toggleSidebar } = useDashboard();
  ```

  Change to:
  ```jsx
  const { sidebarCollapsed, toggleSidebar, user } = useDashboard();
  ```

- [ ] **Step 3: Add bottom section to desktop sidebar**

  Find the desktop sidebar's inner wrapper `<div>` closing area (around line 419-431). Currently it ends with:
  ```jsx
        {/* Inner wrapper — clips content during collapse animation */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <SidebarHeader collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          <NavItems
            pathname={pathname} router={router}
            sidebarCollapsed={sidebarCollapsed}
            hoveredItem={hoveredItem}
            setHoveredItem={setHoveredItem} showTooltipFor={showTooltipFor}
            setShowTooltipFor={setShowTooltipFor}
          />
        </div>
  ```

  Add the bottom section INSIDE the inner wrapper div, after `<NavItems ... />` and before the closing `</div>`:
  ```jsx
          {/* Bottom: Upgrade + User */}
          <div style={{ marginTop: "auto" }}>
            <UpgradePro router={router} collapsed={sidebarCollapsed} />
            <UserSection user={user} collapsed={sidebarCollapsed} />
          </div>
  ```

- [ ] **Step 4: Add bottom section to mobile sidebar**

  Find the mobile sidebar, specifically the section after `<NavItems ... onItemClick={() => setMobileOpen(false)} />` and before `{/* Progress nav shortcut */}`. Replace the "Progress nav shortcut" block with:
  ```jsx
          {/* Bottom: Upgrade + User */}
          <div style={{ marginTop: "auto", paddingBottom: 4 }}>
            <UpgradePro router={router} collapsed={false} />
            <UserSection user={user} collapsed={false} />
          </div>
  ```

  (Remove the old "View Progress →" button block entirely.)

- [ ] **Step 5: Verify in browser**

  Open `http://localhost:3000/dashboard`. Confirm:
  - Desktop expanded sidebar: shows "Upgrade to Pro" card + user avatar + name + email at bottom
  - Desktop collapsed sidebar: shows only user avatar (initials) at bottom, no upgrade card
  - Mobile sidebar drawer: shows upgrade card + user section at bottom
  - User name and email match the logged-in account
  - "Upgrade Now →" click navigates to `/pricing`
  - Initials circle shows correct first 2 letters (e.g. "HS" for Harsh Sharma)

- [ ] **Step 6: Commit**

  ```bash
  cd c:/Users/Shafi/ask-my-notes
  git add src/components/dashboard/DashboardSidebar.jsx
  git commit -m "feat(dashboard): add Upgrade-to-Pro panel and dynamic user section to sidebar"
  ```

---

## Task 5: Polish GreetingRow.jsx — Add Emoji to Greeting

**Files:**
- Modify: `src/components/dashboard/GreetingRow.jsx`

- [ ] **Step 1: Update the `getGreeting` function**

  Find this block (lines 6-11):
  ```jsx
  function getGreeting(hour) {
    if (hour >= 21 || hour < 5)  return { heading: "Studying late?",    subtext: "Stay consistent. You're closer than you think." };
    if (hour >= 5  && hour < 12) return { heading: "Good morning",       subtext: "Ready to study?" };
    if (hour >= 12 && hour < 17) return { heading: "Good afternoon",     subtext: "Ready to study?" };
    return                               { heading: "Good evening",       subtext: "Ready to study?" };
  }
  ```

  Replace with:
  ```jsx
  function getGreeting(hour) {
    if (hour >= 21 || hour < 5)  return { heading: "Studying late? 🌙",   subtext: "Stay consistent. You're closer than you think." };
    if (hour >= 5  && hour < 12) return { heading: "Good morning 👋",      subtext: "Ready to study?" };
    if (hour >= 12 && hour < 17) return { heading: "Good afternoon 👋",    subtext: "Ready to study?" };
    return                               { heading: "Good evening 👋",      subtext: "Ready to study?" };
  }
  ```

- [ ] **Step 2: Update SSR default**

  Find (line 13):
  ```jsx
  const SSR_DEFAULT = { heading: "Good morning", subtext: "Ready to study?" };
  ```

  Replace with:
  ```jsx
  const SSR_DEFAULT = { heading: "Good morning 👋", subtext: "Ready to study?" };
  ```

- [ ] **Step 3: Update heading font size**

  Find (in the JSX return):
  ```jsx
  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>
  ```

  Replace with:
  ```jsx
  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>
  ```

- [ ] **Step 4: Verify in browser**

  Open `http://localhost:3000/dashboard`. Confirm:
  - Greeting shows "Good afternoon 👋" (or morning/evening based on time)
  - Study/Progress toggle still works
  - No layout shift in greeting row

- [ ] **Step 5: Commit**

  ```bash
  cd c:/Users/Shafi/ask-my-notes
  git add src/components/dashboard/GreetingRow.jsx
  git commit -m "feat(dashboard): add emoji to greeting and increase heading font size"
  ```

---

## Final Verification Checklist

After all 5 tasks are complete, verify the full dashboard:

- [ ] AskAI card: purple gradient, sparkles animate, input focuses on click, Enter/send submits query to drawer
- [ ] Focus Mode card: circular timer shows real timeLeft from context, click → `/focus`
- [ ] Quiz card: shows progressQuestions count, click → `/quiz`
- [ ] Call Tutor card: mic pulses with green rings, "Start a session →" click → `/call-tutor`
- [ ] Exams card: shows next exam + days left, Final Sprint badge appears when ≤7 days, stats row, click → `/exams`
- [ ] Exams card spans 2 columns in bottom row
- [ ] Sidebar shows "Upgrade to Pro" when expanded
- [ ] Sidebar shows logged-in user's real name + email + initials avatar
- [ ] Greeting shows emoji wave
- [ ] Study/Progress toggle still works correctly
- [ ] Cards have staggered entry animations (not all appearing at once)
- [ ] All cards have hover scale + lift animation
- [ ] Mobile: cards stack in single column, sidebar is hamburger drawer
- [ ] No TypeScript errors, no console errors

---

## Definition of Done

✅ Dashboard Study view matches target image on desktop  
✅ All 5 cards are clickable and route correctly  
✅ Ask AI submits queries to existing drawer flow  
✅ Exams shows real data + Final Sprint badge  
✅ Focus timer reads from DashboardContext  
✅ Quiz count from DashboardContext  
✅ Call Tutor mic has breathing animation  
✅ Framer Motion entry animations stagger across cards  
✅ Sidebar dynamic user info from auth  
✅ No new API routes, no new context, no TypeScript introduced
