"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { useDashboard } from "@/context/DashboardContext";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Skeleton shimmer card ──────────────────────────────────────────
function SkeletonCard({ index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: "22px 24px",
        marginBottom: 12,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div className="shimmer-overlay" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 40, height: 22, borderRadius: 6, background: "#1e293b" }} />
        <div style={{ flex: 1, height: 14, borderRadius: 7, background: "#1e293b" }} />
      </div>
      <div style={{ height: 12, borderRadius: 6, background: "#1e293b", marginBottom: 8, width: "70%" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 42, borderRadius: 10, background: "#1e293b" }} />
        ))}
      </div>
    </motion.div>
  );
}

// ── Individual question card ───────────────────────────────────────
function QuestionCard({ q, i, answers, setAnswers, showResult }) {
  const selected = answers[i];
  const isCorrect = selected === q.answer;

  const OPTION_COLORS = {
    default:   { bg: "transparent",              border: "#1e293b",              text: "#64748b",  badge: "#1e293b",          badgeText: "#475569"  },
    selected:  { bg: "rgba(124,58,237,0.10)",    border: "#7c3aed",              text: "#c4b5fd",  badge: "rgba(124,58,237,0.25)", badgeText: "#a78bfa"  },
    correct:   { bg: "rgba(34,197,94,0.08)",     border: "rgba(34,197,94,0.45)", text: "#86efac",  badge: "rgba(34,197,94,0.2)",   badgeText: "#22c55e"  },
    wrong:     { bg: "rgba(239,68,68,0.08)",     border: "rgba(239,68,68,0.45)", text: "#fca5a5",  badge: "rgba(239,68,68,0.2)",   badgeText: "#ef4444"  },
  };

  function getColors(key) {
    if (!showResult) return selected === key ? OPTION_COLORS.selected : OPTION_COLORS.default;
    if (key === q.answer)                  return OPTION_COLORS.correct;
    if (key === selected && key !== q.answer) return OPTION_COLORS.wrong;
    return OPTION_COLORS.default;
  }

  const cardBorder = showResult
    ? isCorrect
      ? "1px solid rgba(34,197,94,0.35)"
      : selected
        ? "1px solid rgba(239,68,68,0.25)"
        : "1px solid #1e293b"
    : "1px solid #1e293b";

  const cardShadow = showResult && isCorrect ? "0 0 24px rgba(34,197,94,0.07)" : "none";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.07, ease: "easeOut" }}
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #0b1120 100%)",
        border: cardBorder,
        borderRadius: 16,
        padding: "20px 22px",
        marginBottom: 12,
        boxShadow: cardShadow,
        transition: "border 0.4s ease, box-shadow 0.4s ease",
      }}
    >
      {/* Question header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <span style={{
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          color: "white",
          borderRadius: 7,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          flexShrink: 0,
          marginTop: 2,
        }}>
          Q{String(i + 1).padStart(2, "0")}
        </span>
        <p style={{ margin: 0, color: "#e2e8f0", fontWeight: 600, fontSize: 14.5, lineHeight: 1.65 }}>
          {q.question}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {Object.entries(q.options).map(([key, value]) => {
          const c = getColors(key);
          const isAnswer = key === q.answer;
          const isWrong  = showResult && key === selected && key !== q.answer;

          return (
            <motion.button
              key={key}
              whileHover={!showResult ? { x: 3 } : {}}
              whileTap={!showResult ? { scale: 0.985 } : {}}
              onClick={() => !showResult && setAnswers((prev) => ({ ...prev, [i]: key }))}
              disabled={showResult}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: c.bg,
                cursor: showResult ? "default" : "pointer",
                textAlign: "left",
                transition: "all 0.22s ease",
              }}
            >
              <span style={{
                width: 27,
                height: 27,
                borderRadius: 7,
                background: c.badge,
                color: c.badgeText,
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.22s",
              }}>
                {key}
              </span>
              <span style={{ color: c.text, fontSize: 13.5, fontWeight: 500, flex: 1, transition: "color 0.22s", lineHeight: 1.5 }}>
                {value}
              </span>
              <AnimatePresence>
                {showResult && isAnswer && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.1 }}
                    style={{ color: "#22c55e", fontSize: 16, flexShrink: 0 }}
                  >
                    ✓
                  </motion.span>
                )}
                {isWrong && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.1 }}
                    style={{ color: "#ef4444", fontSize: 16, flexShrink: 0 }}
                  >
                    ✕
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showResult && q.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#c4b5fd",
              lineHeight: 1.65,
            }}>
              💡 <strong style={{ fontWeight: 600 }}>Explanation: </strong>{q.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Animated score result card ─────────────────────────────────────
function ScoreCard({ score, total, handleReattemptQuiz, handleNewQuiz, loadingQuiz }) {
  const pct = Math.round((score / total) * 100);
  const grade =
    pct >= 80 ? { label: "Excellent!", color: "#22c55e", emoji: "🏆", bg: "rgba(34,197,94,0.08)" }
    : pct >= 60 ? { label: "Good job!",   color: "#f59e0b", emoji: "👍", bg: "rgba(245,158,11,0.08)" }
    :              { label: "Keep going!",  color: "#ef4444", emoji: "💪", bg: "rgba(239,68,68,0.08)"  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      style={{
        background: grade.bg,
        border: `1px solid ${grade.color}33`,
        borderRadius: 16,
        padding: "28px 24px",
        marginTop: 16,
        textAlign: "center",
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 18 }}
        style={{ fontSize: 44, marginBottom: 10, display: "block" }}
      >
        {grade.emoji}
      </motion.div>

      <p style={{ margin: "0 0 2px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>
        Your Score
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 42, fontWeight: 800, color: "white", lineHeight: 1.1 }}>
        {score}
        <span style={{ fontSize: 22, fontWeight: 500, color: "#475569" }}> / {total}</span>
      </p>
      <p style={{ margin: "0 0 20px", color: grade.color, fontSize: 14, fontWeight: 600 }}>
        {grade.label} · {pct}%
      </p>

      {/* Animated progress bar */}
      <div style={{ background: "#1e293b", borderRadius: 99, height: 7, marginBottom: 24, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            height: "100%",
            borderRadius: 99,
            background: `linear-gradient(90deg, ${grade.color}bb, ${grade.color})`,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleReattemptQuiz}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🔁 Retry
        </motion.button>
        <motion.button
          whileHover={!loadingQuiz ? { scale: 1.04, boxShadow: "0 0 20px rgba(124,58,237,0.3)" } : {}}
          whileTap={!loadingQuiz ? { scale: 0.96 } : {}}
          onClick={handleNewQuiz}
          disabled={loadingQuiz}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "none",
            background: loadingQuiz ? "#1e293b" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: loadingQuiz ? "#475569" : "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: loadingQuiz ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {loadingQuiz ? "Generating..." : "🧠 New Quiz"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main QuizSection ───────────────────────────────────────────────
export default function QuizSection() {
  const {
    quiz, loadingQuiz, answers, setAnswers,
    showResult, setShowResult, usedContext,
    score, generateQuiz, handleReattemptQuiz, handleNewQuiz,
  } = useDashboard();

  const [submitting, setSubmitting] = useState(false);

  const allAnswered = quiz && Object.keys(answers).length === quiz.length;
  const answeredCount = Object.keys(answers).length;

  const handleSubmit = () => {
    setSubmitting(true);
    setShowResult(true);
    setSubmitting(false);
  };

  return (
    <motion.div
      id="section-quiz"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      style={{
        background: "linear-gradient(180deg, #080d18 0%, #0a0f1e 100%)",
        border: "1px solid #1e293b",
        borderRadius: 20,
        padding: "24px",
        marginTop: 24,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
            boxShadow: "0 0 20px rgba(124,58,237,0.3)",
          }}>
            ⚡
          </div>
          <div>
            <h3 style={{ margin: 0, color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>Smart Quiz</h3>
            <p style={{ margin: 0, color: "#475569", fontSize: 12 }}>
              {quiz ? `${quiz.length} questions` : "AI-generated from your weak topics"}
            </p>
          </div>
        </div>

        {(!quiz || showResult) && !loadingQuiz && (
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 0 22px rgba(124,58,237,0.35)" }}
            whileTap={{ scale: 0.96 }}
            onClick={generateQuiz}
            style={{
              padding: "9px 18px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            🧠 Generate Quiz
          </motion.button>
        )}
      </div>

      {/* ── Context badge ─────────────────────────────────────────── */}
      <AnimatePresence>
        {quiz && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 20,
              background: usedContext ? "rgba(34,197,94,0.09)" : "rgba(245,158,11,0.09)",
              border: `1px solid ${usedContext ? "rgba(34,197,94,0.28)" : "rgba(245,158,11,0.28)"}`,
              fontSize: 12,
              color: usedContext ? "#86efac" : "#fcd34d",
              fontWeight: 500,
              marginBottom: 18,
            }}
          >
            {usedContext ? "✅ Based on your notes" : "⚠️ Based on general knowledge"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!quiz && !loadingQuiz && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "52px 20px" }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ fontSize: 52, marginBottom: 14 }}
          >
            ⚡
          </motion.div>
          <p style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 17, margin: "0 0 8px" }}>
            No quiz yet
          </p>
          <p style={{ color: "#475569", fontSize: 13, margin: "0 0 28px", lineHeight: 1.7, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
            Generate a personalized quiz based on your weak topics and uploaded notes.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 28px rgba(124,58,237,0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={generateQuiz}
            style={{
              padding: "13px 32px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(124,58,237,0.25)",
            }}
          >
            🧠 Generate Weak Topic Quiz
          </motion.button>
        </motion.div>
      )}

      {/* ── Skeleton loader ───────────────────────────────────────── */}
      {loadingQuiz && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            background: "rgba(124,58,237,0.07)",
            border: "1px solid rgba(124,58,237,0.18)",
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 16, animation: "spin 1.2s linear infinite", display: "inline-block" }}>⟳</span>
            <span style={{ color: "#a78bfa", fontSize: 13, fontWeight: 500 }}>
              AI is crafting your quiz from weak topics...
            </span>
          </div>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} index={i} />)}
        </motion.div>
      )}

      {/* ── Questions ─────────────────────────────────────────────── */}
      {quiz && !loadingQuiz && (
        <>
          {quiz.map((q, i) => (
            <QuestionCard
              key={i}
              q={q}
              i={i}
              answers={answers}
              setAnswers={setAnswers}
              showResult={showResult}
            />
          ))}

          {/* Submit button */}
          {!showResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: quiz.length * 0.07 + 0.1 }}
              style={{ textAlign: "center", paddingTop: 8 }}
            >
              {!allAnswered && (
                <p style={{ color: "#334155", fontSize: 12, marginBottom: 10 }}>
                  {answeredCount} of {quiz.length} answered
                </p>
              )}
              <motion.button
                whileHover={allAnswered && !submitting ? { scale: 1.04, boxShadow: "0 0 24px rgba(37,99,235,0.4)" } : {}}
                whileTap={allAnswered && !submitting ? { scale: 0.96 } : {}}
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                style={{
                  padding: "13px 36px",
                  borderRadius: 12,
                  border: "none",
                  background: allAnswered && !submitting
                    ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                    : "#1e293b",
                  color: allAnswered && !submitting ? "white" : "#334155",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: allAnswered && !submitting ? "pointer" : "not-allowed",
                  transition: "all 0.25s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: allAnswered && !submitting ? "0 0 16px rgba(37,99,235,0.2)" : "none",
                }}
              >
                {submitting
                  ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Submitting...</>
                  : "Submit Quiz →"
                }
              </motion.button>
            </motion.div>
          )}

          {/* Score card */}
          {showResult && (
            <ScoreCard
              score={score}
              total={quiz.length}
              handleReattemptQuiz={handleReattemptQuiz}
              handleNewQuiz={handleNewQuiz}
              loadingQuiz={loadingQuiz}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
