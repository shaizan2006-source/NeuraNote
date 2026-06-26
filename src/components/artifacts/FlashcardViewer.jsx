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
      background: "linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))",
      borderRadius: 12,
      padding: 24,
      border: "1px solid var(--border-hairline)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Flashcards
        </h3>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{progress}</span>
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          background: isFlipped
            ? "linear-gradient(135deg, var(--accent-dim), var(--accent))"
            : "linear-gradient(135deg, var(--accent), var(--accent-bright))",
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
            color: "color-mix(in srgb, var(--bg-base) 60%, transparent)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {isFlipped ? "Answer" : "Question"}
          </p>
          <p style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 500,
            color: "var(--bg-base)",
            lineHeight: 1.6,
          }}>
            {isFlipped ? card.back : card.front}
          </p>
          <p style={{
            margin: "16px 0 0 0",
            fontSize: 10,
            color: "color-mix(in srgb, var(--bg-base) 50%, transparent)",
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
          background: "color-mix(in srgb, var(--accent) 15%, transparent)",
          color: "var(--accent)",
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
            background: currentIdx === 0 ? "var(--bg-surface-2)" : "var(--accent)",
            color: currentIdx === 0 ? "var(--text-tertiary)" : "var(--bg-base)",
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
            background: currentIdx === cards.length - 1 ? "var(--bg-surface-2)" : "var(--accent)",
            color: currentIdx === cards.length - 1 ? "var(--text-tertiary)" : "var(--bg-base)",
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
