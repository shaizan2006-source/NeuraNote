// src/components/dashboard/exams/StudySuggestion.jsx
"use client";

import { deriveAccuracy } from "@/lib/examUtils";

/**
 * @param {{
 *   topics: Array,
 *   subject: string,
 *   onQuickQuiz: (topic: string) => void,
 * }} props
 */
export default function StudySuggestion({ topics = [], subject = "", onQuickQuiz }) {
  if (topics.length === 0) return null;

  const top2 = topics.slice(0, 2);

  return (
    <div style={{
      padding: "10px 12px",
      background: "rgba(139,92,246,0.05)",
      borderRadius: 8,
      border: "1px solid rgba(139,92,246,0.15)",
    }}>
      <p style={{
        margin: "0 0 6px",
        fontSize: 9,
        color: "#71717a",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontWeight: 600,
      }}>
        Suggested Focus Today
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {top2.map((t) => {
          const accuracy = deriveAccuracy(t.count);
          return (
            <div
              key={t.id ?? t.topic}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 8px",
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>{t.topic}</span>
              <span style={{ fontSize: 9, color: "#52525b" }}>·</span>
              <span style={{ fontSize: 9, color: "#a78bfa" }}>{accuracy}%</span>
              <button
                onClick={() => onQuickQuiz(t.topic)}
                style={{
                  padding: "2px 7px",
                  background: "rgba(139,92,246,0.2)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: 3, color: "#c4b5fd", fontSize: 8, fontWeight: 600, cursor: "pointer",
                }}
              >
                Quick Quiz
              </button>
            </div>
          );
        })}
      </div>
      {subject && (
        <p style={{ margin: "5px 0 0", fontSize: 9, color: "#3f3f46" }}>
          Based on your lowest accuracy topics in {subject.toUpperCase()}
        </p>
      )}
    </div>
  );
}
