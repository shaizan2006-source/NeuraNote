"use client";
import { useState } from "react";

const PAUSE_OPTIONS = [
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
  { days: 90, label: "90 days" },
];

const CANCEL_REASONS = [
  "Too expensive",
  "Not using it enough",
  "Missing a feature I need",
  "Switching to another app",
  "Exam is over",
  "Other",
];

export default function SubscriptionFlow({ onDone }) {
  const [step, setStep] = useState("menu"); // menu | pause | cancel-confirm | cancel-reason | done
  const [pauseDays, setPauseDays] = useState(30);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handlePause() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_days: pauseDays }),
      });
      if (res.ok) { setMessage(`Subscription paused for ${pauseDays} days.`); setStep("done"); }
    } finally { setLoading(false); }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) { setMessage("Cancelled. Your data is yours."); setStep("done"); }
    } finally { setLoading(false); }
  }

  const card = {
    background: "#111111",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14, padding: 24, maxWidth: 400,
  };

  const btn = (bg, color = "#fff") => ({
    background: bg, color, border: "none", borderRadius: 8,
    padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 8,
  });

  if (step === "done") return (
    <div style={card}>
      <p style={{ color: "#10B981", marginBottom: 16 }}>{message}</p>
      <button onClick={onDone} style={btn("rgba(255,255,255,0.06)", "#9CA3AF")}>Close</button>
    </div>
  );

  if (step === "menu") return (
    <div style={card}>
      <h3 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 16 }}>Manage subscription</h3>
      <button onClick={() => setStep("pause")} style={btn("rgba(255,255,255,0.06)", "#E5E7EB")}>Pause subscription</button>
      <button onClick={() => setStep("cancel-confirm")} style={btn("rgba(239,68,68,0.1)", "#EF4444")}>Cancel subscription</button>
    </div>
  );

  if (step === "pause") return (
    <div style={card}>
      <h3 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8 }}>Pause subscription</h3>
      <p style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 16 }}>Taking a break? We&apos;ll pause your billing and resume automatically.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {PAUSE_OPTIONS.map(o => (
          <button key={o.days} onClick={() => setPauseDays(o.days)} style={{
            flex: 1, background: pauseDays === o.days ? "#8B5CF6" : "rgba(255,255,255,0.06)",
            border: "none", borderRadius: 8, padding: "8px", color: "#fff", cursor: "pointer", fontSize: 13,
          }}>{o.label}</button>
        ))}
      </div>
      <button onClick={handlePause} disabled={loading} style={btn("#8B5CF6")}>{loading ? "Pausing…" : `Pause for ${pauseDays} days`}</button>
      <button onClick={() => setStep("menu")} style={btn("transparent", "#6B7280")}>← Back</button>
    </div>
  );

  if (step === "cancel-confirm") return (
    <div style={card}>
      <h3 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8 }}>We&apos;re sorry to see you go.</h3>
      <p style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 20 }}>Before you cancel — a pause might be a better fit if you&apos;re just taking a break.</p>
      <button onClick={() => setStep("pause")} style={btn("#8B5CF6")}>Pause instead</button>
      <button onClick={() => setStep("cancel-reason")} style={btn("rgba(239,68,68,0.1)", "#EF4444")}>No, cancel my plan</button>
    </div>
  );

  if (step === "cancel-reason") return (
    <div style={card}>
      <h3 style={{ color: "#F9FAFB", marginTop: 0, marginBottom: 8 }}>Why are you cancelling?</h3>
      <p style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 14 }}>Optional — helps us improve.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {CANCEL_REASONS.map(r => (
          <button key={r} onClick={() => setReason(r)} style={{
            background: reason === r ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${reason === r ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 8, padding: "8px 12px", color: reason === r ? "#FCA5A5" : "#D1D5DB",
            fontSize: 13, cursor: "pointer", textAlign: "left",
          }}>{r}</button>
        ))}
      </div>
      <button onClick={handleCancel} disabled={loading} style={btn("rgba(239,68,68,0.15)", "#EF4444")}>{loading ? "Cancelling…" : "Confirm cancellation"}</button>
      <button onClick={() => setStep("menu")} style={btn("transparent", "#6B7280")}>← Back</button>
    </div>
  );

  return null;
}
