"use client";
import { useEffect, useState } from "react";
import { getSessionCount, dismissPrompt, isPromptSuppressed } from "@/lib/sessionCounter";
import { subscribeUser } from "@/lib/push";

export default function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [state, setState] = useState("idle"); // idle | requesting | denied | granted

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = Notification.permission;
    if (permission === "granted" || isPromptSuppressed()) return;
    if (permission === "denied") { setState("denied"); setShow(true); return; }
    if (getSessionCount() >= 3) setShow(true);
  }, []);

  async function handleAccept() {
    setState("requesting");
    const sub = await subscribeUser();
    if (sub) {
      setState("granted");
      setTimeout(() => setShow(false), 1500);
    } else {
      setState("denied");
    }
  }

  function handleDismiss() {
    dismissPrompt();
    setShow(false);
  }

  if (!show) return null;

  if (state === "denied") return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: "#9CA3AF" }}>
      To enable notifications: browser Settings → Site Settings → Notifications → Allow for this site.
      <button onClick={() => setShow(false)} style={{ marginLeft: 12, background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
    </div>
  );

  if (state === "granted") return (
    <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: "#10B981" }}>
      Notifications enabled. Your morning briefing will arrive at 7:00 AM.
    </div>
  );

  return (
    <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: "#E5E7EB" }}>
        Want a 90-second Briefing each morning? It sets your day up in under 2 minutes.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleAccept} disabled={state === "requesting"} style={{
          background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 7,
          padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          {state === "requesting" ? "Enabling…" : "Yes — at 7:00 AM"}
        </button>
        <button onClick={handleDismiss} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
          Not right now
        </button>
      </div>
    </div>
  );
}
