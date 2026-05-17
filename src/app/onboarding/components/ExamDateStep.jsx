"use client";

const EXAM_DATES = {
  jee_main_2027: "2027-01-20",
  jee_main_2026: "2026-01-22",
  jee_advanced_2027: "2027-05-25",
  neet_ug_2027: "2027-05-02",
  neet_ug_2026: "2026-05-04",
};

export default function ExamDateStep({ value, examType, onChange, onNext, onSkip }) {
  const suggested = EXAM_DATES[examType] ?? "";
  const displayValue = value || suggested;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F9FAFB", marginBottom: 8, textAlign: "center" }}>
        When is your exam?
      </h2>
      <p style={{ color: "#9CA3AF", textAlign: "center", marginBottom: 28, fontSize: 14 }}>
        We'll build your countdown and pace your revision to this date.
      </p>

      <input
        type="date"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "2px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "12px 14px",
          color: "#F9FAFB",
          fontSize: 16,
          marginBottom: 24,
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={() => onNext(displayValue)}
        style={{
          width: "100%",
          background: "#8B5CF6",
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "13px",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Continue →
      </button>

      <button onClick={onSkip} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
        Skip
      </button>
    </div>
  );
}
