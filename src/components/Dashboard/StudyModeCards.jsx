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

function entry(delay) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
  };
}

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
      {...entry(0.08)}
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

      {/* Circular timer */}
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
      {...entry(0.16)}
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="10" y1="14" x2="14" y2="14" />
          </svg>
        </div>
      </div>

      {/* Animated count */}
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
      {...entry(0.24)}
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
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              border: "2px solid rgba(34,197,94,0.3)",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.05, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
            style={{
              position: "absolute", inset: -7, borderRadius: "50%",
              border: "2px solid rgba(34,197,94,0.4)",
            }}
          />
          <div style={{
            width: 54, height: 54, borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))",
            border: "2px solid rgba(34,197,94,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
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
      {...entry(0.32)}
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
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 14,
      }}>
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
              margin: "3px 0 0", fontSize: 26, fontWeight: 800, lineHeight: 1,
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
            value: nextExam && totalSubjects > 0 ? `${subjectsDone}/${totalSubjects}` : "—",
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
      {/* Exams spans 2 columns in the bottom row */}
      <div style={{ gridColumn: "span 2", height: "100%" }}>
        <ExamsCard />
      </div>
    </>
  );
}
