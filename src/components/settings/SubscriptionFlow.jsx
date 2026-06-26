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
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-hairline)",
    borderRadius: 14, padding: 24, maxWidth: 400,
  };

  const btn = (bg, color = "var(--text-primary)") => ({
    background: bg, color, border: "none", borderRadius: 8,
    padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%", marginBottom: 8,
  });

  if (step === "done") return (
    <div style={card}>
      <p style={{ color: "var(--success)", marginBottom: 16 }}>{message}</p>
      <button onClick={onDone} style={btn("var(--bg-surface-2)", "var(--text-secondary)")}>Close</button>
    </div>
  );

  if (step === "menu") return (
    <div style={card}>
      <h3 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 16 }}>Manage subscription</h3>
      <button onClick={() => setStep("pause")} style={btn("var(--bg-surface-2)", "var(--text-primary)")}>Pause subscription</button>
      <button onClick={() => setStep("cancel-confirm")} style={btn("color-mix(in srgb, var(--error) 10%, transparent)", "var(--error)")}>Cancel subscription</button>
    </div>
  );

  if (step === "pause") return (
    <div style={card}>
      <h3 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8 }}>Pause subscription</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>Taking a break? We&apos;ll pause your billing and resume automatically.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {PAUSE_OPTIONS.map(o => (
          <button key={o.days} onClick={() => setPauseDays(o.days)} style={{
            flex: 1, background: pauseDays === o.days ? "var(--accent)" : "var(--bg-surface-2)",
            border: "none", borderRadius: 8, padding: "8px", color: pauseDays === o.days ? "var(--bg-base)" : "var(--text-primary)", cursor: "pointer", fontSize: 13,
          }}>{o.label}</button>
        ))}
      </div>
      <button onClick={handlePause} disabled={loading} style={btn("var(--accent)", "var(--bg-base)")}>{loading ? "Pausing…" : `Pause for ${pauseDays} days`}</button>
      <button onClick={() => setStep("menu")} style={btn("transparent", "var(--text-tertiary)")}>← Back</button>
    </div>
  );

  if (step === "cancel-confirm") return (
    <div style={card}>
      <h3 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8 }}>We&apos;re sorry to see you go.</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20 }}>Before you cancel — a pause might be a better fit if you&apos;re just taking a break.</p>
      <button onClick={() => setStep("pause")} style={btn("var(--accent)", "var(--bg-base)")}>Pause instead</button>
      <button onClick={() => setStep("cancel-reason")} style={btn("color-mix(in srgb, var(--error) 10%, transparent)", "var(--error)")}>No, cancel my plan</button>
    </div>
  );

  if (step === "cancel-reason") return (
    <div style={card}>
      <h3 style={{ color: "var(--text-primary)", marginTop: 0, marginBottom: 8 }}>Why are you cancelling?</h3>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 14 }}>Optional — helps us improve.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {CANCEL_REASONS.map(r => (
          <button key={r} onClick={() => setReason(r)} style={{
            background: reason === r ? "color-mix(in srgb, var(--error) 15%, transparent)" : "var(--bg-surface-2)",
            border: `1px solid ${reason === r ? "color-mix(in srgb, var(--error) 40%, transparent)" : "var(--border-hairline)"}`,
            borderRadius: 8, padding: "8px 12px", color: reason === r ? "var(--error)" : "var(--text-secondary)",
            fontSize: 13, cursor: "pointer", textAlign: "left",
          }}>{r}</button>
        ))}
      </div>
      <button onClick={handleCancel} disabled={loading} style={btn("color-mix(in srgb, var(--error) 15%, transparent)", "var(--error)")}>{loading ? "Cancelling…" : "Confirm cancellation"}</button>
      <button onClick={() => setStep("menu")} style={btn("transparent", "var(--text-tertiary)")}>← Back</button>
    </div>
  );

  return null;
}
