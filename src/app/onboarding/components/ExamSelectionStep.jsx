"use client";

const EXAMS = [
  { id: "jee_main_2027", label: "JEE Main 2027" },
  { id: "jee_main_2026", label: "JEE Main 2026" },
  { id: "jee_advanced_2027", label: "JEE Advanced 2027" },
  { id: "neet_ug_2027", label: "NEET UG 2027" },
  { id: "neet_ug_2026", label: "NEET UG 2026" },
  { id: "other", label: "Other" },
];

export default function ExamSelectionStep({ value, onChange, onNext }) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
        Which exam are you preparing for?
      </h2>
      <p style={{ color: "var(--text-tertiary)", textAlign: "center", marginBottom: 28, fontSize: 14 }}>
        We'll personalise everything — syllabus, tips, cohort — around your exam.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
        {EXAMS.map((exam) => (
          <button
            key={exam.id}
            onClick={() => onChange(exam.id)}
            style={{
              background: value === exam.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
              border: `2px solid ${value === exam.id ? "var(--accent-dim)" : "var(--border-hairline)"}`,
              borderRadius: 12,
              padding: "14px 16px",
              color: value === exam.id ? "var(--accent-bright)" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: value === exam.id ? 600 : 400,
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            {exam.label}
          </button>
        ))}
      </div>

      <button
        disabled={!value}
        onClick={onNext}
        style={{
          width: "100%",
          background: value ? "var(--accent-grad)" : "var(--bg-surface-2)",
          color: value ? "var(--bg-base)" : "var(--text-disabled)",
          border: "none",
          borderRadius: 10,
          padding: "13px",
          fontSize: 15,
          fontWeight: 600,
          cursor: value ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        Continue →
      </button>
    </div>
  );
}
