"use client";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/imageCompression";

export default function PhotoDoubtButton({ onResult }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const compressed = await compressImage(file).catch(() => file);
    setPreview({ file: compressed, url: URL.createObjectURL(compressed) });
  }

  async function handleSend() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", preview.file);
      if (hint.trim()) form.append("question_hint", hint.trim());

      const res = await fetch("/api/photo-doubt", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "unclear_image") { setError(data.message); return; }
        if (data.error === "limit_reached") { setError("Daily photo limit reached. Upgrade to ask more."); return; }
        setError("Upload failed. Please try again.");
        return;
      }

      setPreview(null);
      setHint("");
      onResult?.(data);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleRetake() { setPreview(null); setError(""); inputRef.current?.click(); }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />

      {!preview ? (
        <button onClick={() => inputRef.current?.click()} title="Photo Doubt" style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 20, color: "var(--text-tertiary)", padding: "6px",
          display: "flex", alignItems: "center",
        }}>📷</button>
      ) : (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(8,8,10,0.9)",
          zIndex: 200, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <img src={preview.url} alt="Preview" style={{ maxWidth: "100%", maxHeight: "50vh", borderRadius: 12, objectFit: "contain" }} />
          <input
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="Add context (optional)…"
            style={{
              marginTop: 16, width: "100%", maxWidth: 400,
              background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)",
              borderRadius: 8, padding: "10px 14px", color: "var(--text-primary)", fontSize: 14,
            }}
          />
          {error && <p style={{ color: "var(--error)", fontSize: 13, marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={handleRetake} style={{ background: "var(--bg-surface-2)", border: "none", borderRadius: 8, padding: "10px 20px", color: "var(--text-primary)", cursor: "pointer" }}>Retake</button>
            <button onClick={handleSend} disabled={loading} style={{
              background: "var(--accent-grad)", border: "none", borderRadius: 8,
              padding: "10px 24px", color: "var(--bg-base)", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Analysing…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
