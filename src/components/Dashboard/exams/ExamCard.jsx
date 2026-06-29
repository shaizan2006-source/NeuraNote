// src/components/Dashboard/exams/ExamCard.jsx
"use client";

import { useState, useMemo, Component } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import ExamCountdownSection from "./ExamCountdownSection";
import WeakTopicsSection from "./WeakTopicsSection";
import StudySuggestion from "./StudySuggestion";
import StudyPlanModal from "./StudyPlanModal";
import AddExamModal from "./AddExamModal";
import { writeSessionStorage } from "@/lib/examUtils";

// ── Error Boundary ─────────────────────────────────────────────────────────
class ExamCardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error("[ExamCard]", err); }
  render() {
    if (this.state.hasError) return (
      <div style={{
        padding: 16, textAlign: "center",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>
          Something went wrong loading exam data.
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          style={{
            marginTop: 8, fontSize: 10, padding: "4px 12px",
            background: "color-mix(in srgb, var(--accent) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            borderRadius: 4, color: "var(--accent)", cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── Progress Snapshot (inline helper) ──────────────────────────────────────
function ProgressSnapshot({ masteryTopics, subject, lastActiveDate, normalizeSubject }) {
  const subjectTopics = subject
    ? masteryTopics.filter((t) => normalizeSubject(t.subject) === normalizeSubject(subject))
    : masteryTopics;

  const avgAccuracy = subjectTopics.length > 0
    ? Math.round(subjectTopics.reduce((sum, t) => sum + (t.mastery_score || 0), 0) / subjectTopics.length)
    : 0;

  const mastered = subjectTopics.filter((t) => (t.mastery_score || 0) >= 70).length;
  const total    = subjectTopics.length;

  const lastActive = lastActiveDate
    ? (() => {
        const d = Math.floor((Date.now() - new Date(lastActiveDate).getTime()) / 86_400_000);
        return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
      })()
    : "—";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
      {[
        { value: `${avgAccuracy}%`, label: "Avg accuracy", color: "var(--success)" },
        { value: total ? `${mastered}/${total}` : "—", label: "Mastered", color: "var(--accent)" },
        { value: lastActive, label: "Last active", color: "var(--warning)" },
      ].map(({ value, label, color }) => (
        <div key={label} style={{
          textAlign: "center", padding: "7px 4px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6,
        }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color }}>{value}</p>
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--text-tertiary)" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main ExamCard ───────────────────────────────────────────────────────────
export default function ExamCard() {
  const {
    exams, selectedExam, weakTopics, masteryTopics,
    normalizeSubject, getDaysLeft, lastActiveDate,
    fetchExam, setSelectedExam,
  } = useDashboard();

  const router = useRouter();
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showPlanModal,  setShowPlanModal]  = useState(false);

  // ── Subject-filtered weak topics (memoized) ────────────────────────────
  const filteredWeakTopics = useMemo(() => {
    if (!selectedExam) return [];
    if (!selectedExam.subject) return weakTopics.slice(0, 5);
    const examSubject = normalizeSubject(selectedExam.subject);
    return weakTopics
      .filter((t) => normalizeSubject(t.subject) === examSubject)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [weakTopics, selectedExam, normalizeSubject]);

  // ── Navigation helpers ─────────────────────────────────────────────────
  function navigateToQuiz(topic) {
    writeSessionStorage("amn_prefill", {
      subject: selectedExam?.subject ?? "general",
      topic,
    });
    router.push("/quiz");
  }

  function navigateToAskAI(topic) {
    writeSessionStorage(
      "amn_ask_prefill",
      `Explain ${topic} from ${selectedExam?.subject ?? "this subject"} in simple terms`
    );
    router.push("/sage");
  }

  function handleFixWeakAreas() {
    writeSessionStorage("amn_prefill", {
      subject: selectedExam?.subject ?? "general",
      topics: filteredWeakTopics.map((t) => t.topic),
    });
    router.push("/quiz");
  }

  function handleExamAdded(newExam) {
    fetchExam();
    setSelectedExam(newExam);
    setShowAddModal(false);
  }

  const hasWeakTopics = filteredWeakTopics.length > 0;
  const isNullSubject = selectedExam != null && !selectedExam.subject;

  return (
    <ExamCardErrorBoundary>
      <div style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))",
        borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
        borderColor: "color-mix(in srgb, var(--accent) 28%, transparent) color-mix(in srgb, var(--accent) 28%, transparent) color-mix(in srgb, var(--accent) 28%, transparent) color-mix(in srgb, var(--accent) 32%, transparent)",
        borderRadius: 12, padding: 14,
        display: "flex", flexDirection: "column", gap: 10,
        height: "100%", boxSizing: "border-box",
      }}>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Exams</p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--text-tertiary)" }}>
              Track upcoming exams and focus on weak areas
            </p>
          </div>
          {selectedExam?.subject && (
            <span style={{
              padding: "2px 8px", background: "color-mix(in srgb, var(--accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)", borderRadius: 10,
              fontSize: 9, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase",
            }}>
              {selectedExam.subject}
            </span>
          )}
        </div>

        {/* Countdown */}
        <ExamCountdownSection exams={exams} />

        {/* Progress Snapshot — only when exam selected */}
        {selectedExam && (
          <ProgressSnapshot
            masteryTopics={masteryTopics}
            subject={selectedExam.subject}
            lastActiveDate={lastActiveDate}
            normalizeSubject={normalizeSubject}
          />
        )}

        {/* Study Suggestion */}
        <StudySuggestion
          topics={filteredWeakTopics}
          subject={selectedExam?.subject ?? ""}
          onQuickQuiz={navigateToQuiz}
        />

        {/* Weak Topics */}
        <WeakTopicsSection
          topics={filteredWeakTopics}
          loading={false}
          selectedExam={selectedExam}
          nullSubject={isNullSubject}
          onAddExam={() => setShowAddModal(true)}
          onPractice={navigateToQuiz}
          onAskAI={navigateToAskAI}
          onStartQuiz={() => navigateToQuiz("")}
        />

        {/* Action buttons — shown only when weak topics exist */}
        {hasWeakTopics && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              onClick={handleFixWeakAreas}
              style={{
                padding: "7px 10px",
                background: "linear-gradient(135deg, color-mix(in srgb, var(--error) 15%, transparent), color-mix(in srgb, var(--error) 5%, transparent))",
                border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
                borderRadius: 6, color: "var(--error)", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}
            >
              ⚡ Fix Weak Areas
            </button>
            <button
              onClick={() => setShowPlanModal(true)}
              style={{
                padding: "7px 10px",
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 15%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                borderRadius: 6, color: "var(--accent)", fontSize: 10, fontWeight: 600, cursor: "pointer",
              }}
            >
              📅 Study Plan
            </button>
          </div>
        )}

        {/* Add exam button — always visible */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            marginTop: "auto", padding: "7px 12px",
            background: "var(--accent-grad)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 6,
            color: "var(--bg-base)", fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          + Add Exam
        </button>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddExamModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleExamAdded}
        />
      )}
      {showPlanModal && selectedExam && (
        <StudyPlanModal
          exam={selectedExam}
          weakTopics={filteredWeakTopics}
          getDaysLeft={getDaysLeft}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </ExamCardErrorBoundary>
  );
}
