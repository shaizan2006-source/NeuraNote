"use client";

const OPTIONS = ["Class 11", "Class 12", "Drop year", "Other"];

export default function ClassLevelStep({ value, onChange, onNext, onSkip }) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F9FAFB", marginBottom: 8, textAlign: "center" }}>
        What year are you in?
      </h2>
      <p style={{ color: "#9CA3AF", textAlign: "center", marginBottom: 28, fontSize: 14 }}>
        Helps us gauge how much time you have and calibrate the plan.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              background: value === opt ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
              border: `2px solid ${value === opt ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12,
              padding: "14px 16px",
              color: value === opt ? "#A78BFA" : "#E5E7EB",
              fontSize: 14,
              fontWeight: value === opt ? 600 : 400,
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        disabled={!value}
        onClick={onNext}
        style={{
          width: "100%",
          background: value ? "#8B5CF6" : "rgba(255,255,255,0.06)",
          color: value ? "#fff" : "#6B7280",
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

      <button onClick={onSkip} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
        Skip
      </button>
    </div>
  );
}
