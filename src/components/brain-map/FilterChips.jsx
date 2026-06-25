"use client";

const MASTERY_OPTIONS = [
  { label: "All", value: 0 },
  { label: "Mastered (80%+)", value: 0.8 },
  { label: "Strong (60%+)", value: 0.6 },
  { label: "Shaky (30%+)", value: 0.3 },
];

export default function FilterChips({ subjects, activeSubject, activeMinMastery, onSubjectChange, onMasteryChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 16px", borderBottom: "1px solid var(--border-hairline)" }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", alignSelf: "center", marginRight: 4 }}>Subject:</span>
      {["All", ...subjects].map((s) => {
        const active = activeSubject === s || (!activeSubject && s === "All");
        return (
        <button
          key={s}
          onClick={() => onSubjectChange(s === "All" ? null : s)}
          style={{
            background: active ? "var(--accent)" : "var(--bg-surface)",
            color: active ? "var(--bg-base)" : "var(--text-secondary)",
            border: "none",
            borderRadius: 16,
            padding: "4px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {s}
        </button>
        );
      })}

      <span style={{ fontSize: 12, color: "var(--text-tertiary)", alignSelf: "center", marginLeft: 8, marginRight: 4 }}>Mastery:</span>
      {MASTERY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onMasteryChange(opt.value)}
          style={{
            background: activeMinMastery === opt.value ? "var(--accent)" : "var(--bg-surface)",
            color: activeMinMastery === opt.value ? "var(--bg-base)" : "var(--text-secondary)",
            border: "none",
            borderRadius: 16,
            padding: "4px 12px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
