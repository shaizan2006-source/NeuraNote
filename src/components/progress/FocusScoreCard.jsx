"use client";
import ProgressRing from "./ProgressRing";
import AnimatedNumber from "./AnimatedNumber";

export default function FocusScoreCard({
  focusScore = 0, focusTrend = "up",
  streak = 0, totalStudyTimeMins = 0,
  topicsMastered = 0, totalTopics = 0,
}) {
  const consistency = Math.round(Math.min(streak / 7, 1) * 40);
  const depth       = Math.round(Math.min(totalStudyTimeMins / 180, 1) * 40);
  const mastery     = totalTopics > 0 ? Math.round((topicsMastered / totalTopics) * 20) : 0;

  const BARS = [
    { label: "Consistency", val: consistency, max: 40, color: "#8B5CF6" },
    { label: "Study Depth", val: depth,       max: 40, color: "#22D3EE" },
    { label: "Mastery Gain", val: mastery,    max: 20, color: "#22C55E" },
  ];

  return (
    <div style={{
      background: "#111111", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Focus Score
      </p>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ProgressRing value={focusScore} size={72} stroke={6} color="#8B5CF6" />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>
              <AnimatedNumber to={focusScore} />
            </span>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 18, color: focusTrend === "up" ? "#22C55E" : "#EF4444" }}>
              {focusTrend === "up" ? "↑" : "↓"}
            </span>
            <span style={{ fontSize: 10, color: "#71717a" }}>vs last week</span>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "#52525b" }}>out of 100</p>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {BARS.map(({ label, val, max, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: "#52525b" }}>{label}</span>
              <span style={{ fontSize: 9, color: "#71717a" }}>{val}</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <div style={{ height: 3, width: `${(val / max) * 100}%`, background: color, borderRadius: 2, transition: "width 1s ease-out" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
