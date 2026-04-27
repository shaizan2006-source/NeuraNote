"use client";

export default function WeeklyRecapCard({
  thisWeekMins    = 0,
  weeklyChange    = 0,
  strongestSubject = null,
  learningTrend   = null,   // 'rising' | 'steady' | 'declining' from learning_events
  modeBalance     = null,   // { answeringMins, coachMins, ratio }
}) {
  const hrs    = Math.floor(thisWeekMins / 60);
  const mins   = thisWeekMins % 60;
  const up     = weeklyChange >= 0;
  const timeLabel = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;

  return (
    <div
      id="insights"
      style={{
        background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(10,10,30,0.5))",
        border: "1px solid rgba(34,211,238,0.14)",
        borderRadius: 14,
        padding: "18px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      {/* Title + time */}
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Weekly Recap
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#f4f4f5", lineHeight: 1 }}>
          {timeLabel} studied
        </p>
      </div>

      {/* % change indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: up ? "#22C55E" : "#EF4444" }}>
          {up ? "↑" : "↓"} {Math.abs(weeklyChange)}%
        </span>
        <span style={{ fontSize: 11, color: "#52525b" }}>vs last week</span>
      </div>

      {/* Strongest subject badge */}
      {strongestSubject ? (
        <div style={{
          background: "rgba(139,92,246,0.09)",
          border: "1px solid rgba(139,92,246,0.18)",
          borderRadius: 10,
          padding: "8px 16px",
          flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strongest subject</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "#8B5CF6" }}>{strongestSubject}</p>
        </div>
      ) : null}

      {/* Learning trend badge */}
      {learningTrend && learningTrend !== "steady" && (
        <div style={{
          background: learningTrend === "rising" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${learningTrend === "rising" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          borderRadius: 10, padding: "6px 12px", flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trend</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: learningTrend === "rising" ? "#22C55E" : "#EF4444" }}>
            {learningTrend === "rising" ? "↑ Rising" : "↓ Declining"}
          </p>
        </div>
      )}

      {/* Mode balance */}
      {modeBalance && (modeBalance.answeringMins > 0 || modeBalance.coachMins > 0) && (
        <div style={{
          background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)",
          borderRadius: 10, padding: "6px 12px", flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mode split</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "#fbbf24" }}>
            {modeBalance.answeringMins}m answer · {modeBalance.coachMins}m coach
          </p>
        </div>
      )}

      {/* Motivational message */}
      <p style={{ margin: 0, fontSize: 11, color: up ? "#22C55E" : "#71717a", flexShrink: 0 }}>
        {weeklyChange === 0 ? "Same as last week" : up ? "You're improving — keep going!" : "Let's pick it up this week"}
      </p>
    </div>
  );
}
