"use client";

import { useState, useCallback } from "react";
import FlashcardViewer from "@/components/artifacts/FlashcardViewer";
import QuizViewer from "@/components/artifacts/QuizViewer";

export default function ArtifactModal({
  cluster,
  isOpen,
  onClose,
  token,
}) {
  const [artifactType, setArtifactType] = useState("flashcard");
  const [artifact, setArtifact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/artifacts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clusterLabel: cluster.label,
          topics: cluster.topics,
          avgMastery: cluster.avgScore,
          artifactType,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate artifact");
      const data = await res.json();
      setArtifact(data.artifact);
    } catch (err) {
      setError(err.message || "Error generating artifact");
    } finally {
      setLoading(false);
    }
  }, [cluster, artifactType, token]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(8, 8, 10, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 16,
    }}>
      <div style={{
        background: "linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))",
        borderRadius: 16,
        padding: 24,
        border: "1px solid var(--border-strong)",
        maxWidth: 600,
        width: "100%",
        maxHeight: "80vh",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}>
          <div>
            <h2 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              {cluster.label}
            </h2>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}>
              Topics: {cluster.topics.join(", ")} • Mastery: {cluster.avgScore}%
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Artifact Display */}
        {artifact ? (
          <>
            {artifactType === "flashcard" && artifact.type === "flashcard" && (
              <FlashcardViewer cards={artifact.content} />
            )}
            {artifactType === "micro_quiz" && artifact.type === "micro_quiz" && (
              <QuizViewer questions={artifact.content} />
            )}

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                onClick={() => setArtifact(null)}
                style={{
                  padding: "8px 16px",
                  background: "var(--bg-surface-2)",
                  color: "var(--text-primary)",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Generate Different Type
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Type Selection */}
            <div style={{ marginBottom: 20 }}>
              <p style={{
                margin: "0 0 10px 0",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}>
                Select Practice Type:
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { type: "flashcard", label: "📇 Flashcards", desc: "Flip cards to test recall" },
                  { type: "micro_quiz", label: "❓ Micro-Quiz", desc: "4 MCQ questions" },
                ].map(({ type, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setArtifactType(type)}
                    style={{
                      flex: 1,
                      padding: 12,
                      background: artifactType === type ? "var(--accent)" : "var(--bg-surface-2)",
                      color: artifactType === type ? "var(--bg-base)" : "var(--text-primary)",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div>{label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "color-mix(in srgb, var(--error) 10%, transparent)",
                borderLeft: "3px solid var(--error)",
                padding: 12,
                borderRadius: 6,
                marginBottom: 16,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: "var(--error)" }}>
                  {error}
                </p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: loading ? "var(--bg-surface-2)" : "var(--accent-grad)",
                color: loading ? "var(--text-primary)" : "var(--bg-base)",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? "Generating..." : `Generate ${artifactType === "flashcard" ? "Flashcards" : "Quiz"}`}
            </button>

            <p style={{
              margin: "12px 0 0 0",
              fontSize: 11,
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}>
              Powered by OpenAI • Takes ~3 seconds
            </p>
          </>
        )}
      </div>
    </div>
  );
}
