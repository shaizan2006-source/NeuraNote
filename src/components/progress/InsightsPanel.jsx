"use client";
import { generateInsights } from "@/lib/analytics/generateInsights";

/**
 * InsightsPanel
 *
 * Accepts either:
 *   a) `insights` — a pre-computed array from useStudyInsights() (preferred)
 *   b) raw data props — falls back to calling generateInsights() inline
 *      so existing call-sites keep working without change.
 */

const TYPE_BG = {
  timing:   "rgba(34,211,238,0.07)",
  positive: "rgba(34,197,94,0.07)",
  warning:  "rgba(245,158,11,0.07)",
  nudge:    "rgba(139,92,246,0.07)",
};
const TYPE_BORDER = {
  timing:   "rgba(34,211,238,0.15)",
  positive: "rgba(34,197,94,0.15)",
  warning:  "rgba(245,158,11,0.15)",
  nudge:    "rgba(139,92,246,0.15)",
};

export default function InsightsPanel({
  // Pre-computed path (preferred)
  insights: insightsProp = null,
  // Legacy raw-props path (fallback)
  peakStudyHour,
  avgSessionDepthMins,
  strongestSubject,
  streak,
  difficultyBreakdown,
  weeklyChange,
  // Full data object for richer fallback
  data = null,
}) {
  let insights;

  if (insightsProp) {
    insights = insightsProp;
  } else if (data) {
    insights = generateInsights(data);
  } else {
    // Legacy fallback: reconstruct minimal data shape from individual props
    const legacyData = {
      peakStudyHour,
      avgSessionDepthMins: avgSessionDepthMins || 0,
      strongestSubject,
      streak:              streak || 0,
      difficultyBreakdown: difficultyBreakdown || { easy: 0, medium: 0, hard: 0 },
      weeklyChange:        weeklyChange || 0,
      sessionsCompleted:   3, // minimum to pass the data gate
    };
    insights = generateInsights(legacyData);
  }

  if (!insights || insights.length === 0) {
    return (
      <section style={{ marginTop: 16 }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Smart Insights
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>
          Start studying to see insights
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Smart Insights
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {insights.map(({ icon, message, type }, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            background: TYPE_BG[type]     || TYPE_BG.nudge,
            border:     `1px solid ${TYPE_BORDER[type] || TYPE_BORDER.nudge}`,
            borderRadius: 24, padding: "7px 13px",
            maxWidth: "100%",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 11, color: "#d4d4d8", lineHeight: 1.4, overflowWrap: "break-word", minWidth: 0 }}>{message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
