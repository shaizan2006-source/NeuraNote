"use client";

import { useState } from "react";

export default function QuizViewer({ questions }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});

  if (!questions || questions.length === 0) return null;

  const q = questions[currentIdx];
  const progress = `${currentIdx + 1} / ${questions.length}`;
  const isAnswered = currentIdx in answers;
  const isCorrect = isAnswered && answers[currentIdx] === q.correct;

  const handleSelect = (idx) => {
    if (!isAnswered) {
      setSelected(idx);
    }
  };

  const handleSubmit = () => {
    if (selected !== null && !isAnswered) {
      setAnswers({ ...answers, [currentIdx]: selected });
    }
  };

  const handleNext = () => {
    setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1));
    setSelected(null);
  };

  const handlePrev = () => {
    setCurrentIdx(Math.max(0, currentIdx - 1));
    setSelected(currentIdx - 1 in answers ? answers[currentIdx - 1] : null);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface))",
      borderRadius: 12,
      padding: 24,
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Micro-Quiz
        </h3>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{progress}</span>
      </div>

      {/* Question */}
      <h4 style={{
        margin: "0 0 20px 0",
        fontSize: 15,
        fontWeight: 500,
        color: "var(--text-primary)",
        lineHeight: 1.5,
      }}>
        {q.question}
      </h4>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {q.options.map((option, idx) => {
          const isSelected = selected === idx;
          const isAnswer = isAnswered && idx === q.correct;
          const isWrong = isAnswered && isSelected && idx !== q.correct;

          let bgColor = "rgba(255,255,255,0.04)";
          let borderColor = "var(--border-strong)";
          let textColor = "var(--text-primary)";

          if (isSelected && !isAnswered) {
            bgColor = "color-mix(in srgb, var(--accent) 20%, transparent)";
            borderColor = "var(--accent)";
          } else if (isAnswer) {
            bgColor = "color-mix(in srgb, var(--success) 15%, transparent)";
            borderColor = "var(--success)";
            textColor = "var(--success)";
          } else if (isWrong) {
            bgColor = "color-mix(in srgb, var(--error) 15%, transparent)";
            borderColor = "var(--error)";
            textColor = "var(--error)";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={isAnswered}
              style={{
                padding: 12,
                background: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: 8,
                color: textColor,
                fontSize: 14,
                textAlign: "left",
                cursor: isAnswered ? "default" : "pointer",
                transition: "all 0.2s",
                opacity: isAnswered && !isAnswer && !isWrong ? 0.4 : 1,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: isSelected || isAnswer || isWrong ? "rgba(255,255,255,0.2)" : "transparent",
                  fontSize: 11,
                  fontWeight: 600,
                }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation (if answered) */}
      {isAnswered && (
        <div style={{
          background: isCorrect ? "color-mix(in srgb, var(--success) 10%, transparent)" : "color-mix(in srgb, var(--error) 10%, transparent)",
          borderLeft: `4px solid ${isCorrect ? "var(--success)" : "var(--error)"}`,
          padding: 12,
          borderRadius: 6,
          marginBottom: 16,
        }}>
          <p style={{
            margin: "0 0 6px 0",
            fontSize: 12,
            fontWeight: 600,
            color: isCorrect ? "var(--success)" : "var(--error)",
          }}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </p>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}>
            {q.explanation}
          </p>
        </div>
      )}

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
          {q.topic}
        </span>
      </div>

      {/* Controls */}
      <div style={{
        display: "flex",
        gap: 8,
        justifyContent: "space-between",
      }}>
        <button
          onClick={handlePrev}
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

        {!isAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            style={{
              padding: "8px 16px",
              background: selected === null ? "var(--bg-surface-2)" : "var(--accent)",
              color: selected === null ? "var(--text-tertiary)" : "var(--bg-base)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: selected === null ? "not-allowed" : "pointer",
              opacity: selected === null ? 0.5 : 1,
            }}
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={currentIdx === questions.length - 1}
            style={{
              padding: "8px 16px",
              background: currentIdx === questions.length - 1 ? "var(--bg-surface-2)" : "var(--accent)",
              color: currentIdx === questions.length - 1 ? "var(--text-tertiary)" : "var(--bg-base)",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: currentIdx === questions.length - 1 ? "not-allowed" : "pointer",
              opacity: currentIdx === questions.length - 1 ? 0.5 : 1,
            }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
