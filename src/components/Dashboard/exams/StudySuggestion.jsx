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
      background: "color-mix(in srgb, var(--accent) 6%, transparent)",
      borderRadius: 8,
      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
    }}>
      <p style={{
        margin: "0 0 6px",
        fontSize: 9,
        color: "var(--text-tertiary)",
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
                background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--accent) 28%, transparent)",
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>{t.topic}</span>
              <span style={{ fontSize: 9, color: "var(--text-tertiary)" }}>·</span>
              <span style={{ fontSize: 9, color: "var(--accent)" }}>{accuracy}%</span>
              <button
                onClick={() => onQuickQuiz(t.topic)}
                style={{
                  padding: "2px 7px",
                  background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                  borderRadius: 3, color: "var(--accent)", fontSize: 8, fontWeight: 600, cursor: "pointer",
                }}
              >
                Quick Quiz
              </button>
            </div>
          );
        })}
      </div>
      {subject && (
        <p style={{ margin: "5px 0 0", fontSize: 9, color: "var(--text-disabled)" }}>
          Based on your lowest accuracy topics in {subject.toUpperCase()}
        </p>
      )}
    </div>
  );
}
