"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// ── Helpers ───────────────────────────────────────────────────────
function getMondayKey() {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun, 1 = Mon …
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

function isSunday() {
  return new Date().getDay() === 0;
}

const STORAGE_KEY = "__amn_week_snapshot";

// ── Component ─────────────────────────────────────────────────────
export default function WeeklyRecapCard() {
  const { progressQuestions, masteryTopics, analytics, streak } = useDashboard();
  const [recap, setRecap] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const monday = getMondayKey();
    const raw = localStorage.getItem(STORAGE_KEY);
    let stored = null;

    try { stored = raw ? JSON.parse(raw) : null; } catch {}

    const currentStats = {
      questions: progressQuestions,
      mastery:   masteryTopics?.length ?? 0,
      focus:     analytics?.totalCompleted ?? 0,
    };

    if (!stored || stored.monday !== monday) {
      // New week — write fresh snapshot
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ monday, ...currentStats }));
      return;
    }

    // Compute deltas
    const delta = {
      questions: Math.max(0, currentStats.questions - (stored.questions ?? 0)),
      mastery:   Math.max(0, currentStats.mastery   - (stored.mastery   ?? 0)),
      focus:     Math.max(0, currentStats.focus      - (stored.focus     ?? 0)),
    };

    setRecap({ delta, streak });
  }, [progressQuestions, masteryTopics, analytics, streak]);

  if (!isSunday() || !recap || dismissed) return null;

  const { delta } = recap;

  const stats = [
    { emoji: "💬", value: delta.questions, label: "questions asked"   },
    { emoji: "🧠", value: delta.mastery,   label: "topics mastered"   },
    { emoji: "🎯", value: delta.focus,     label: "focus sessions"    },
    { emoji: "🔥", value: recap.streak,    label: "day streak"        },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          marginBottom: 20,
          borderRadius: 16,
          padding: "18px 20px",
          background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)",
          border: "1px solid rgba(124,58,237,0.25)",
          position: "relative",
        }}
      >
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss weekly recap"
          style={{
            position: "absolute", top: 10, right: 12,
            background: "transparent", border: "none",
            color: "var(--text-faint)", fontSize: 14,
            cursor: "pointer", lineHeight: 1, padding: 4,
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              Weekly Recap
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
              Here's what you accomplished this week
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="recap-grid">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              style={{
                textAlign: "center",
                padding: "10px 6px",
                borderRadius: 10,
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, fontWeight: 600, lineHeight: 1.3 }}>
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Motivational line */}
        {delta.questions > 0 || delta.mastery > 0 ? (
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>
            Great week! Keep the momentum going into next week. 🚀
          </p>
        ) : (
          <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            This week was quiet. Come back Monday for a fresh start. 💪
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
