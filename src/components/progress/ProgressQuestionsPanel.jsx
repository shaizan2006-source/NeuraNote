"use client";

import { useState, useRef } from "react";

export default function ProgressQuestionsPanel({ token }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/progress/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) throw new Error("Failed to get answer");
      const data = await res.json();
      setResponse(data);
      setQuestion("");
    } catch (err) {
      setError(err.message || "Error analyzing your progress");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #2d2d2d, #1f1f1f)",
      borderRadius: 12,
      padding: 16,
      border: "1px solid #3a3a3a",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>💬</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f4f4f5" }}>
          Ask About Your Progress
        </h3>
      </div>

      {!response ? (
        <>
          <p style={{
            margin: "0 0 12px 0",
            fontSize: 12,
            color: "#71717a",
          }}>
            Ask about your weak areas, study patterns, or progress trends
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., 'Where am I struggling the most?'"
              disabled={loading || !token}
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid #3a3a3a",
                borderRadius: 6,
                color: "#f4f4f5",
                fontSize: 12,
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#8b5cf6";
                e.target.style.background = "rgba(139,92,246,0.08)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#3a3a3a";
                e.target.style.background = "rgba(255,255,255,0.04)";
              }}
            />
            <button
              type="submit"
              disabled={!question.trim() || loading || !token}
              style={{
                padding: "10px 16px",
                background: !question.trim() || !token ? "#3a3a3a" : loading ? "#5b8ef6" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: !question.trim() || !token ? "not-allowed" : "pointer",
                opacity: !question.trim() || !token ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? "..." : "Ask"}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: 10,
              padding: 10,
              background: "rgba(239, 68, 68, 0.1)",
              borderLeft: "3px solid #ef4444",
              borderRadius: 4,
            }}>
              <p style={{ margin: 0, fontSize: 11, color: "#fca5a5" }}>{error}</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Question & Answer Display */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: 12,
              fontWeight: 600,
              color: "#8b5cf6",
            }}>
              Your question:
            </p>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: "#f4f4f5",
              lineHeight: 1.5,
            }}>
              {response.metadata.question || Object.keys(response)[0]}
            </p>
          </div>

          <div style={{
            background: "rgba(139, 92, 246, 0.08)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}>
            <p style={{
              margin: "0 0 8px 0",
              fontSize: 11,
              fontWeight: 600,
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Coach's Analysis:
            </p>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: "#f4f4f5",
              lineHeight: 1.6,
            }}>
              {response.answer}
            </p>
          </div>

          {/* Related Topics */}
          {response.metadata.relatedTopics && response.metadata.relatedTopics.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{
                margin: "0 0 8px 0",
                fontSize: 11,
                fontWeight: 600,
                color: "#71717a",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                Topics Analyzed:
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {response.metadata.relatedTopics.slice(0, 5).map((topic, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(100, 200, 255, 0.1)",
                      color: "#64c8ff",
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    <span>{topic.topic}</span>
                    <span style={{ opacity: 0.7 }}>{topic.mastery_score}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              setResponse(null);
              setQuestion("");
              inputRef.current?.focus();
            }}
            style={{
              width: "100%",
              padding: 10,
              background: "#3a3a3a",
              color: "#f4f4f5",
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#4a4a4a";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#3a3a3a";
            }}
          >
            Ask Another Question
          </button>
        </>
      )}
    </div>
  );
}
