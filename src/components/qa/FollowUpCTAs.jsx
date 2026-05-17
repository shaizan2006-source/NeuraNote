"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowUpCTAs({ topic, documentId, onFollowUp }) {
  const router = useRouter();
  const [quizLoading, setQuizLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  async function handlePractice() {
    if (!topic) return;
    setQuizLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, documentId, count: 5 }),
      });
      if (res.ok) {
        const { quizId } = await res.json();
        router.push(`/quiz?id=${quizId}`);
      }
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleAddCard() {
    if (!topic) return;
    setCardLoading(true);
    try {
      await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, documentId }),
      });
    } finally {
      setCardLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={handlePractice}
        disabled={quizLoading}
        style={{
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 8, padding: "6px 12px",
          color: "#A78BFA", fontSize: 12, cursor: "pointer",
          opacity: quizLoading ? 0.6 : 1,
        }}
      >
        {quizLoading ? "Generating…" : "Practice this — 5 questions"}
      </button>

      <button
        onClick={handleAddCard}
        disabled={cardLoading}
        style={{
          background: "rgba(34,211,238,0.08)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: 8, padding: "6px 12px",
          color: "#22D3EE", fontSize: 12, cursor: "pointer",
          opacity: cardLoading ? 0.6 : 1,
        }}
      >
        {cardLoading ? "Saved" : "Add to review deck"}
      </button>

      <button
        onClick={onFollowUp}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "6px 12px",
          color: "#9CA3AF", fontSize: 12, cursor: "pointer",
        }}
      >
        Ask follow-up
      </button>
    </div>
  );
}
