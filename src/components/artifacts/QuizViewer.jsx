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
          Micro-Quiz
        </h3>
        <span style={{ fontSize: 12, color: "#71717a" }}>{progress}</span>
      </div>

      {/* Question */}
      <h4 style={{
        margin: "0 0 20px 0",
        fontSize: 15,
        fontWeight: 500,
        color: "#f4f4f5",
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
          let borderColor = "#3a3a3a";
          let textColor = "#f4f4f5";

          if (isSelected && !isAnswered) {
            bgColor = "rgba(59, 130, 246, 0.2)";
            borderColor = "#3b82f6";
          } else if (isAnswer) {
            bgColor = "rgba(34, 197, 94, 0.15)";
            borderColor = "#22c55e";
            textColor = "#86efac";
          } else if (isWrong) {
            bgColor = "rgba(239, 68, 68, 0.15)";
            borderColor = "#ef4444";
            textColor = "#fca5a5";
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
          background: isCorrect ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          borderLeft: `4px solid ${isCorrect ? "#22c55e" : "#ef4444"}`,
          padding: 12,
          borderRadius: 6,
          marginBottom: 16,
        }}>
          <p style={{
            margin: "0 0 6px 0",
            fontSize: 12,
            fontWeight: 600,
            color: isCorrect ? "#86efac" : "#fca5a5",
          }}>
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </p>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: "#e5e7eb",
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
          background: "rgba(100, 200, 255, 0.15)",
          color: "#64c8ff",
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

        {!isAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            style={{
              padding: "8px 16px",
              background: selected === null ? "#3a3a3a" : "#8b5cf6",
              color: selected === null ? "#71717a" : "#fff",
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
              background: currentIdx === questions.length - 1 ? "#3a3a3a" : "#8b5cf6",
              color: currentIdx === questions.length - 1 ? "#71717a" : "#fff",
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
