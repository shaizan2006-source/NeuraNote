"use client";
import AnimatedNumber from "./AnimatedNumber";

function getCellColor(score) {
  if (!score || score === 0) return "#27272a";
  if (score < 50) return `rgba(245,158,11,${(0.35 + (score / 49) * 0.3).toFixed(2)})`;
  return "#22C55E";
}

export default function CognitiveProgressCard({
  topicsMastered = 0, totalTopics = 0,
  avgAccuracy = 0, retentionScore = 0,
  peerPercentile = 0, masteryTopics = [],
}) {
  const cells = Array.from({ length: 16 }, (_, i) => ({
    score: masteryTopics[i]?.mastery_score ?? 0,
  }));

  return (
    <div style={{
      background:    "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(20,10,40,0.5))",
      border:        "1px solid rgba(139,92,246,0.22)",
      borderRadius:  12,
      padding:       "18px 20px",
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      boxSizing:     "border-box",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Cognitive Progress
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "#f4f4f5" }}>
        <AnimatedNumber to={topicsMastered} />
        <span style={{ fontSize: 13, fontWeight: 400, color: "#71717a" }}> / {totalTopics} mastered</span>
      </p>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 12px)", gap: 3 }}>
        {cells.map((cell, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: 3,
            background: getCellColor(cell.score),
            transition: "background 0.5s ease",
          }} />
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Accuracy</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#22C55E" }}>
            <AnimatedNumber to={avgAccuracy} suffix="%" />
          </p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Retention</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#8B5CF6" }}>
            <AnimatedNumber to={retentionScore} suffix="%" />
          </p>
        </div>
      </div>

      {peerPercentile > 0 && (
        <div style={{
          marginTop: 12, display: "inline-flex", alignItems: "center", gap: 5,
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 20, padding: "4px 10px", alignSelf: "flex-start",
        }}>
          <span style={{ fontSize: 10 }}>⚡</span>
          <span style={{ fontSize: 10, color: "#F59E0B", fontWeight: 600 }}>
            Ahead of {peerPercentile}% of students
          </span>
        </div>
      )}
    </div>
  );
}
