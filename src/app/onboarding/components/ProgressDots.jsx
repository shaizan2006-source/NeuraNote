"use client";
export default function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 8,
          height: 8,
          borderRadius: 4,
          background: i === current ? "var(--accent)" : i < current ? "var(--accent-dim)" : "var(--bg-surface-2)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}
