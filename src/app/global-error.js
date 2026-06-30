"use client";
import "@/styles/variables.css";

/**
 * Last-resort boundary for errors thrown in the root layout itself. Must render its own
 * <html>/<body> because it replaces the root layout. Imports the token sheet so it stays
 * on-brand instead of an unstyled white crash.
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 16, textAlign: "center", padding: 24,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
          A critical error occurred. Reload to continue — your data is safe.
        </p>
        <button onClick={() => reset()} style={{
          padding: "10px 22px", borderRadius: 10, border: "none",
          background: "var(--accent-grad)", color: "var(--bg-base)",
          fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>Reload</button>
      </body>
    </html>
  );
}
