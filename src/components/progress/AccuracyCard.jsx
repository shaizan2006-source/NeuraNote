"use client";
import AnimatedNumber from "./AnimatedNumber";

function barColor(pct) {
  return pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";
}

export default function AccuracyCard({ avgAccuracy = 0, topicAccuracy = [] }) {
  return (
    <div style={{
      background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Accuracy</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: barColor(avgAccuracy) }}>
        <AnimatedNumber to={avgAccuracy} suffix="%" />
        <span style={{ fontSize: 11, fontWeight: 400, color: "#71717a", marginLeft: 6 }}>overall</span>
      </p>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {topicAccuracy.slice(0, 4).map(({ topic, accuracy }) => (
          <div key={topic}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontSize: 9, color: "#a1a1aa", maxWidth: "76%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topic}
              </span>
              <span style={{ fontSize: 9, color: barColor(accuracy) }}>{accuracy}%</span>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <div style={{ height: 3, width: `${accuracy}%`, background: barColor(accuracy), borderRadius: 2, transition: "width 0.9s ease-out" }} />
            </div>
          </div>
        ))}
        {topicAccuracy.length === 0 && (
          <p style={{ margin: 0, fontSize: 10, color: "#52525b" }}>Complete tasks to see topic breakdown</p>
        )}
      </div>
    </div>
  );
}
