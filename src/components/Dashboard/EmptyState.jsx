"use client";
import { useState } from "react";

export default function EmptyState({ onUploadClick }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSample() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/sample", { method: "POST" });
      if (!res.ok) throw new Error("Failed to load sample");
      window.location.reload();
    } catch (err) {
      setError("Couldn't load sample. Try uploading your own PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
      padding: "40px 20px",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 48,
        marginBottom: 16,
        opacity: 0.6,
      }}>📚</div>

      <h2 style={{
        fontSize: 22,
        fontWeight: 600,
        color: "#F9FAFB",
        marginBottom: 8,
      }}>
        Your study space is ready
      </h2>

      <p style={{
        fontSize: 15,
        color: "#9CA3AF",
        maxWidth: 360,
        marginBottom: 32,
        lineHeight: 1.6,
      }}>
        Upload a PDF — notes, textbook chapters, question papers — and your AI study companion gets to work.
      </p>

      {/* 3-step cards */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 36,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {[
          { n: "1", label: "Upload PDF" },
          { n: "2", label: "Explore Brain Map" },
          { n: "3", label: "Ask anything" },
        ].map(({ n, label }) => (
          <div key={n} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "14px 20px",
            minWidth: 120,
          }}>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Step {n}</div>
            <div style={{ fontSize: 14, color: "#E5E7EB", fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onUploadClick}
          style={{
            background: "#8B5CF6",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Upload PDF
        </button>

        <button
          onClick={handleSample}
          disabled={loading}
          style={{
            background: "transparent",
            color: "#9CA3AF",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : "Try with sample PDF"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "#EF4444", marginTop: 12 }}>{error}</p>
      )}
    </div>
  );
}
