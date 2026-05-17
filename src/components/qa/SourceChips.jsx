"use client";
export default function SourceChips({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: "#6B7280", alignSelf: "center" }}>Sources:</span>
      {sources.map((src, i) => (
        <span key={i} style={{
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: 12,
          padding: "2px 10px",
          fontSize: 11,
          color: "#A78BFA",
          cursor: src.url ? "pointer" : "default",
          whiteSpace: "nowrap",
        }}
          onClick={() => src.url && window.open(src.url, "_blank")}
        >
          📚 {src.name || src}
        </span>
      ))}
    </div>
  );
}
