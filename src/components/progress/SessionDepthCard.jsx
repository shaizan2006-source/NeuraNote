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
        { label: "Shallow", count: dist.shallow, color: "var(--success)" },
        { label: "Medium",  count: dist.medium,  color: "var(--warning)" },
        { label: "Deep",    count: dist.deep,     color: "var(--accent)" },
      ]
    : [
        { label: "Easy",  count: difficultyBreakdown.easy   || 0, color: "var(--success)" },
        { label: "Med",   count: difficultyBreakdown.medium || 0, color: "var(--warning)" },
        { label: "Hard",  count: difficultyBreakdown.hard   || 0, color: "var(--error)" },
      ];

  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 14, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Session Depth</p>

      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{avgDuration}m</span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>avg session</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        {isDeepWork && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
            borderRadius: 20, padding: "2px 8px",
          }}>
            <span style={{ fontSize: 9, color: "var(--accent)", fontWeight: 600 }}>Deep Work</span>
          </div>
        )}
        {depthScore !== null && (
          <span style={{ fontSize: 9, color: "var(--text-disabled)" }}>depth score: <span style={{ color: "var(--text-tertiary)" }}>{depthScore}</span></span>
        )}
      </div>

      {followupDepth !== null && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
            borderRadius: 20, padding: "2px 8px",
          }}>
            <span style={{ fontSize: 9, color: "var(--accent)", fontWeight: 600 }}>
              ↩ {followupDepth} avg follow-up depth
            </span>
          </div>
        </div>
      )}

      <p style={{ margin: "10px 0 4px", fontSize: 9, color: "var(--text-disabled)" }}>{sessionsCompleted} sessions total</p>

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
