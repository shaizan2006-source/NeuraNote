"use client";

import { useDashboard } from "@/context/DashboardContext";
import { motion, AnimatePresence } from "framer-motion";

const LEVEL = (s) =>
  s < 40 ? { label: "Weak",   color: "#ef4444", bar: "#ef4444" }
: s < 70 ? { label: "Medium", color: "#f59e0b", bar: "#f59e0b" }
:           { label: "Strong", color: "#22c55e", bar: "#22c55e" };

// ── Animated mastery bar ───────────────────────────────────────────
function MasteryBar({ value, color, delay = 0 }) {
  return (
    <div style={{ height: 5, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, delay, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ height: "100%", borderRadius: 99, background: color }}
      />
    </div>
  );
}

// ── Full topic card (top 3) ────────────────────────────────────────
function TopicCard({ topic, index, weakTopics, normalizeTopic, setQuestion }) {
  const s      = Math.round(topic.mastery_score || 0);
  const level  = LEVEL(s);
  const isWeak = weakTopics.some((w) => normalizeTopic(w.topic) === normalizeTopic(topic.topic));

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.09, ease: "easeOut" }}
      style={{
        background: index === 0
          ? "linear-gradient(160deg, #130f2a 0%, #0f172a 100%)"
          : "#0f172a",
        borderRadius: 14,
        padding: "16px 18px",
        border: index === 0 ? "1px solid rgba(124,58,237,0.35)" : "1px solid #1e293b",
        boxShadow: index === 0 ? "0 0 24px rgba(124,58,237,0.1)" : "none",
      }}
    >
      {/* Row 1: badges + level */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {index === 0 && (
            <span style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 20,
              letterSpacing: 0.5,
            }}>
              ★ TOP
            </span>
          )}
          <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{topic.topic}</span>
          {isWeak && (
            <span style={{
              background: "rgba(239,68,68,0.12)",
              color: "#fca5a5",
              fontSize: 10,
              padding: "1px 8px",
              borderRadius: 20,
              fontWeight: 600,
            }}>
              ⚠ Weak
            </span>
          )}
        </div>
        <span style={{
          background: level.color + "22",
          color: level.color,
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 11px",
          borderRadius: 20,
          flexShrink: 0,
        }}>
          {level.label}
        </span>
      </div>

      {/* Mastery bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginBottom: 6 }}>
          <span>Mastery</span>
          <span style={{ color: level.color, fontWeight: 700 }}>{s}%</span>
        </div>
        <MasteryBar value={s} color={level.bar} delay={index * 0.09 + 0.25} />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {[["📖", "Revise"], ["✏️", "Practice"], ["⚡", "Quiz"]].map(([icon, action]) => (
          <motion.button
            key={action}
            whileHover={{ scale: 1.04, borderColor: "#334155", color: "#c4b5fd" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setQuestion(`${action} ${topic.topic}`)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "transparent",
              color: "#64748b",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {icon} {action}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Compact topic row (expanded list) ─────────────────────────────
function TopicRow({ topic, index }) {
  const s     = Math.round(topic.mastery_score || 0);
  const level = LEVEL(s);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 10,
        background: "#0f172a",
        border: "1px solid #1e293b",
      }}
    >
      <span style={{ color: "#94a3b8", fontSize: 13, flex: 1, fontWeight: 500 }}>{topic.topic}</span>
      <div style={{ width: "clamp(40px, 12%, 64px)", height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${s}%` }}
          transition={{ duration: 0.7, delay: index * 0.04, ease: "easeOut" }}
          style={{ height: "100%", background: level.bar, borderRadius: 99 }}
        />
      </div>
      <span style={{ color: level.color, fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: "right" }}>{s}%</span>
    </motion.div>
  );
}

// ── Main BrainSection ─────────────────────────────────────────────
export default function BrainSection() {
  const {
    getFilteredBrainTopics, normalizeSubject, normalizeTopic,
    syllabusTopics, exams, selectedSubject, setSelectedSubject,
    isBrainExpanded, setIsBrainExpanded, brainInsight,
    weakTopics, setQuestion,
  } = useDashboard();

  const allFiltered = getFilteredBrainTopics();
  const topTopics   = allFiltered.slice(0, 3);
  const restTopics  = allFiltered.slice(3);

  const subjectOptions = [
    ...new Set([
      ...syllabusTopics.map((s) => normalizeSubject(s.subject)),
      ...exams.map((e)          => normalizeSubject(e.name)),
    ]),
  ].filter(Boolean);

  return (
    <motion.div
      id="section-brain"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{
        background: "linear-gradient(180deg, #080d18 0%, #0a0f1e 100%)",
        border: "1px solid #1e293b",
        borderRadius: 20,
        padding: 22,
        marginTop: 24,
        boxShadow: "0 4px 40px rgba(0,0,0,0.45)",
      }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 0 18px rgba(124,58,237,0.28)",
          }}>
            🧠
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>Your Brain</span>
            {allFiltered.length > 0 && (
              <span style={{
                marginLeft: 8,
                background: "rgba(124,58,237,0.18)",
                color: "#a78bfa",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 700,
              }}>
                {allFiltered.length} topics
              </span>
            )}
            <p style={{ margin: 0, color: "#334155", fontSize: 11 }}>Mastery across all your notes</p>
          </div>
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: 9,
            background: "#0f172a",
            border: "1px solid #1e293b",
            color: "#94a3b8",
            fontSize: 12,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">All Subjects</option>
          {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── AI insight chip ────────────────────────────────────── */}
      <AnimatePresence>
        {brainInsight && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.22)",
              borderRadius: 11,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#c4b5fd",
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            🤖 {brainInsight}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Today's focus ──────────────────────────────────────── */}
      <AnimatePresence>
        {topTopics[0] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "linear-gradient(135deg, #0c1f3a, #0a1628)",
              border: "1px solid rgba(14,165,233,0.28)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: "rgba(14,165,233,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>
              🎯
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 10, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Today&apos;s Focus
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: "#38bdf8", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topTopics[0].topic}
              </p>
            </div>
            <motion.span
              whileHover={{ scale: 1.05 }}
              style={{
                background: "rgba(14,165,233,0.18)",
                color: "#38bdf8",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: 20,
                cursor: "default",
                flexShrink: 0,
              }}
            >
              Focus Now
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ────────────────────────────────────────── */}
      {allFiltered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: "center", padding: "40px 20px" }}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>🧠</div>
          <p style={{ color: "#334155", fontSize: 14 }}>
            No mastery data yet. Upload a PDF and start studying.
          </p>
        </motion.div>
      )}

      {/* ── Top 3 topic cards ──────────────────────────────────── */}
      {topTopics.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topTopics.map((topic, index) => (
            <TopicCard
              key={topic.topic ?? index}
              topic={topic}
              index={index}
              weakTopics={weakTopics}
              normalizeTopic={normalizeTopic}
              setQuestion={setQuestion}
            />
          ))}
        </div>
      )}

      {/* ── Expand/collapse button ─────────────────────────────── */}
      {allFiltered.length > 3 && (
        <motion.button
          whileHover={{ borderColor: "#334155", color: "#94a3b8" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsBrainExpanded((prev) => !prev)}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "10px 0",
            background: "transparent",
            border: "1px solid #1e293b",
            borderRadius: 11,
            color: "#475569",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s",
          }}
        >
          <motion.span
            animate={{ rotate: isBrainExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: "inline-block" }}
          >
            ▼
          </motion.span>
          {isBrainExpanded ? "Show less" : `Show ${restTopics.length} more topics`}
        </motion.button>
      )}

      {/* ── Expanded rest list ─────────────────────────────────── */}
      <AnimatePresence>
        {isBrainExpanded && restTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              marginTop: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: 320,
              overflowY: "auto",
              paddingRight: 2,
              scrollbarWidth: "thin",
              scrollbarColor: "#1e293b transparent",
            }}>
              {restTopics.map((topic, index) => (
                <TopicRow key={topic.topic ?? index} topic={topic} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
