"use client";

export function generateProgressInsights({ peakStudyHour, avgSessionDepthMins, strongestSubject, streak, difficultyBreakdown, weeklyChange }) {
  const insights = [];
  const db = difficultyBreakdown || { easy: 0, medium: 0, hard: 0 };

  if (peakStudyHour !== null && peakStudyHour !== undefined) {
    const fmtH = h => h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`;
    insights.push({ icon: "🕐", text: `You study best around ${fmtH(peakStudyHour)}`, type: "timing" });
  }
  if (avgSessionDepthMins > 40) {
    insights.push({ icon: "⏱️", text: "Your focus tends to drop after 40 min — try shorter bursts", type: "warning" });
  } else if (avgSessionDepthMins >= 20 && avgSessionDepthMins <= 35) {
    insights.push({ icon: "⚡", text: "Your session length is in the optimal focus zone", type: "positive" });
  }
  if (strongestSubject) {
    insights.push({ icon: "🧠", text: `You're strongest in ${strongestSubject}`, type: "positive" });
  }
  if (streak >= 5) {
    insights.push({ icon: "🔥", text: `${streak}-day streak — consistency is your superpower`, type: "positive" });
  } else if (streak === 0) {
    insights.push({ icon: "💡", text: "Start a streak today — daily beats cramming every time", type: "nudge" });
  }
  if (db.hard > db.easy && db.hard > 0) {
    insights.push({ icon: "💪", text: "You're tackling hard topics — that's real growth", type: "positive" });
  }
  if (weeklyChange > 20) {
    insights.push({ icon: "📈", text: `${weeklyChange}% more study time than last week — huge jump!`, type: "positive" });
  } else if (weeklyChange < -20) {
    insights.push({ icon: "📉", text: "Study time dropped this week — one session gets you back", type: "nudge" });
  }
  return insights.slice(0, 4);
}

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

export default function InsightsPanel({ peakStudyHour, avgSessionDepthMins, strongestSubject, streak, difficultyBreakdown, weeklyChange }) {
  const insights = generateProgressInsights({ peakStudyHour, avgSessionDepthMins, strongestSubject, streak, difficultyBreakdown, weeklyChange });

  if (!insights.length) return null;

  return (
    <section style={{ marginTop: 16 }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Smart Insights
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {insights.map(({ icon, text, type }, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: TYPE_BG[type], border: `1px solid ${TYPE_BORDER[type]}`,
            borderRadius: 24, padding: "7px 13px",
          }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 11, color: "#d4d4d8", lineHeight: 1.4 }}>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
