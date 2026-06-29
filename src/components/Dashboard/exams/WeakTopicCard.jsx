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

  const accentColor = accuracy < 30 ? "var(--error)" : "var(--warning)";
  const bgColor     = accuracy < 30 ? "color-mix(in srgb, var(--error) 8%, transparent)" : "color-mix(in srgb, var(--warning) 8%, transparent)";
  const borderColor = accuracy < 30 ? "color-mix(in srgb, var(--error) 28%, transparent)"  : "color-mix(in srgb, var(--warning) 28%, transparent)";
  const textColor   = accuracy < 30 ? "var(--error)" : "var(--warning)";

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
          margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {truncate(topic.topic)}
          {isHard && <span style={{ marginLeft: 4, fontSize: 9, color: accentColor }}>🔥</span>}
        </p>

        {/* Accuracy bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <div style={{
            width: 72, height: 3,
            background: "var(--border-strong)", borderRadius: 2, overflow: "hidden",
          }}>
            <div style={{
              width: `${accuracy}%`, height: "100%",
              background: accentColor, borderRadius: 2,
            }} />
          </div>
          <span style={{ fontSize: 9, color: textColor }}>{accuracy}%</span>
        </div>

        <p style={{ margin: "2px 0 0", fontSize: 9, color: "var(--text-tertiary)" }}>
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
            background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
            borderRadius: 4, color: "var(--accent)", fontSize: 9, cursor: "pointer",
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
