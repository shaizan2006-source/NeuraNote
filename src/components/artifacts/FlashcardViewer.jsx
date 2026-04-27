"use client";

import { useState } from "react";

export default function FlashcardViewer({ cards }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards || cards.length === 0) return null;

  const card = cards[currentIdx];
  const progress = `${currentIdx + 1} / ${cards.length}`;

  return (
    <div style={{
      background: "linear-gradient(135deg, #2d2d2d, #1f1f1f)",
      borderRadius: 12,
      padding: 24,
      border: "1px solid #3a3a3a",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>
          Flashcards
        </h3>
        <span style={{ fontSize: 12, color: "#71717a" }}>{progress}</span>
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          background: isFlipped
            ? "linear-gradient(135deg, #7c3aed, #8b5cf6)"
            : "linear-gradient(135deg, #3b82f6, #2563eb)",
          borderRadius: 12,
          padding: 32,
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          marginBottom: 16,
        }}
      >
        <div>
          <p style={{
            margin: "0 0 8px 0",
            fontSize: 11,
            color: "rgba(255,255,255,0.6)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {isFlipped ? "Answer" : "Question"}
          </p>
          <p style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 500,
            color: "#fff",
            lineHeight: 1.6,
          }}>
            {isFlipped ? card.back : card.front}
          </p>
          <p style={{
            margin: "16px 0 0 0",
            fontSize: 10,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            Click to {isFlipped ? "see question" : "reveal answer"}
          </p>
        </div>
      </div>

      {/* Topic tag */}
      <div style={{ marginBottom: 16 }}>
        <span style={{
          display: "inline-block",
          background: "rgba(100, 200, 255, 0.15)",
          color: "#64c8ff",
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 500,
        }}>
          {card.topic}
        </span>
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "space-between",
      }}>
        <button
          onClick={() => {
            setCurrentIdx(Math.max(0, currentIdx - 1));
            setIsFlipped(false);
          }}
          disabled={currentIdx === 0}
          style={{
            padding: "8px 16px",
            background: currentIdx === 0 ? "#3a3a3a" : "#3b82f6",
            color: currentIdx === 0 ? "#71717a" : "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: currentIdx === 0 ? "not-allowed" : "pointer",
            opacity: currentIdx === 0 ? 0.5 : 1,
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => {
            setCurrentIdx(Math.min(cards.length - 1, currentIdx + 1));
            setIsFlipped(false);
          }}
          disabled={currentIdx === cards.length - 1}
          style={{
            padding: "8px 16px",
            background: currentIdx === cards.length - 1 ? "#3a3a3a" : "#3b82f6",
            color: currentIdx === cards.length - 1 ? "#71717a" : "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: currentIdx === cards.length - 1 ? "not-allowed" : "pointer",
            opacity: currentIdx === cards.length - 1 ? 0.5 : 1,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
