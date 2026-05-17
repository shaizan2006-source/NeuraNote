"use client";
export default function SlumpMode({ userName, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        background: "rgba(251,191,36,0.06)",
        border: "1px solid rgba(251,191,36,0.15)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#FCD34D" }}>
          Tired? Take 5 minutes.
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9CA3AF" }}>
          Or just look around — no pressure. The afternoon slump is real.
        </p>
      </div>
      {children}
    </div>
  );
}
