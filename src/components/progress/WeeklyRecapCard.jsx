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
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), var(--bg-surface))",
        border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
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
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Weekly Recap
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
          {timeLabel} studied
        </p>
      </div>

      {/* % change indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: up ? "var(--success)" : "var(--error)" }}>
          {up ? "↑" : "↓"} {Math.abs(weeklyChange)}%
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>vs last week</span>
      </div>

      {/* Strongest subject badge */}
      {strongestSubject ? (
        <div style={{
          background: "color-mix(in srgb, var(--accent) 9%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
          borderRadius: 10,
          padding: "8px 16px",
          flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strongest subject</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{strongestSubject}</p>
        </div>
      ) : null}

      {/* Learning trend badge */}
      {learningTrend && learningTrend !== "steady" && (
        <div style={{
          background: learningTrend === "rising" ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--error) 10%, transparent)",
          border: `1px solid ${learningTrend === "rising" ? "color-mix(in srgb, var(--success) 28%, transparent)" : "color-mix(in srgb, var(--error) 28%, transparent)"}`,
          borderRadius: 10, padding: "6px 12px", flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trend</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: learningTrend === "rising" ? "var(--success)" : "var(--error)" }}>
            {learningTrend === "rising" ? "↑ Rising" : "↓ Declining"}
          </p>
        </div>
      )}

      {/* Mode balance */}
      {modeBalance && (modeBalance.answeringMins > 0 || modeBalance.coachMins > 0) && (
        <div style={{
          background: "color-mix(in srgb, var(--warning) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--warning) 28%, transparent)",
          borderRadius: 10, padding: "6px 12px", flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mode split</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 600, color: "var(--warning)" }}>
            {modeBalance.answeringMins}m answer · {modeBalance.coachMins}m coach
          </p>
        </div>
      )}

      {/* Motivational message */}
      <p style={{ margin: 0, fontSize: 11, color: up ? "var(--success)" : "var(--text-tertiary)", flexShrink: 0 }}>
        {weeklyChange === 0 ? "Same as last week" : up ? "You're improving — keep going!" : "Let's pick it up this week"}
      </p>
    </div>
  );
}
