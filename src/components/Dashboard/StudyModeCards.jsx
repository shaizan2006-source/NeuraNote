"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// ── Shared constants ───────────────────────────────────────────────
const CARD = {
  borderRadius: 20,
  background: "var(--bg-surface)",
  border: "1px solid var(--border-hairline)",
  boxShadow: "var(--shadow-card)",
  padding: "18px",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  boxSizing: "border-box",
  cursor: "pointer",
  overflow: "hidden",
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
  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");
  // Proportional dot count: 36 at full time, 0 at 0:00
  const activeDotCount = Math.round((secs / totalSecs) * 36);

  return (
    <motion.div
      {...entry(0.08)}
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 0 40px var(--accent-glow-soft)" }}
      whileTap={{ scale: 0.97 }}
      // No /focus route exists yet (FocusModeSection is unmounted) — display-only
      // until the founder picks a destination. Was router.push("/focus") → 404.
      style={{ ...CARD, flexDirection: "column", alignItems: "flex-start", gap: 0, cursor: "default" }}
    >
      {/* Top: icon + label row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "var(--bg-surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Focus Mode</p>
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-tertiary)" }}>Pomodoro 25m</p>
        </div>
      </div>

      {/* Center: large dot-ring timer */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 130, height: 130 }}>

          {/* Ambient glow */}
          <motion.div
            animate={{ opacity: [0.3, 0.65, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          {/* Outer pulse */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              border: "1.5px solid color-mix(in srgb, var(--accent) 15%, transparent)", pointerEvents: "none",
            }}
          />
          {/* Inner pulse */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.05, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
            style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: "1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)", pointerEvents: "none",
            }}
          />

          {/* Track dots */}
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {Array.from({ length: 36 }, (_, i) => {
              const angle = (i * 10 - 90) * (Math.PI / 180);
              return (
                <circle key={i}
                  cx={65 + 49 * Math.cos(angle)}
                  cy={65 + 49 * Math.sin(angle)}
                  r={3} fill="var(--border-strong)"
                />
              );
            })}
          </svg>

          {/* Active dots */}
          <svg width="130" height="130" viewBox="0 0 130 130"
            style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 4px var(--accent))", pointerEvents: "none" }}
          >
            {Array.from({ length: 36 }, (_, i) => {
              if (i >= activeDotCount) return null;
              const angle = (i * 10 - 90) * (Math.PI / 180);
              const opacity = Math.max(0.3, 1 - (i / Math.max(activeDotCount - 1, 1)) * 0.7);
              return (
                <circle key={i}
                  cx={65 + 49 * Math.cos(angle)}
                  cy={65 + 49 * Math.sin(angle)}
                  r={3} fill="var(--accent)" opacity={opacity}
                />
              );
            })}
          </svg>

          {/* Timer text */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-1px", fontFamily: "var(--font-geist-mono), monospace" }}>
              {mm}:{ss}
            </span>
            <span style={{ fontSize: 9, color: "var(--text-tertiary)", marginTop: 2, fontWeight: 600 }}>
              Coming soon
            </span>
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
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 0 40px rgba(0,0,0,0.55)" }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push("/quiz/friday")}
      style={CARD}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Quiz</p>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-hairline)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="10" y1="14" x2="14" y2="14" />
          </svg>
        </div>
      </div>

      {/* Body: count (left) + 3D cards (right), both bottom-aligned */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        {/* Animated count */}
        <div>
          <motion.p
            key={count}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {count}
          </motion.p>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-tertiary)" }}>cards ready</p>
        </div>

        {/* 3D stacked flashcards */}
        <motion.div
          initial={{ opacity: 0, y: 8, rotate: 5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ position: "relative", width: 70, height: 72, flexShrink: 0 }}
        >
          {/* Back card */}
          <div style={{
            position: "absolute", right: 6, top: 6,
            width: 52, height: 66, borderRadius: 8,
            background: "linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface-3))",
            transform: "rotate(8deg)", opacity: 0.6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "var(--text-disabled)",
          }}>?</div>
          {/* Mid card */}
          <div style={{
            position: "absolute", right: 2, top: 2,
            width: 52, height: 66, borderRadius: 8,
            background: "linear-gradient(135deg, var(--bg-surface-3), var(--text-disabled))",
            transform: "rotate(3deg)", opacity: 0.75,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "var(--text-tertiary)",
          }}>?</div>
          {/* Front card */}
          <div style={{
            position: "absolute", right: 0, top: 0,
            width: 52, height: 66, borderRadius: 8,
            background: "var(--accent-grad)",
            boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 35%, transparent)", opacity: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, color: "var(--bg-base)", fontWeight: 700,
          }}>?</div>
        </motion.div>
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
      whileHover={{ scale: 1.04, y: -4, boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 0 40px rgba(0,0,0,0.55)" }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push("/call-tutor")}
      style={CARD}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "color-mix(in srgb, var(--success) 10%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="8" y1="22" x2="16" y2="22" />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Call Tutor</p>
          <p style={{ margin: "1px 0 0", fontSize: 9, color: "var(--text-tertiary)" }}>Speak to learn</p>
        </div>
      </div>

      {/* Beta badge */}
      <div style={{
        display: "inline-block", padding: "2px 8px",
        background: "color-mix(in srgb, var(--success) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--success) 22%, transparent)",
        borderRadius: 20, fontSize: 8, color: "var(--success)", fontWeight: 700,
        marginBottom: 6, alignSelf: "flex-start",
      }}>
        Beta
      </div>

      {/* Pulsing mic orb — 80px, centered */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          {/* Outer pulse */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: -18, borderRadius: "50%",
              border: "2px solid color-mix(in srgb, var(--success) 30%, transparent)", pointerEvents: "none",
            }}
          />
          {/* Inner pulse */}
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.05, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
            style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: "2px solid color-mix(in srgb, var(--success) 40%, transparent)", pointerEvents: "none",
            }}
          />
          {/* Orb */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--success) 20%, transparent), color-mix(in srgb, var(--success) 8%, transparent))",
            border: "2px solid color-mix(in srgb, var(--success) 45%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={e => { e.stopPropagation(); router.push("/call-tutor"); }}
        style={{
          width: "100%", padding: "7px", background: "var(--accent-grad)",
          border: "1px solid var(--accent-dim)", borderRadius: 9,
          color: "var(--bg-base)", fontSize: 11, fontWeight: 600, cursor: "pointer",
          marginTop: 6, transition: "all 200ms ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "var(--accent-bright)";
          e.currentTarget.style.borderColor = "var(--accent-bright)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--accent-grad)";
          e.currentTarget.style.borderColor = "var(--accent-dim)";
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
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push("/mock-test")}
      style={{
        ...CARD,
        background: isFinalSprint
          ? "linear-gradient(135deg, color-mix(in srgb, var(--error) 10%, transparent), var(--bg-surface))"
          : "var(--bg-surface)",
        border: isFinalSprint
          ? "1px solid color-mix(in srgb, var(--error) 20%, transparent)"
          : "1px solid var(--border-hairline)",
        boxShadow: isFinalSprint
          ? "0 8px 40px color-mix(in srgb, var(--error) 12%, transparent)"
          : "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "var(--bg-surface-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Exams</p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--text-tertiary)", lineHeight: 1.3 }}>
              Track upcoming exams and focus on weak areas
            </p>
          </div>
        </div>

        {isFinalSprint && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              padding: "2px 8px",
              background: "color-mix(in srgb, var(--error) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--error) 28%, transparent)",
              borderRadius: 20,
              fontSize: 9,
              color: "var(--error)",
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
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-hairline)",
          borderRadius: 9,
          padding: "8px 12px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)" }}>
              {nextExam.name || "Exam"}
            </p>
            <p style={{
              margin: "2px 0 0", fontSize: 22, fontWeight: 800, lineHeight: 1,
              color: isFinalSprint ? "var(--error)" : "var(--text-primary)",
              fontFamily: "var(--font-geist-mono), monospace",
            }}>
              {daysLeft <= 0 ? "Today!" : daysLeft}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)" }}>days left</p>
            {isFinalSprint && (
              <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--error)", fontWeight: 600 }}>
                Final sprint!
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border-hairline)",
          borderRadius: 9,
          padding: "10px 12px",
          marginBottom: 8,
          textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: 10, color: "var(--text-tertiary)" }}>
            No upcoming exams — add one on the Exams page
          </p>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { value: nextExam ? `${syllabus}%` : "—", label: "Syllabus", color: "var(--success)" },
          {
            value: nextExam && totalSubjects > 0 ? `${subjectsDone}/${totalSubjects}` : "—",
            label: "Subjects",
            color: "var(--text-primary)",
          },
          { value: "—", label: "Mock Tests", color: "var(--text-tertiary)" },
        ].map(({ value, label, color }) => (
          <div key={label} style={{
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 7,
            padding: "6px 8px",
            textAlign: "center",
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color, fontFamily: "var(--font-geist-mono), monospace" }}>{value}</p>
            <p style={{ margin: "2px 0 0", fontSize: 8, color: "var(--text-tertiary)" }}>{label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Named exports for individual cards ────────────────────────────
export { FocusModeCard, QuizCard, CallTutorCard, ExamsCard };

// ── Main export (legacy) ──────────────────────────────────────────
export default function StudyModeCards() {
  return (
    <>
      <FocusModeCard />
      <QuizCard />
      <CallTutorCard />
      <div style={{ gridColumn: "span 2" }}>
        <ExamsCard />
      </div>
    </>
  );
}
