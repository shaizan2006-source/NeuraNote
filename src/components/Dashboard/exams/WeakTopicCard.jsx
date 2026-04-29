// src/components/dashboard/exams/WeakTopicCard.jsx
"use client";

import { deriveAccuracy } from "@/lib/examUtils";

const MAX_LABEL_LENGTH = 28;

function truncate(str) {
  if (!str || typeof str !== "string") return "";
  return str.length > MAX_LABEL_LENGTH ? str.slice(0, MAX_LABEL_LENGTH) + "…" : str;
}

function formatLastPracticed(updatedAt) {
  if (!updatedAt) return "Never";
  const ms = Date.now() - new Date(updatedAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * @param {{
 *   topic: { id?: string, topic: string, count: number, level?: string, updated_at?: string },
 *   onPractice: (topic: string) => void,
 *   onAskAI: (topic: string) => void,
 * }} props
 */
export default function WeakTopicCard({ topic, onPractice, onAskAI }) {
  const accuracy = deriveAccuracy(topic.count);
  const isHard = topic.level === "hard" || accuracy < 30;

  const accentColor = accuracy < 30 ? "#ef4444" : "#f59e0b";
  const bgColor     = accuracy < 30 ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)";
  const borderColor = accuracy < 30 ? "rgba(239,68,68,0.2)"  : "rgba(245,158,11,0.2)";
  const textColor   = accuracy < 30 ? "#fca5a5" : "#fbbf24";

  return (
    <div style={{
      padding: "8px 10px",
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    }}>
      {/* Left: topic info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 600, color: "#e4e4e7",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {truncate(topic.topic)}
          {isHard && <span style={{ marginLeft: 4, fontSize: 9, color: accentColor }}>🔥</span>}
        </p>

        {/* Accuracy bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <div style={{
            width: 72, height: 3,
            background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              width: `${accuracy}%`, height: "100%",
              background: accentColor, borderRadius: 2,
            }} />
          </div>
          <span style={{ fontSize: 9, color: textColor }}>{accuracy}%</span>
        </div>

        <p style={{ margin: "2px 0 0", fontSize: 9, color: "#52525b" }}>
          {formatLastPracticed(topic.updated_at)}
        </p>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onPractice(topic.topic)}
          title={`Practice ${topic.topic}`}
          style={{
            padding: "3px 8px",
            background: bgColor, border: `1px solid ${borderColor}`,
            borderRadius: 4, color: textColor, fontSize: 9, fontWeight: 600, cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Practice
        </button>
        <button
          onClick={() => onAskAI(topic.topic)}
          title={`Ask AI about ${topic.topic}`}
          style={{
            padding: "3px 8px",
            background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 4, color: "#c4b5fd", fontSize: 9, cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Ask AI
        </button>
      </div>
    </div>
  );
}
