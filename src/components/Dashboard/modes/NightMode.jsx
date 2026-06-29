"use client";
export default function NightMode({ userName, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        background: "color-mix(in srgb, var(--accent) 6%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--accent)" }}>
          Late night, {userName}.
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
          Sleep is study too. Your brain consolidates today&apos;s work while you rest.
        </p>
      </div>
      {/* Night mode: no exam countdown, muted content */}
      <div style={{ opacity: 0.75 }}>{children}</div>
    </div>
  );
}
