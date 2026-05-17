"use client";
export default function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 8,
          height: 8,
          borderRadius: 4,
          background: i === current ? "#8B5CF6" : i < current ? "#6D28D9" : "rgba(255,255,255,0.12)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}
