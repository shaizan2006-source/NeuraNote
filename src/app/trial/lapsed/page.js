"use client";

import { useRouter } from "next/navigation";

export default function LapsedPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>

        <h2 style={{
          fontSize: 22, fontWeight: 600, color: "var(--text-primary)",
          fontFamily: "system-ui, sans-serif",
          margin: "0 0 12px",
        }}>
          Your Pro trial ended.
        </h2>

        <p style={{
          fontSize: 15, color: "var(--text-tertiary)",
          fontFamily: "system-ui, sans-serif",
          margin: "0 0 36px",
          lineHeight: 1.6,
        }}>
          Want to give it another try?
        </p>

        <button
          onClick={() => router.push("/trial/decision")}
          style={{
            width: "100%", height: 52,
            background: "var(--accent-grad)", color: "var(--bg-base)",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 600,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            marginBottom: 14,
          }}
        >
          Try again
        </button>

        <button
          onClick={() => router.replace("/dashboard")}
          style={{
            width: "100%", background: "none",
            border: "none", color: "var(--text-tertiary)",
            fontSize: 14, cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Continue free
        </button>

      </div>
    </div>
  );
}
