"use client";

export default function SessionDepthCard({
  avgSessionDepthMins = 0,
  sessionsCompleted = 0,
  difficultyBreakdown = { easy: 0, medium: 0, hard: 0 },
}) {
  const isDeepWork = avgSessionDepthMins >= 25;
  const total = Object.values(difficultyBreakdown).reduce((s, v) => s + v, 0) || 1;

  const DIFF = [
    { label: "Easy", count: difficultyBreakdown.easy,   color: "#22C55E" },
    { label: "Med",  count: difficultyBreakdown.medium, color: "#F59E0B" },
    { label: "Hard", count: difficultyBreakdown.hard,   color: "#EF4444" },
  ];

  return (
    <div style={{
      background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Session Depth</p>

      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#f4f4f5" }}>{avgSessionDepthMins}m</span>
        <span style={{ fontSize: 11, color: "#71717a" }}>avg session</span>
      </div>

      {isDeepWork && (
        <div style={{
          marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4,
          background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.14)",
          borderRadius: 20, padding: "2px 8px",
        }}>
          <span style={{ fontSize: 9, color: "#22D3EE", fontWeight: 600 }}>⚡ Deep Work</span>
        </div>
      )}

      <p style={{ margin: "10px 0 4px", fontSize: 9, color: "#52525b" }}>{sessionsCompleted} sessions total</p>

      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1 }}>
        {DIFF.map(({ label, count, color }) => (
          <div key={label} style={{ flex: count || 0.05, background: color, opacity: 0.75 }} title={`${label}: ${count}`} />
        ))}
      </div>
      <div style={{ marginTop: 4, display: "flex", gap: 10 }}>
        {DIFF.map(({ label, count, color }) => (
          <span key={label} style={{ fontSize: 8, color }}>{label}: {count}</span>
        ))}
      </div>
    </div>
  );
}
