"use client";

import { useState } from "react";
import { trackEvent, EVENTS } from "@/lib/telemetry/events";

export default function ParentReferralButton({ session, profile, pageLoadTime }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [parentPhone, setParentPhone] = useState(profile?.parent_phone_number ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!parentPhone) { setError("Enter your parent's WhatsApp number."); return; }
    if (!/^\+91[6-9]\d{9}$/.test(parentPhone)) {
      setError("Enter a valid +91 Indian number.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/parent-referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ parent_phone_number: parentPhone }),
      });

      if (res.ok) {
        await trackEvent(session.user.id, EVENTS.PARENT_REFERRAL_INITIATED, {
          parent_phone_set: true,
          time_on_page_sec: Math.round((Date.now() - pageLoadTime) / 1000),
        });
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to send. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: "none", border: "none",
            color: "var(--text-tertiary)", fontSize: 13,
            textDecoration: "underline", cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Need to ask your parent?
        </button>
      </div>

      {modalOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setModalOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }}
          />

          {/* Modal */}
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--bg-surface)", borderRadius: 16,
            padding: "28px 24px",
            width: "calc(100% - 48px)", maxWidth: 360,
            zIndex: 50,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px", fontFamily: "system-ui, sans-serif" }}>
              Share with your parent
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: "0 0 20px", fontFamily: "system-ui, sans-serif" }}>
              We'll send them a WhatsApp with your progress and a payment link.
            </p>

            {/* Preview message */}
            <div style={{
              background: "var(--bg-surface-2)", borderRadius: 10,
              padding: "12px 14px", marginBottom: 16,
              fontSize: 13, color: "var(--text-secondary)",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.5,
            }}>
              Namaste, <strong>{(profile?.full_name ?? "your child").split(" ")[0]}</strong> is using Ask My Notes for JEE/NEET prep.
              Pro plan ₹399/month ya ₹2,999/year. Payment link: <span style={{ color: "var(--accent)" }}>askmynotes.in/parent-pay?…</span>
            </div>

            {!sent ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6, fontFamily: "system-ui, sans-serif" }}>
                    Parent's WhatsApp number
                  </div>
                  <input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={parentPhone}
                    onChange={e => { setParentPhone(e.target.value); setError(""); }}
                    style={{
                      width: "100%", background: "var(--bg-inset)",
                      border: "1px solid var(--border-hairline)", borderRadius: 8,
                      padding: "10px 12px", fontSize: 14,
                      color: "var(--text-primary)", boxSizing: "border-box",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  />
                  {error && <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>{error}</p>}
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    width: "100%", background: sending ? "var(--bg-surface-2)" : "var(--accent-grad)",
                    color: sending ? "var(--text-disabled)" : "var(--bg-base)", border: "none", borderRadius: 8,
                    padding: "12px", fontSize: 14, fontWeight: 600,
                    cursor: sending ? "not-allowed" : "pointer",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {sending ? "Sending…" : "Send WhatsApp"}
                </button>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "var(--success)", fontSize: 14, fontFamily: "system-ui, sans-serif" }}>
                ✓ Sent! Your parent will receive it shortly.
              </div>
            )}

            <button
              onClick={() => setModalOpen(false)}
              style={{
                display: "block", margin: "16px auto 0", background: "none",
                border: "none", color: "var(--text-tertiary)", fontSize: 13,
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </>
  );
}
