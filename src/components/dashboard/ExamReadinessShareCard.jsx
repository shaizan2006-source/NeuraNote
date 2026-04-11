"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// ── Helpers ───────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score) {
  if (score >= 80) return "Exam Ready 🏆";
  if (score >= 50) return "On Track ⚡";
  return "Needs Work 📚";
}

// ── Modal card content (also used as the shareable visual) ────────
function CardVisual({ readiness, streak, masteryCount, examName }) {
  const color = scoreColor(readiness.score);
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (readiness.score / 100) * circumference;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a14 0%, #0f172a 100%)",
      border: `1px solid ${color}44`,
      borderRadius: 20,
      padding: "28px 24px",
      width: "min(320px, calc(100vw - 32px))",
      boxShadow: `0 0 40px ${color}22`,
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13,
        }}>📚</div>
        <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>Ask My Notes</span>
      </div>

      {/* Headline */}
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b", fontWeight: 500 }}>
        {examName ? `Readiness for ${examName}` : "Exam Readiness Score"}
      </p>

      {/* SVG ring + score */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 108, height: 108 }}>
          <svg width="108" height="108" viewBox="0 0 108 108">
            {/* Track */}
            <circle cx="54" cy="54" r="44" fill="none" stroke="#1e293b" strokeWidth="10" />
            {/* Progress */}
            <circle
              cx="54" cy="54" r="44"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 54 54)"
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{readiness.score}%</span>
            <span style={{ fontSize: 10, color: "#64748b", marginTop: 2, fontWeight: 600 }}>READY</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <p style={{ margin: "0 0 20px", textAlign: "center", fontWeight: 700, fontSize: 16, color }}>
        {scoreLabel(readiness.score)}
      </p>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { emoji: "🔥", value: streak,        label: "day streak"      },
          { emoji: "🧠", value: masteryCount,  label: "topics mastered" },
          { emoji: "📊", value: `${readiness.score}%`, label: "readiness" },
        ].map((s) => (
          <div key={s.label} style={{
            textAlign: "center", padding: "10px 4px",
            borderRadius: 10, background: "#0f172a",
            border: "1px solid #1e293b",
          }}>
            <div style={{ fontSize: 16, marginBottom: 3 }}>{s.emoji}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#475569", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer tag */}
      <p style={{ margin: 0, textAlign: "center", fontSize: 11, color: "#334155" }}>
        askmynotes.in · Study smarter with AI
      </p>
    </div>
  );
}

// ── Share modal ───────────────────────────────────────────────────
function ShareModal({ onClose }) {
  const { readiness, streak, masteryTopics, getActiveExam } = useDashboard();
  const [copied, setCopied] = useState(false);

  const activeExam = getActiveExam?.();
  const examName   = activeExam?.name ?? "";
  const masteryCount = masteryTopics?.length ?? 0;

  const shareText = `I'm ${readiness.score}% exam ready on Ask My Notes! 🎯\n${streak} day streak · ${masteryCount} topics mastered\nStudy smarter with AI → askmynotes.in`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // fallback — select a textarea
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 12 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
      >
        {/* Card preview */}
        <CardVisual
          readiness={readiness}
          streak={streak}
          masteryCount={masteryCount}
          examName={examName}
        />

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopy}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: copied ? "var(--green, #22c55e)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy share text"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </motion.button>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>
          Screenshot this card to share on WhatsApp or Instagram
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Trigger button — drop into AnalyticsSection ───────────────────
export default function ExamReadinessShareCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        style={{
          marginTop: 12,
          width: "100%",
          padding: "9px 16px",
          borderRadius: 9,
          border: "1px solid rgba(124,58,237,0.35)",
          background: "rgba(124,58,237,0.1)",
          color: "#a78bfa",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
        }}
      >
        <span>🔗</span> Share my readiness score
      </motion.button>

      <AnimatePresence>
        {open && <ShareModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
