"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Milestone definitions ─────────────────────────────────────────
// Call checkMilestones(stats) anywhere in the app.
// stats: { streak, progressQuestions, masteryTopics }
const MILESTONES = [
  { id: "first_question",  check: (s) => s.progressQuestions >= 1,    emoji: "🎉", title: "First question!", text: "You asked your first question. Keep going!" },
  { id: "streak_3",        check: (s) => s.streak >= 3,               emoji: "🔥", title: "3-day streak!",   text: "You've studied 3 days in a row. Nice." },
  { id: "streak_7",        check: (s) => s.streak >= 7,               emoji: "🏆", title: "7-day streak!",   text: "A full week of studying. Incredible." },
  { id: "streak_30",       check: (s) => s.streak >= 30,              emoji: "💎", title: "30-day streak!",  text: "Elite level consistency. Exam ready." },
  { id: "questions_10",    check: (s) => s.progressQuestions >= 10,   emoji: "⚡", title: "10 questions!",   text: "You're building momentum." },
  { id: "questions_50",    check: (s) => s.progressQuestions >= 50,   emoji: "🚀", title: "50 questions!",   text: "Halfway to mastery habits." },
  { id: "questions_100",   check: (s) => s.progressQuestions >= 100,  emoji: "💯", title: "100 questions!",  text: "You're in the top tier of learners." },
  { id: "mastery_1",       check: (s) => s.masteryTopics >= 1,        emoji: "🧠", title: "First topic mastered!", text: "You've mastered your first topic!" },
  { id: "mastery_5",       check: (s) => s.masteryTopics >= 5,        emoji: "🌟", title: "5 topics mastered!", text: "Building real depth in your subject." },
  { id: "mastery_10",      check: (s) => s.masteryTopics >= 10,       emoji: "🎓", title: "10 topics mastered!", text: "You're becoming an expert." },
];

// ── In-memory store — avoids re-toasting across renders ───────────
const seen = new Set(
  typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("__amn_milestones") || "[]")
    : []
);

function persist() {
  try { localStorage.setItem("__amn_milestones", JSON.stringify([...seen])); } catch {}
}

// ── Global queue ──────────────────────────────────────────────────
let _enqueue = null;
export function checkMilestones(stats) {
  if (!_enqueue) return;
  for (const m of MILESTONES) {
    if (!seen.has(m.id) && m.check(stats)) {
      seen.add(m.id);
      persist();
      _enqueue(m);
    }
  }
}

// ── Single Toast UI ───────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "var(--surface-card)",
        border: "1px solid var(--border-strong)",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 24px var(--brand-glow)",
        cursor: "pointer",
        userSelect: "none",
        minWidth: 260, maxWidth: 340,
      }}
      onClick={onDismiss}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>{toast.emoji}</span>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
          {toast.title}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
          {toast.text}
        </p>
      </div>
    </motion.div>
  );
}

// ── Toast container — mount once at app root ──────────────────────
export default function MilestoneToast() {
  const [queue, setQueue] = useState([]);

  const enqueue = useCallback((m) => {
    setQueue((q) => [...q, { ...m, key: `${m.id}_${Date.now()}` }]);
  }, []);

  useEffect(() => {
    _enqueue = enqueue;
    return () => { _enqueue = null; };
  }, [enqueue]);

  const dismiss = (key) => setQueue((q) => q.filter((t) => t.key !== key));

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      pointerEvents: "none",
    }}>
      <AnimatePresence>
        {queue.map((toast) => (
          <div key={toast.key} style={{ pointerEvents: "auto" }}>
            <Toast toast={toast} onDismiss={() => dismiss(toast.key)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
