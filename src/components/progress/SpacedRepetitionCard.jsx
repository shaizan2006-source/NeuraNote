"use client";

import { useMemo } from "react";

export default function SpacedRepetitionCard({ nextDueTopics }) {
  const topicsToReview = useMemo(() => {
    if (!Array.isArray(nextDueTopics) || nextDueTopics.length === 0) return [];
    return nextDueTopics.slice(0, 5);
  }, [nextDueTopics]);

  if (topicsToReview.length === 0) {
    return (
      <div style={{
        background: "linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface))",
        borderRadius: 12,
        padding: 16,
        border: "1px solid var(--border-strong)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>📚</span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>All caught up!</h3>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>No topics due for review right now.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface))",
      borderRadius: 12,
      padding: 16,
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📚</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Review Queue</h3>
        <span style={{
          marginLeft: "auto",
          background: "var(--error)",
          color: "var(--text-primary)",
          borderRadius: 12,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 600,
        }}>
          {topicsToReview.length} due
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {topicsToReview.map((topic, idx) => (
          <div
            key={`${topic.topic}-${idx}`}
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 8,
              padding: "8px 12px",
              borderLeft: `3px solid ${topic.days_overdue > 7 ? "var(--error)" : topic.days_overdue > 3 ? "var(--warning)" : "var(--accent)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: "0 0 4px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {topic.topic}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                }}>
                  EF: {topic.ease_factor.toFixed(2)} • Rep: {topic.repetition}
                </p>
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                fontSize: 11,
                color: topic.days_overdue > 7 ? "var(--error)" : topic.days_overdue > 3 ? "var(--warning)" : "var(--text-tertiary)",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}>
                <div>{topic.days_overdue > 0 ? `${topic.days_overdue}d ago` : "Today"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid var(--border-strong)",
        fontSize: 11,
        color: "var(--text-tertiary)",
        textAlign: "center",
      }}>
        {topicsToReview.length} most urgent • {Math.max(0, (nextDueTopics?.length || 0) - 5)} more in queue
      </div>
    </div>
  );
}
