"use client";

export default function StudyPlanCard({ studyPlanProgress = null, dailyPlan = [], onSwitchToStudy = null }) {
  const prog    = studyPlanProgress || { currentDay: 0, totalDays: 30, completionPct: 0 };
  const nextTask = dailyPlan[0] || null;

  return (
    <div id="study-plan" style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "18px 20px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Study Plan</p>

      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
          Day {prog.currentDay}
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-tertiary)" }}> of {prog.totalDays}</span>
        </p>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>{prog.completionPct}%</span>
      </div>

      <div style={{ marginTop: 8, height: 5, background: "var(--border-hairline)", borderRadius: 3 }}>
        <div style={{
          height: 5, width: `${prog.completionPct}%`,
          background: "linear-gradient(90deg, var(--accent), var(--success))",
          borderRadius: 3, transition: "width 1s ease-out",
        }} />
      </div>

      {nextTask && (
        <div style={{ marginTop: 10, background: "var(--bg-surface)", borderRadius: 8, padding: "8px 10px" }}>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Up next</p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nextTask}
          </p>
        </div>
      )}

      <button
        onClick={onSwitchToStudy}
        style={{
          marginTop: 12, width: "100%", padding: "9px 0",
          background: "var(--accent-grad)",
          border: "none", borderRadius: 8, color: "var(--bg-base)",
          fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        Continue Today's Plan →
      </button>
    </div>
  );
}
