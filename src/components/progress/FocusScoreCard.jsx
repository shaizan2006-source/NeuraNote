"use client";
import ProgressRing from "./ProgressRing";
import AnimatedNumber from "./AnimatedNumber";

export default function FocusScoreCard({
  focusScore = 0, focusTrend = "up",
  streak = 0, totalStudyTimeMins = 0,
  topicsMastered = 0, totalTopics = 0,
  // Optional: pre-computed breakdown from useFocusScore analytics hook.
  // If absent, falls back to inline computation so existing callers keep working.
  breakdown = null,
}) {
  const consistency = breakdown?.consistency ?? Math.round(Math.min(streak / 7, 1) * 40);
  const volume      = breakdown?.volume      ?? Math.round(Math.min(totalStudyTimeMins / 180, 1) * 40);
  const mastery     = breakdown?.mastery     ?? (totalTopics > 0 ? Math.round((topicsMastered / totalTopics) * 20) : 0);

  const BARS = [
    { label: "Consistency",   val: consistency, max: 40, color: "var(--accent)" },
    { label: "Study Volume",  val: volume,      max: 40, color: "var(--accent)" },
    { label: "Mastery Gain",  val: mastery,     max: 20, color: "var(--success)" },
  ];

  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)",
      borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column",
      boxShadow: "0 0 24px var(--accent-glow-soft)",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Focus Score
      </p>

      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ProgressRing value={focusScore} size={72} stroke={6} color="#D4AF6E" />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
              <AnimatedNumber to={focusScore} />
            </span>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 18, color: focusTrend === "up" ? "var(--success)" : "var(--error)" }}>
              {focusTrend === "up" ? "↑" : "↓"}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>vs last week</span>
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--text-disabled)" }}>out of 100</p>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        {BARS.map(({ label, val, max, color }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: "var(--text-disabled)" }}>{label}</span>
              <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>{val}<span style={{ color: "var(--text-disabled)" }}>/{max}</span></span>
            </div>
            <div style={{ height: 3, background: "var(--border-hairline)", borderRadius: 2 }}>
              <div style={{ height: 3, width: `${(val / max) * 100}%`, background: color, borderRadius: 2, transition: "width 1s ease-out" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
