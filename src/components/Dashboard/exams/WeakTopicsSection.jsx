// src/components/dashboard/exams/WeakTopicsSection.jsx
"use client";

import WeakTopicCard from "./WeakTopicCard";
import EmptyState from "./EmptyState";

/**
 * @param {{
 *   topics: Array,
 *   loading: boolean,
 *   selectedExam: object|null,
 *   nullSubject: boolean,
 *   onAddExam: () => void,
 *   onPractice: (topic: string) => void,
 *   onAskAI: (topic: string) => void,
 *   onStartQuiz: () => void,
 * }} props
 */
export default function WeakTopicsSection({
  topics = [],
  loading = false,
  selectedExam = null,
  nullSubject = false,
  onAddExam,
  onPractice,
  onAskAI,
  onStartQuiz,
}) {
  // State 1: Loading — skeleton cards
  if (loading) {
    return (
      <div style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{ height: 11, width: "40%", background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            height: 52,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
            animation: "skeleton-pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  // State 2: No exam selected
  if (!selectedExam) {
    return <EmptyState variant="no-exam" onAction={onAddExam} />;
  }

  return (
    <div style={{
      padding: "12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 10, color: "#71717a", fontWeight: 600 }}>Weak Topics</p>
        {topics.length > 0 && (
          <p style={{ margin: 0, fontSize: 9, color: "#3f3f46" }}>{topics.length} tracked</p>
        )}
      </div>

      {/* Null-subject banner */}
      {nullSubject && (
        <div style={{
          marginBottom: 8,
          padding: "5px 8px",
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 4,
        }}>
          <p style={{ margin: 0, fontSize: 9, color: "#fbbf24" }}>
            Subject not set — showing all weak topics.{" "}
            <span style={{ color: "#71717a" }}>Edit this exam to add a subject.</span>
          </p>
        </div>
      )}

      {/* State 3: No topics / State 4: Topics list */}
      {topics.length === 0 ? (
        <EmptyState variant="no-topics" onAction={onStartQuiz} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {topics.map((t) => (
            <WeakTopicCard
              key={t.id ?? t.topic}
              topic={t}
              onPractice={onPractice}
              onAskAI={onAskAI}
            />
          ))}
        </div>
      )}
    </div>
  );
}
