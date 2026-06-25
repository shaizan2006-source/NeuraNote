"use client";

const OPTIONS = [
  { id: "morning", label: "Morning", sub: "5 AM – 11 AM" },
  { id: "afternoon", label: "Afternoon", sub: "11 AM – 5 PM" },
  { id: "evening", label: "Evening", sub: "5 PM – 10 PM" },
  { id: "flexible", label: "Flexible", sub: "Varies day to day" },
];

export default function StudyWindowStep({ value, onChange, onNext, onSkip }) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
        When do you study best?
      </h2>
      <p style={{ color: "var(--text-tertiary)", textAlign: "center", marginBottom: 28, fontSize: 14 }}>
        We'll send reminders and schedule reviews during your peak window.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              background: value === opt.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
              border: `2px solid ${value === opt.id ? "var(--accent-dim)" : "var(--border-hairline)"}`,
              borderRadius: 12,
              padding: "14px 16px",
              color: value === opt.id ? "var(--accent-bright)" : "var(--text-secondary)",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: value === opt.id ? 600 : 400 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{opt.sub}</div>
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
          marginBottom: 12,
        }}
      >
        Continue →
      </button>

      <button onClick={onSkip} style={{ width: "100%", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>
        Skip
      </button>
    </div>
  );
}
