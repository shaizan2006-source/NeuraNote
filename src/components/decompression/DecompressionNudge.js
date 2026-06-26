"use client";
import { useEffect, useState } from "react";

// Polls the decompression API once per session and shows a gentle nudge if triggered.
// Shadow mode is now off — this renders to users.
export default function DecompressionNudge() {
  const [nudge, setNudge] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only check once per app load
    const alreadyChecked = sessionStorage.getItem("decomp_checked");
    if (alreadyChecked) return;
    sessionStorage.setItem("decomp_checked", "1");

    const token = localStorage.getItem("sb_access_token") ?? "";
    if (!token) return;

    fetch("/api/decompression", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.triggered) setNudge(d); })
      .catch(() => null);
  }, []);

  function handleDismiss(response) {
    if (nudge?.trigger_id) {
      const token = localStorage.getItem("sb_access_token") ?? "";
      fetch("/api/decompression", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trigger_id: nudge.trigger_id, response }),
      }).catch(() => null);
    }
    setDismissed(true);
  }

  if (!nudge || dismissed) return null;

  const msg = nudge.message ?? {};

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      zIndex: 1000, width: "calc(100% - 32px)", maxWidth: 420,
      background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)",
      borderRadius: 16, padding: "16px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{msg.title ?? "Take a break"}</div>
        <button onClick={() => handleDismiss("dismissed")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{msg.body}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => handleDismiss("acknowledged")} style={{ flex: 1, background: "var(--accent)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "9px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {msg.cta ?? "OK"}
        </button>
        <button onClick={() => handleDismiss("snooze")} style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12, cursor: "pointer" }}>
          Snooze 2h
        </button>
      </div>
    </div>
  );
}