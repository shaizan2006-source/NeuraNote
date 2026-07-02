"use client";
import { useRouter } from "next/navigation";

/**
 * Persistent in-app exit — PWA/mobile users don't reliably have browser back.
 * Same pill pattern as the call-tutor top bar.
 */
export default function BackToDashboard({ label = "Dashboard", style = {} }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/dashboard")}
      aria-label="Back to dashboard"
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "var(--bg-surface-2)",
        border: "1px solid var(--border-hairline)",
        borderRadius: 24, padding: "7px 15px",
        color: "var(--text-tertiary)", fontSize: 13, fontWeight: 500,
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        transition: "color 0.15s, border-color 0.15s",
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "var(--border-hairline)"; }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>←</span> {label}
    </button>
  );
}
