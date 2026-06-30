"use client";
export default function Error({ reset }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "var(--bg-base)", textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Could not load your Brain Map</div>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 320, lineHeight: 1.6, margin: 0 }}>The concept graph failed to load. Your data is safe.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={() => reset()} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "var(--accent-grad)", color: "var(--bg-base)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Try again</button>
        <a href="/dashboard" style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid var(--border-strong)", color: "var(--text-secondary)", fontSize: 13, textDecoration: "none" }}>Dashboard</a>
      </div>
    </div>
  );
}
