"use client";

/**
 * SessionDepthCard
 *
 * Accepts either:
 *   a) `depthData` from computeStudyDepth() for richer distribution display
 *   b) raw props (avgSessionDepthMins, sessionsCompleted, difficultyBreakdown)
 *      for backwards compatibility.
 */
export default function SessionDepthCard({
  avgSessionDepthMins = 0,
  sessionsCompleted   = 0,
  difficultyBreakdown = { easy: 0, medium: 0, hard: 0 },
  depthData           = null,
  followupDepth       = null,   // avg thread depth from learning_events
}) {
  const avgDuration = depthData?.avgDuration ?? avgSessionDepthMins;
  const depthScore  = depthData?.depthScore  ?? null;
  const dist        = depthData?.distribution ?? null;

  const isDeepWork = avgDuration >= 25;

  // Use distribution if provided, else fall back to difficultyBreakdown counts
  const DIFF = dist
    ? [
        { label: "Shallow", count: dist.shallow, color: "#22C55E" },
        { label: "Medium",  count: dist.medium,  color: "#F59E0B" },
        { label: "Deep",    count: dist.deep,     color: "#22D3EE" },
      ]
    : [
        { label: "Easy",  count: difficultyBreakdown.easy   || 0, color: "#22C55E" },
        { label: "Med",   count: difficultyBreakdown.medium || 0, color: "#F59E0B" },
        { label: "Hard",  count: difficultyBreakdown.hard   || 0, color: "#EF4444" },
      ];

  return (
    <div style={{
      background: "#111111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Session Depth</p>

      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#f4f4f5" }}>{avgDuration}m</span>
        <span style={{ fontSize: 11, color: "#71717a" }}>avg session</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        {isDeepWork && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.14)",
            borderRadius: 20, padding: "2px 8px",
          }}>
            <span style={{ fontSize: 9, color: "#22D3EE", fontWeight: 600 }}>⚡ Deep Work</span>
          </div>
        )}
        {depthScore !== null && (
          <span style={{ fontSize: 9, color: "#52525b" }}>depth score: <span style={{ color: "#71717a" }}>{depthScore}</span></span>
        )}
      </div>

      {followupDepth !== null && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.14)",
            borderRadius: 20, padding: "2px 8px",
          }}>
            <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 600 }}>
              ↩ {followupDepth} avg follow-up depth
            </span>
          </div>
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
