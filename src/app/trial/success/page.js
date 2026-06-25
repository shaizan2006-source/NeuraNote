"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrialSuccessPage() {
  const router = useRouter();

  // Auto-redirect after 3 seconds
  useEffect(() => {
    const t = setTimeout(() => router.replace("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 24px",
    }}>
      <div style={{ textAlign: "center" }}>
        <h2 style={{
          fontSize: 22, fontWeight: 600, color: "var(--accent-bright)",
          fontFamily: "system-ui, sans-serif",
          margin: "0 0 12px",
        }}>
          Welcome to Pro.
        </h2>
        <p style={{
          fontSize: 15, color: "var(--text-tertiary)",
          fontFamily: "system-ui, sans-serif",
          margin: 0,
        }}>
          Taking you to your dashboard…
        </p>
      </div>
    </div>
  );
}
