"use client";
export default function SlumpMode({ userName, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        background: "color-mix(in srgb, var(--accent) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--accent)" }}>
          Tired? Take 5 minutes.
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
          Or just look around — no pressure. The afternoon slump is real.
        </p>
      </div>
      {children}
    </div>
  );
}
