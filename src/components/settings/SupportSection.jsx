// src/components/settings/SupportSection.jsx
"use client";
import { useState } from "react";
import { SettingsCard, SettingsGroup, GoldButton } from "./SettingsShell";

const SUBJECTS = ["Bug report", "Billing question", "Feature idea", "Other"];

export default function SupportSection({ token }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true); setError(null);
    try {
      const res = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subject, message: message.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Support</h1>

      <SettingsGroup label="Contact us">
        <SettingsCard>
          {sent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Message sent</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>We&apos;re here to help</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your issue or idea…"
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9, background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", color: "var(--text-primary)", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                  />
                </div>

                {error && <p style={{ margin: 0, fontSize: 12, color: "var(--error)" }}>{error}</p>}

                <GoldButton onClick={handleSend} disabled={sending || !message.trim()}>
                  {sending ? "Sending…" : "Send message"}
                </GoldButton>
              </div>
            </>
          )}
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="App info">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>
            Version <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</span>
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Ask My Notes — built for focused students.</p>
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
