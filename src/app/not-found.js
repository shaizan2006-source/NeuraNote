import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

/**
 * Branded 404 — replaces Next's default white page. Server component, tokens only.
 */
export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 18,
      background: "var(--bg-base)", padding: 24, textAlign: "center",
    }}>
      <div style={{ color: "var(--text-primary)", opacity: 0.9 }}>
        <LogoMark size={40} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>404</div>
      <p style={{ fontSize: 14, color: "var(--text-tertiary)", maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
        This page doesn&apos;t exist or has moved. Let&apos;s get you back to studying.
      </p>
      <Link href="/dashboard" style={{
        padding: "10px 24px", borderRadius: 10, border: "none",
        background: "var(--accent-grad)", color: "var(--bg-base)",
        fontWeight: 600, fontSize: 14, textDecoration: "none", marginTop: 4,
      }}>Back to dashboard</Link>
    </div>
  );
}
