"use client";

export default function StudyPlanCard({ studyPlanProgress = null, dailyPlan = [], onSwitchToStudy = null }) {
  const prog    = studyPlanProgress || { currentDay: 0, totalDays: 30, completionPct: 0 };
  const nextTask = dailyPlan[0] || null;

  return (
    <div id="study-plan" style={{
      background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Study Plan</p>

      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>
          Day {prog.currentDay}
          <span style={{ fontSize: 13, fontWeight: 400, color: "#71717a" }}> of {prog.totalDays}</span>
        </p>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#22C55E" }}>{prog.completionPct}%</span>
      </div>

      <div style={{ marginTop: 8, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
        <div style={{
          height: 5, width: `${prog.completionPct}%`,
          background: "linear-gradient(90deg, #8B5CF6, #22C55E)",
          borderRadius: 3, transition: "width 1s ease-out",
        }} />
      </div>

      {nextTask && (
        <div style={{ marginTop: 10, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Up next</p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nextTask}
          </p>
        </div>
      )}

      <button
        onClick={onSwitchToStudy}
        style={{
          marginTop: 12, width: "100%", padding: "9px 0",
          background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
          border: "none", borderRadius: 8, color: "#fff",
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
