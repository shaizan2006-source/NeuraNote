"use client";
import AnimatedNumber from "./AnimatedNumber";

function barColor(pct) {
  return pct >= 70 ? "#34D399" : pct >= 40 ? "#F5B544" : "#F0584F";
}

export default function AccuracyCard({ avgAccuracy = 0, topicAccuracy = [] }) {
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 14, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Accuracy</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: barColor(avgAccuracy) }}>
        <AnimatedNumber to={avgAccuracy} suffix="%" />
        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 6 }}>overall</span>
      </p>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {topicAccuracy.slice(0, 5).map(({ topic, accuracy }) => (
          <div key={topic}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: "var(--text-secondary)", maxWidth: "76%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topic}
              </span>
              <span style={{ fontSize: 9, color: barColor(accuracy) }}>{accuracy}%</span>
            </div>
            <div style={{ height: 3, background: "var(--border-hairline)", borderRadius: 2 }}>
              <div style={{ height: 3, width: `${accuracy}%`, background: barColor(accuracy), borderRadius: 2, transition: "width 0.9s ease-out" }} />
            </div>
          </div>
        ))}
        {topicAccuracy.length === 0 && (
          <p style={{ margin: 0, fontSize: 10, color: "var(--text-disabled)" }}>Complete tasks to see topic breakdown</p>
        )}
      </div>
    </div>
  );
}
