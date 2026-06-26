"use client";

function readinessColor(pct) {
  return pct >= 70 ? "var(--success)" : pct >= 40 ? "var(--warning)" : "var(--error)";
}

export default function ExamCountdownCard({ examName = null, examDaysLeft = null, examReadiness = 0, syllabusPct = 0 }) {
  if (!examName) {
    return (
      <div id="exam" style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "18px 20px",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 140,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>No exam scheduled</p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "var(--text-disabled)" }}>Go to dashboard to add one</p>
      </div>
    );
  }

  const isPast = examDaysLeft != null && examDaysLeft <= 0;
  const daysColor = examDaysLeft == null ? "var(--text-tertiary)" : isPast ? "var(--text-tertiary)" : examDaysLeft > 30 ? "var(--success)" : examDaysLeft > 7 ? "var(--warning)" : "var(--error)";

  return (
    <div id="exam" style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "18px 20px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Exam Countdown</p>
      <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--text-secondary)" }}>{examName}</p>

      {isPast ? (
        <p style={{ margin: "10px 0", fontSize: 13, color: "var(--text-tertiary)" }}>This exam has passed</p>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: daysColor, lineHeight: 1 }}>{examDaysLeft ?? "—"}</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-tertiary)" }}>days left</p>
            {examDaysLeft != null && examDaysLeft <= 7 && <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--error)", fontWeight: 600 }}>Final sprint!</p>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 18 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Readiness</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: readinessColor(examReadiness) }}>{examReadiness}%</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Syllabus done</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{syllabusPct}%</p>
        </div>
      </div>

      <div style={{ marginTop: 8, height: 4, background: "var(--border-hairline)", borderRadius: 2 }}>
        <div style={{
          height: 4, width: `${examReadiness}%`, background: readinessColor(examReadiness),
          borderRadius: 2, transition: "width 1s ease-out",
        }} />
      </div>
    </div>
  );
}
