"use client";
import { useEffect } from "react";

/**
 * Route error boundary — replaces the white crash with a branded, recoverable screen.
 * `reset()` re-renders the segment; the dashboard link is a guaranteed escape hatch.
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: "var(--bg-base)", padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Something went wrong</div>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
        An unexpected error interrupted this page. Your data is safe — try again.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button onClick={() => reset()} style={{
          padding: "10px 22px", borderRadius: 10, border: "none",
          background: "var(--accent-grad)", color: "var(--bg-base)",
          fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>Try again</button>
        <a href="/dashboard" style={{
          padding: "10px 22px", borderRadius: 10, border: "1px solid var(--border-strong)",
          color: "var(--text-secondary)", fontSize: 14, textDecoration: "none",
        }}>Back to dashboard</a>
      </div>
    </div>
  );
}
