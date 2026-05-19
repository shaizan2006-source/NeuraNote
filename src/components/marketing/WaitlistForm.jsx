"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_footer" }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p style={{ fontSize: 14, color: "var(--green)", fontWeight: 600 }}>
        ✓ Thanks. We&apos;ll email you when something good ships.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 14,
          background: "var(--surface-card)", border: "1px solid var(--border-default)",
          color: "var(--text-primary)", outline: "none", minWidth: 220,
        }}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
          background: "linear-gradient(135deg, var(--brand), #4f46e5)",
          color: "#fff", border: "none", cursor: "pointer",
          opacity: status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? "..." : "Notify me"}
      </button>
      {status === "error" && (
        <p style={{ width: "100%", fontSize: 12, color: "var(--red)", margin: 0 }}>
          Something went wrong. Try again.
        </p>
      )}
    </form>
  );
}
