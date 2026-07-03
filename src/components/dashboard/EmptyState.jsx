"use client";
import { useState } from "react";

const SAMPLE_QA = [
  { q: "What are Newton's laws of motion?", a: "Instant, citation-grounded answer" },
  { q: "Explain integration by parts", a: "Step-by-step with examples" },
  { q: "Difference between mitosis and meiosis", a: "Concept comparison table" },
];

export default function EmptyState({ onUploadClick }) {
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [previewQ,  setPreviewQ]  = useState(0);

  async function handleSample() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/sample", { method: "POST" });
      if (!res.ok) throw new Error("Failed to load sample");
      window.location.reload();
    } catch {
      setError("Couldn't load sample. Try uploading your own PDF instead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      flex:           1,
      padding:        "32px 20px",
      textAlign:      "center",
      maxWidth:       640,
      margin:         "0 auto",
    }}>
      <h2 style={{
        fontSize:     26,
        fontWeight:   700,
        color:        "var(--text-primary)",
        marginBottom: 10,
        lineHeight:   1.25,
      }}>
        Turn your PDFs into<br />
        <span style={{ color: "var(--accent)" }}>instant understanding</span>
      </h2>

      <p style={{
        fontSize:     15,
        color:        "var(--text-secondary)",
        maxWidth:     400,
        marginBottom: 32,
        lineHeight:   1.7,
      }}>
        Upload any PDF — notes, textbook chapters, past papers — and your AI tutor
        answers questions, builds your Brain Map, and adapts to your weak spots.
      </p>

      {/* Live example teaser */}
      <div style={{
        width:        "100%",
        maxWidth:     440,
        background:   "color-mix(in srgb, var(--accent) 8%, transparent)",
        border:       "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
        borderRadius: 14,
        padding:      "18px 22px",
        marginBottom: 28,
        textAlign:    "left",
      }}>
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 10 }}>
          EXAMPLE — WHAT YOU'LL GET
        </div>
        {SAMPLE_QA.map((item, i) => (
          <div
            key={i}
            onClick={() => setPreviewQ(i)}
            style={{
              padding:      "8px 10px",
              borderRadius: 8,
              cursor:       "pointer",
              marginBottom: 4,
              background:   previewQ === i ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent",
              transition:   "background 0.15s",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: previewQ === i ? 600 : 400 }}>
              {item.q}
            </div>
            {previewQ === i && (
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, paddingLeft: 16 }}>
                → {item.a} — from your own PDF
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        <button
          onClick={onUploadClick}
          style={{
            background:   "var(--accent)",
            color:        "var(--bg-base)",
            border:       "none",
            borderRadius: 10,
            padding:      "12px 28px",
            fontSize:     15,
            fontWeight:   700,
            cursor:       "pointer",
            boxShadow:    "var(--accent-glow)",
          }}
        >
          Upload your PDF
        </button>

        <button
          onClick={handleSample}
          disabled={loading}
          style={{
            background:   "var(--bg-surface-2)",
            color:        "var(--accent)",
            border:       "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            borderRadius: 10,
            padding:      "12px 22px",
            fontSize:     14,
            fontWeight:   600,
            cursor:       loading ? "not-allowed" : "pointer",
            opacity:      loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading sample…" : "Try with a sample PDF →"}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--error)", marginTop: 4 }}>{error}</p>
      )}

      {/* Social proof micro-copy */}
      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
        JEE · NEET · UPSC · CA · Any subject · No credit card
      </p>
    </div>
  );
}
