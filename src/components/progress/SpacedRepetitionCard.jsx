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
        background: "linear-gradient(135deg, #2d2d2d, #1f1f1f)",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #3a3a3a",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>📚</span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>All caught up!</h3>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#71717a" }}>No topics due for review right now.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #2d2d2d, #1f1f1f)",
      borderRadius: 12,
      padding: 16,
      border: "1px solid #3a3a3a",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📚</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>Review Queue</h3>
        <span style={{
          marginLeft: "auto",
          background: "#ef4444",
          color: "#fff",
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
              borderLeft: `3px solid ${topic.days_overdue > 7 ? "#ef4444" : topic.days_overdue > 3 ? "#f97316" : "#3b82f6"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: "0 0 4px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#f4f4f5",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {topic.topic}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: 11,
                  color: "#71717a",
                }}>
                  EF: {topic.ease_factor.toFixed(2)} • Rep: {topic.repetition}
                </p>
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                fontSize: 11,
                color: topic.days_overdue > 7 ? "#ef4444" : topic.days_overdue > 3 ? "#f97316" : "#71717a",
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
        borderTop: "1px solid #3a3a3a",
        fontSize: 11,
        color: "#71717a",
        textAlign: "center",
      }}>
        {topicsToReview.length} most urgent • {Math.max(0, (nextDueTopics?.length || 0) - 5)} more in queue
      </div>
    </div>
  );
}
