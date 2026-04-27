# Exams Hero Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI Coach card with a production-ready Exams hero card system featuring exam countdown, weak topic detection, and smart reminders.

**Architecture:** 
- **UI Layer:** ExamsHeroCard replaces AskAIHeroCard in Study mode. New components: ExamCountdownSection, WeakTopicsSection with modal for exam input.
- **Data Flow:** DashboardContext manages exams, weak topics, and reminder state. Learning events table feeds weak topic detection via vector similarity and frequency counting.
- **Reminder System:** Browser notification API with localStorage tracking for last-sent timestamps. Runs as a background check every 60 seconds in a useEffect hook.
- **Weak Topics Detection:** Queries learning_events table, groups by topic, counts frequency, and filters topics with count >= 5 (configurable threshold).

**Tech Stack:** 
- React 19, Next.js 16, Supabase for data persistence
- Framer Motion for animations
- Browser Notifications API (Notification) with fallback to in-app toast
- localStorage for reminder tracking and UI state

---

## Task 1: Remove AI Coach Card from StudyModeCards

**Files:**
- Modify: `src/components/dashboard/StudyModeCards.jsx:73-82`

- [ ] **Step 1: Read the file to understand current structure**

Current content shows 4 bento cards in StudyModeCards. The AI Coach card is lines 73-82.

- [ ] **Step 2: Delete AI Coach card block**

Remove the BentoCard component that renders "💬 AI Coach" (lines 73-82).

```jsx
// DELETE THESE LINES (73-82):
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

After deletion, StudyModeCards will export 3 BentoCards: Focus Mode, Quiz, Voice Tutor.

- [ ] **Step 3: Verify no orphaned imports or references**

Confirm the file has no other references to "coach" or this card.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StudyModeCards.jsx
git commit -m "Remove AI Coach card from study mode

Now links to /ask-ai via AskAI Hero Card instead. Keeps Coach Mode feature functional elsewhere in app."
```

---

## Task 2: Create ExamsHeroCard Component (Core UI)

**Files:**
- Create: `src/components/dashboard/ExamsHeroCard.jsx`

- [ ] **Step 1: Create the file with skeleton structure**

```jsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ExamCountdownSection from "./exams/ExamCountdownSection";
import WeakTopicsSection from "./exams/WeakTopicsSection";
import AddExamModal from "./exams/AddExamModal";

export default function ExamsHeroCard({ exams = [], weakTopics = [], onAddExam = null }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{CSS_ANIMATIONS}</style>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(139,92,246,0.08))",
          borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
          borderColor: "rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(139,92,246,0.35)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "inset 0 0 30px rgba(34,211,238,0.04)",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Exams</p>
          <p style={{ margin: "3px 0 0", fontSize: 9, color: "#52525b" }}>
            Track your upcoming exams and focus on weak areas
          </p>
        </div>

        {/* Countdown Section */}
        <ExamCountdownSection exams={exams} />

        {/* Weak Topics Section */}
        <WeakTopicsSection weakTopics={weakTopics} />

        {/* Add Exam Button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            marginTop: "auto",
            padding: "8px 12px",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 6,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          + Add Exam
        </button>
      </div>

      {showModal && (
        <AddExamModal
          onClose={() => setShowModal(false)}
          onSubmit={(examData) => {
            if (onAddExam) onAddExam(examData);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

const CSS_ANIMATIONS = `
  @keyframes pulse-exam {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  @keyframes slideInTop {
    from { transform: translateY(-8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
```

- [ ] **Step 2: Verify structure compiles**

The component takes exams array, weakTopics array, and onAddExam callback. It renders:
- Title + subtitle
- Countdown section (will be built in Task 3)
- Weak topics section (will be built in Task 5)
- Add exam button with modal

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ExamsHeroCard.jsx
git commit -m "Create ExamsHeroCard component skeleton

Replaces AskAIHeroCard in study mode. Contains countdown + weak topics sections + add exam button."
```

---

## Task 3: Create ExamCountdownSection Component

**Files:**
- Create: `src/components/dashboard/exams/ExamCountdownSection.jsx`

- [ ] **Step 1: Create file with countdown display logic**

```jsx
"use client";

import { useState, useEffect } from "react";

export default function ExamCountdownSection({ exams = [] }) {
  const [now, setNow] = useState(new Date());

  // Update time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get next upcoming exam
  const activeExams = exams.filter((e) => e.status === "active");
  const nextExam = activeExams.length > 0
    ? activeExams.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0]
    : null;

  if (!nextExam) {
    return (
      <div
        style={{
          padding: "12px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>No upcoming exams</p>
      </div>
    );
  }

  const examDate = new Date(nextExam.exam_date + "T00:00:00");
  const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
  const isPast = daysLeft < 0;

  const countdownColor =
    isPast ? "#52525b" :
    daysLeft > 30 ? "#22C55E" :
    daysLeft > 7 ? "#F59E0B" :
    "#EF4444";

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: `1px solid ${countdownColor.replace(")", ", 0.2)")}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 10, color: "#71717a" }}>{nextExam.name}</p>
        {isPast ? (
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#52525b" }}>Exam passed</p>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: countdownColor, lineHeight: 1 }}>
            {daysLeft}
          </p>
        )}
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <p style={{ margin: 0, fontSize: 9, color: "#71717a" }}>days left</p>
        {daysLeft <= 7 && daysLeft >= 0 && (
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "#EF4444", fontWeight: 600 }}>Final sprint!</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify countdown logic**

- Gets next active exam from exams array
- Calculates days left (timezone-safe: uses "T00:00:00" to avoid time offset)
- Shows live countdown (updates every 1 second)
- Color changes: green (>30d), amber (>7d), red (≤7d), gray (past)
- Shows "Final sprint!" warning when ≤7 days and exam not passed

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/exams/ExamCountdownSection.jsx
git commit -m "Create ExamCountdownSection with live countdown

Updates every second. Color-coded by proximity (green/amber/red). Shows next active exam only."
```

---

## Task 4: Create AddExamModal Component

**Files:**
- Create: `src/components/dashboard/exams/AddExamModal.jsx`

- [ ] **Step 1: Create modal file**

```jsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function AddExamModal({ onClose, onSubmit }) {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!examName.trim() || !examDate.trim()) {
      alert("Please enter exam name and date");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: examName, exam_date: examDate }),
      });

      if (!res.ok) throw new Error("Failed to save exam");
      const newExam = await res.json();
      onSubmit(newExam);
    } catch (err) {
      console.error("Add exam error:", err);
      alert("Failed to save exam. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 20,
          width: "90%",
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>
          Add Exam
        </p>

        <input
          type="text"
          placeholder="Exam name (e.g. JEE Main)"
          value={examName}
          onChange={(e) => setExamName(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            padding: "10px",
            fontSize: 12,
            color: "#e4e4e7",
            outline: "none",
          }}
        />

        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            padding: "10px",
            fontSize: 12,
            color: "#e4e4e7",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              color: "#a1a1aa",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              background: loading ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Adding..." : "Add Exam"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify form logic**

- Validates exam name and date are not empty
- Posts to existing `/api/exam` endpoint
- Calls onSubmit callback with new exam data
- Shows loading state during submission
- Handles errors gracefully

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/exams/AddExamModal.jsx
git commit -m "Create AddExamModal form component

Modal to add new exam. Validates inputs, posts to /api/exam, closes on success."
```

---

## Task 5: Create WeakTopicsSection Component

**Files:**
- Create: `src/components/dashboard/exams/WeakTopicsSection.jsx`

- [ ] **Step 1: Create component**

```jsx
"use client";

export default function WeakTopicsSection({ weakTopics = [] }) {
  // Filter to top 5 weak topics, sorted by count
  const sortedTopics = [...weakTopics]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  if (sortedTopics.length === 0) {
    return (
      <div
        style={{
          padding: "12px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 10, color: "#52525b" }}>No weak topics yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#71717a", fontWeight: 600 }}>
        Weak Topics
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sortedTopics.map((topic) => (
          <button
            key={topic.id || topic.topic}
            style={{
              padding: "5px 10px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 4,
              color: "#fca5a5",
              fontSize: 9,
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.2)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
            title={`Asked ${topic.count} times`}
          >
            {topic.topic}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify display logic**

- Shows top 5 weak topics sorted by count (frequency)
- Displays as clickable chips/tags with red theme
- Shows "No weak topics yet" when empty
- Hover state brightens chip
- Title shows count when hovering (non-interactive for now)

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/exams/WeakTopicsSection.jsx
git commit -m "Create WeakTopicsSection component

Displays top 5 weak topics as chips. Sorted by frequency count."
```

---

## Task 6: Replace AskAIHeroCard with ExamsHeroCard in BentoGrid

**Files:**
- Modify: `src/components/dashboard/BentoGrid.jsx:1-10, 128-130`

- [ ] **Step 1: Update imports**

Change line 6 from:
```jsx
import AskAIHeroCard from "./AskAIHeroCard";
```

To:
```jsx
import ExamsHeroCard from "./ExamsHeroCard";
import AskAIHeroCard from "./AskAIHeroCard"; // Keep for reference if needed later
```

Actually, we're replacing it completely, so just:
```jsx
import ExamsHeroCard from "./ExamsHeroCard";
```

- [ ] **Step 2: Get context data**

Add to BentoGrid component (after line 7):
```jsx
const { exams, weakTopics, addExam } = useDashboard();
```

- [ ] **Step 3: Replace the hero card JSX**

Change lines 128-130 from:
```jsx
<motion.div
  variants={cardVariants}
  style={{
    gridColumn: 1,
    gridRow: isMobile ? "1" : "1 / 3",
  }}
>
  <AskAIHeroCard activePdf={activePdf} />
</motion.div>
```

To:
```jsx
<motion.div
  variants={cardVariants}
  style={{
    gridColumn: 1,
    gridRow: isMobile ? "1" : "1 / 3",
  }}
>
  <ExamsHeroCard exams={exams} weakTopics={weakTopics} onAddExam={addExam} />
</motion.div>
```

- [ ] **Step 4: Verify the import is at the top**

Confirm `useDashboard` is imported from "@/context/DashboardContext".

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/BentoGrid.jsx
git commit -m "Replace AskAIHeroCard with ExamsHeroCard in study mode

ExamsHeroCard now takes hero position in study mode bento grid. Gets exam data from DashboardContext."
```

---

## Task 7: Update DashboardContext State (Exams & Weak Topics)

**Files:**
- Modify: `src/context/DashboardContext.jsx:276-294, 814-824`

Context already has exam state management. We need to ensure:

- [ ] **Step 1: Verify exam state exists**

Lines 276-286 already have:
```jsx
const [exams, setExams] = useState([]);
const [activeExams, setActiveExams] = useState([]);
const [historyExams, setHistoryExams] = useState([]);
const [selectedExam, setSelectedExam] = useState(null);
```

This is sufficient. ✓

- [ ] **Step 2: Verify weak topics state exists**

Line 288 has:
```jsx
const [weakTopics, setWeakTopics] = useState([]);
```

This is sufficient. ✓

- [ ] **Step 3: Verify fetch functions exist**

Line 814-824 has `fetchWeakTopics()` and `fetchExam()` already.

- [ ] **Step 4: Ensure proper refresh in useEffect**

Check line 1282 — `fetchExam()` and `fetchWeakTopics()` are already called on component mount as part of the Promise.all.

No changes needed. Context is already set up for exams and weak topics. ✓

- [ ] **Step 5: Commit (no-op, but document)**

```bash
# No changes needed — DashboardContext already manages exams and weakTopics state.
# Just verify the data flows through ExamsHeroCard props.
```

---

## Task 8: Implement Weak Topic Detection API Integration

**Files:**
- Modify: `src/app/api/weak-topics/route.js` (already exists, enhance it)

The endpoint already exists and does:
1. Extract topics from user questions (AI-based + fallback keyword extraction)
2. Track topic attempts (count occurrences)
3. Promote to weak_topics table when count >= 3

Current logic: threshold is 3, level is "medium" or "hard" based on count >= 6.

**We need to adjust the threshold for the spec: count >= 5**

- [ ] **Step 1: Read the existing endpoint**

File already exists at `src/app/api/weak-topics/route.js`. It has two key functions:
- `trackTopicAttempt()` — increments count in topic_attempts table
- `upsertWeakTopic()` — adds/updates in weak_topics table

- [ ] **Step 2: Modify the weak topic threshold**

Change line 243 in weak-topics/route.js:
```jsx
// OLD:
if (newCount >= 3) {

// NEW:
if (newCount >= 5) {
```

Also change line 184 in the manual topic detection (set count to 5 instead of 3):
```jsx
// OLD:
count: 3,

// NEW:
count: 5,
```

- [ ] **Step 3: Verify threshold is configurable**

Make the threshold a const at the top of the file for future tuning:
```jsx
const WEAK_TOPIC_THRESHOLD = 5;
```

Use it in both places:
```jsx
if (newCount >= WEAK_TOPIC_THRESHOLD) {
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/weak-topics/route.js
git commit -m "Update weak topic detection threshold to 5

Changed from 3 to 5 occurrences before promoting to weak_topics table. Made threshold a constant for tuning."
```

---

## Task 9: Implement Reminder System (Browser Notifications)

**Files:**
- Create: `src/hooks/useExamReminders.js`

- [ ] **Step 1: Create hook**

```jsx
import { useEffect, useRef } from "react";

export function useExamReminders(exams = []) {
  const reminderTimestampsRef = useRef({});

  useEffect(() => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return;
    }

    // Request permission once on mount
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkReminders = () => {
      const now = new Date();

      exams.forEach((exam) => {
        if (exam.status !== "active") return;

        const examDate = new Date(exam.exam_date + "T00:00:00");
        const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

        // Determine reminder frequency based on days left
        let reminderIntervalMs = null;
        let reminderLabel = null;

        if (daysLeft > 7) {
          // Send reminder once every 7 days
          reminderIntervalMs = 7 * 24 * 60 * 60 * 1000;
          reminderLabel = "7day";
        } else if (daysLeft >= 0) {
          // Send reminder every 2 days
          reminderIntervalMs = 2 * 24 * 60 * 60 * 1000;
          reminderLabel = "2day";
        } else {
          // Exam has passed, skip
          return;
        }

        const reminderId = `exam_${exam.id}_${reminderLabel}`;
        const lastSent = localStorage.getItem(reminderId);
        const lastSentTime = lastSent ? parseInt(lastSent, 10) : 0;
        const timeSinceLastReminder = now.getTime() - lastSentTime;

        // Send notification if enough time has passed
        if (timeSinceLastReminder >= reminderIntervalMs) {
          if (Notification.permission === "granted") {
            new Notification(`📚 ${exam.name}`, {
              body: `${daysLeft} days left until your exam. Start preparing!`,
              icon: "/exam-icon.png", // Optional: add icon to public/
              badge: "/exam-badge.png",
              tag: reminderId,
              requireInteraction: false,
            });
          }

          // Update last sent timestamp in localStorage
          localStorage.setItem(reminderId, now.getTime().toString());
        }
      });
    };

    // Check reminders every 60 seconds
    const intervalId = setInterval(checkReminders, 60 * 1000);

    // Run check immediately on mount
    checkReminders();

    return () => clearInterval(intervalId);
  }, [exams]);
}
```

- [ ] **Step 2: Verify logic**

- Checks notifications API support
- Requests permission once
- For each active exam, calculates days left
- Sends reminder every 7 days if > 7 days left
- Sends reminder every 2 days if <= 7 days left
- Uses localStorage to track last-sent timestamp per reminder
- Prevents spam by checking elapsed time before sending
- Runs check every 60 seconds
- Runs check immediately on mount

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExamReminders.js
git commit -m "Create useExamReminders hook for browser notifications

Sends exam reminders every 7 days (>7d away) or every 2 days (≤7d away). Prevents spam with localStorage tracking."
```

---

## Task 10: Hook useExamReminders into DashboardProvider

**Files:**
- Modify: `src/context/DashboardContext.jsx:1-10` (imports)
- Modify: `src/context/DashboardContext.jsx:220` (inside DashboardProvider function)

- [ ] **Step 1: Add import at the top**

Add after other imports (around line 5):
```jsx
import { useExamReminders } from "@/hooks/useExamReminders";
```

- [ ] **Step 2: Call hook inside DashboardProvider**

Add after the auth listener setup (around line 1304):
```jsx
  // ── Exam Reminders ─────────────────────────────────
  useExamReminders(exams);
```

This will automatically run the reminder system whenever exams state changes.

- [ ] **Step 3: Commit**

```bash
git add src/context/DashboardContext.jsx
git commit -m "Integrate useExamReminders hook into DashboardProvider

Reminder system now active globally. Checks and sends notifications every 60 seconds."
```

---

## Task 11: Ensure Weak Topics Fetching on Dashboard Load

**Files:**
- Verify: `src/context/DashboardContext.jsx:1278-1291` (useEffect on mount)

The weak topics are already fetched on mount via `fetchWeakTopics()` which is called in the Promise.all.

- [ ] **Step 1: Verify weak topics are fetched**

Check that line 1283 includes:
```jsx
fetchWeakTopics(),
```

It already does. ✓

- [ ] **Step 2: Verify weak topics auto-refresh after user asks questions**

In the `handleAsk` function (around line 1084), weak topics should be refreshed after a question is answered:
```jsx
.then(() => { fetchStreak(); fetchProgress(); fetchWeakTopics(); })
```

It already does. ✓

No changes needed. Weak topics are automatically fetched and refreshed.

- [ ] **Step 3: Document**

```bash
# No changes needed — weak topics already auto-refresh after each question and on dashboard load.
```

---

## Task 12: Create and Run Migration for Missing Tables (if needed)

**Files:**
- Verify: `supabase/migrations/learning_events.sql`
- Verify: Database schema for topic_attempts and weak_topics

- [ ] **Step 1: Check if tables exist**

The code already references these tables:
- `topic_attempts` (used in weak-topics/route.js)
- `weak_topics` (used in weak-topics/route.js)
- `learning_events` (migration file exists)

Check in Supabase console or via the migration files if these tables are already created.

- [ ] **Step 2: If tables don't exist, create migration**

If `topic_attempts` and `weak_topics` tables don't exist, create migration:

Create: `supabase/migrations/weak_topics_tables.sql`

```sql
-- =====================================================================
-- weak_topics & topic_attempts — track user learning progression
-- Created: 2026-04-27
-- =====================================================================

-- topic_attempts: every attempt at a topic (frequent queries)
create table if not exists public.topic_attempts (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic        text not null,
  subject      text,
  count        int default 1,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

create index if not exists topic_attempts_user_topic_idx
  on public.topic_attempts (user_id, topic);

-- weak_topics: promoted topics (user asking repeatedly about same thing)
create table if not exists public.weak_topics (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  topic        text not null,
  subject      text,
  count        int default 1,
  level        text default 'medium', -- easy | medium | hard
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

create index if not exists weak_topics_user_topic_idx
  on public.weak_topics (user_id, topic);

create index if not exists weak_topics_user_created_idx
  on public.weak_topics (user_id, created_at desc);

-- RLS: users can only see their own data
alter table public.topic_attempts enable row level security;
alter table public.weak_topics enable row level security;

drop policy if exists "topic_attempts_user_own" on public.topic_attempts;
create policy "topic_attempts_user_own"
  on public.topic_attempts for all
  using (auth.uid() = user_id);

drop policy if exists "weak_topics_user_own" on public.weak_topics;
create policy "weak_topics_user_own"
  on public.weak_topics for all
  using (auth.uid() = user_id);
```

- [ ] **Step 3: Run migration in Supabase**

In Supabase SQL Editor, execute the migration.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/weak_topics_tables.sql
git commit -m "Add weak_topics and topic_attempts tables migration

Tracks topic learning progression and identifies weak areas from user queries."
```

---

## Task 13: Test ExamsHeroCard UI (Visual Verification)

**Files:**
- Test: `src/components/dashboard/ExamsHeroCard.jsx`
- Test: All sub-components

- [ ] **Step 1: Start dev server**

```bash
npm run dev
# or
yarn dev
```

- [ ] **Step 2: Navigate to dashboard**

Go to `http://localhost:3000/dashboard` (or your app URL).

- [ ] **Step 3: Verify in Study mode**

- ExamsHeroCard should appear in the left column (hero position)
- Title reads "Exams"
- Subtitle reads "Track your upcoming exams and focus on weak areas"
- "Add Exam" button is visible at the bottom

- [ ] **Step 4: Verify exam countdown display**

- If no exams: shows "No upcoming exams"
- If exams exist: shows next exam name, days left (large number), color-coded by proximity

- [ ] **Step 5: Verify weak topics display**

- If no weak topics: shows "No weak topics yet"
- If weak topics exist: shows as red chips/tags
- Top 5 only, sorted by frequency count

- [ ] **Step 6: Test Add Exam modal**

- Click "+ Add Exam" button
- Modal appears
- Enter exam name and date
- Click "Add Exam"
- Modal closes
- New exam appears in countdown section
- Countdown updates in real-time

- [ ] **Step 7: Commit test results**

```bash
git add -A
git commit -m "Visual verification: ExamsHeroCard UI complete

Tested: exam countdown, weak topics display, add exam modal, real-time updates."
```

---

## Task 14: Test Weak Topic Detection

**Files:**
- Test: `src/app/api/weak-topics/route.js`
- Integration: Ask questions and verify weak topics are tracked

- [ ] **Step 1: Ask a question 5+ times**

In the Ask AI section, ask the same question (e.g., about "recursion") at least 5 times.

- [ ] **Step 2: Verify topic is tracked**

- Go to dashboard
- In ExamsHeroCard, weak topics section should now show "recursion"
- Refresh the page
- Weak topic should persist (loaded from database)

- [ ] **Step 3: Test topic normalization**

- Ask about "recursive functions", "recursion problems", "recursion" (same topic, different wording)
- All should map to "recursion" (via SYNONYM_MAP in weak-topics/route.js)
- Count should accumulate across variations

- [ ] **Step 4: Test frequency threshold**

- Ask about "entropy" 4 times
- Should NOT appear in weak topics yet (threshold is 5)
- Ask 1 more time
- Should now appear in weak topics

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Verify weak topic detection works end-to-end

Tested: frequency threshold, topic normalization, persistence, display in ExamsHeroCard."
```

---

## Task 15: Test Reminder System

**Files:**
- Test: `src/hooks/useExamReminders.js`

- [ ] **Step 1: Add an exam 8 days away**

In the Add Exam modal, create an exam dated 8 days from today.

- [ ] **Step 2: Verify reminder system runs**

- Open browser dev console (F12 → Console)
- Wait 60 seconds
- Check localStorage for reminder entries:
  ```js
  Object.keys(localStorage).filter(k => k.includes("exam_"))
  ```
- Should see entries like `exam_<id>_7day` with timestamps

- [ ] **Step 3: Test notification permissions**

- On first load, browser should ask for notification permission
- Grant permission
- Wait 60 seconds
- Browser should show a notification: "📚 <Exam Name> — <daysLeft> days left until your exam..."

- [ ] **Step 4: Test reminder frequency (7 days)**

- Exam is 8 days away: should send reminder every 7 days
- Manually set last reminder to old timestamp:
  ```js
  localStorage.setItem("exam_<id>_7day", "1000"); // Old timestamp
  ```
- Refresh page
- After 60 seconds, should get another notification

- [ ] **Step 5: Test reminder frequency (2 days)**

- Create another exam 5 days away
- Wait 60 seconds
- Notification should come every 2 days (not every 7)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Test exam reminder system end-to-end

Verified: notification permissions, frequency logic (7d vs 2d), spam prevention, localStorage tracking."
```

---

## Task 16: Test Study Mode → Progress Mode Toggle (No Regression)

**Files:**
- Test: `src/components/dashboard/BentoGrid.jsx`
- Test: Mode toggle button in GreetingRow

- [ ] **Step 1: Load dashboard in Study mode**

Dashboard should show ExamsHeroCard + 3 study cards (Focus, Quiz, Voice Tutor).
No AI Coach card (should be removed in Task 1).

- [ ] **Step 2: Toggle to Progress mode**

Click the "Study | Progress" pill button in top right (GreetingRow).

- [ ] **Step 3: Verify Progress mode loads correctly**

- Should fade-out Study mode
- Should fade-in Progress mode
- All 10 progress cards should load without errors
- No layout shifts

- [ ] **Step 4: Toggle back to Study mode**

Click the pill again.

- [ ] **Step 5: Verify Study mode renders correctly**

- ExamsHeroCard should be in place
- All animations smooth (no janky transitions)
- Countdown should still be live-updating

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Verify Study/Progress toggle works with ExamsHeroCard

Tested: mode switching, animations, countdown persistence, no regressions."
```

---

## Task 17: Clean Up & Final Commit

**Files:**
- Verify all files are in place
- No unused imports
- No console errors/warnings

- [ ] **Step 1: Run linter (if configured)**

```bash
npm run lint
# or check VSCode for errors
```

- [ ] **Step 2: Check for unused imports**

- StudyModeCards: should only import Link, motion, useDashboard (no "coach" references)
- BentoGrid: should import ExamsHeroCard, not AskAIHeroCard (or import both if needed elsewhere)

- [ ] **Step 3: Verify no console errors**

- Open dev console (F12)
- Reload dashboard
- Should show no red errors
- May show yellow warnings (expected, not new)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "Final cleanup and verification

Removed unused imports, verified no console errors, all tests passing.
ExamsHeroCard system complete with countdown, weak topics, and reminders."
```

---

## Summary of Changes

### Removed
- AI Coach card from StudyModeCards (lines 73-82)

### Created
- `ExamsHeroCard.jsx` — Hero card component for Study mode
- `ExamCountdownSection.jsx` — Displays live countdown to next exam
- `WeakTopicsSection.jsx` — Shows weak topics as chips
- `AddExamModal.jsx` — Form to add new exam
- `useExamReminders.js` — Hook for browser notifications + reminder scheduling
- `weak_topics_tables.sql` — Migration for topic tracking tables

### Modified
- `BentoGrid.jsx` — Replaced AskAIHeroCard with ExamsHeroCard
- `StudyModeCards.jsx` — Removed AI Coach card
- `DashboardContext.jsx` — Integrated reminder hook (no state changes needed)
- `weak-topics/route.js` — Adjusted threshold to 5, made configurable

### No Changes Needed (Already In Place)
- Exam state management in DashboardContext
- Weak topics state management in DashboardContext
- Exam CRUD endpoints (`/api/exam`)
- Weak topics tracking (`/api/weak-topics`)
- Learning events table + embeddings
- Topic attempt & weak topic tables

---

## Testing Checklist

- [ ] ExamsHeroCard renders in Study mode
- [ ] Countdown updates live (every second)
- [ ] Weak topics display from database
- [ ] Add Exam modal works and persists
- [ ] Questions tracked as topics (5+ count → weak topic)
- [ ] Reminders send every 7 days (>7d) / 2 days (≤7d)
- [ ] No spam (localStorage prevents duplicate sends)
- [ ] Study → Progress toggle works (no regression)
- [ ] AI Coach card fully removed
- [ ] No console errors
- [ ] Mobile responsive (test at <768px)

---

## Tech Specs

**Weak Topic Threshold:** 5 occurrences (configurable via WEAK_TOPIC_THRESHOLD)

**Reminder Frequency:**
- If exam > 7 days away: once every 7 days
- If exam ≤ 7 days away: once every 2 days

**Weak Topics Display:** Top 5, sorted by count descending

**Countdown Color:**
- Green: > 30 days
- Amber: > 7 days
- Red: ≤ 7 days
- Gray: past

**Reminder Check Interval:** Every 60 seconds

**Browser Support:** Notifications API (graceful fallback if not supported)
