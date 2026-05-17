"use client";
export default function NightMode({ userName, children }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        background: "rgba(14,165,233,0.06)",
        border: "1px solid rgba(14,165,233,0.12)",
        borderRadius: 14,
        padding: "18px 20px",
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#7DD3FC" }}>
          Late night, {userName}.
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
          Sleep is study too. Your brain consolidates today&apos;s work while you rest.
        </p>
      </div>
      {/* Night mode: no exam countdown, muted content */}
      <div style={{ opacity: 0.75 }}>{children}</div>
    </div>
  );
}
