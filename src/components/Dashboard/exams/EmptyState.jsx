// src/components/dashboard/exams/EmptyState.jsx
"use client";

/**
 * @param {{ variant: "no-exam" | "no-topics", onAction: () => void }} props
 */
export default function EmptyState({ variant, onAction }) {
  const isNoExam = variant === "no-exam";

  return (
    <div style={{
      padding: "20px 12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.06)",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    }}>
      <span style={{ fontSize: 22 }}>{isNoExam ? "📚" : "🎉"}</span>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#e4e4e7" }}>
        {isNoExam ? "No exam selected" : "No weak areas detected"}
      </p>
      <p style={{ margin: 0, fontSize: 10, color: "#71717a", maxWidth: 200 }}>
        {isNoExam
          ? "Add an exam to start tracking weak areas"
          : "You're doing great in this subject. Keep practicing to stay sharp."}
      </p>
      <button
        onClick={onAction}
        style={{
          marginTop: 4,
          padding: "6px 14px",
          background: isNoExam
            ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
            : "rgba(34,211,238,0.1)",
          border: isNoExam ? "none" : "1px solid rgba(34,211,238,0.3)",
          borderRadius: 6,
          color: isNoExam ? "#fff" : "#22d3ee",
          fontSize: 10,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {isNoExam ? "+ Add Exam" : "Start Practice Quiz"}
      </button>
    </div>
  );
}
