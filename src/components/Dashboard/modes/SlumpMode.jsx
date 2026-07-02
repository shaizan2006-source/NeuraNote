"use client";
import { useState, useEffect } from "react";

// Shown only when BOTH real signals hold (see src/lib/dashboardMode.js):
// it's the 2–5pm window AND the student hasn't answered anything today.
// Dismissal is per-day and actually respected — never fires again same day.
const DISMISS_KEY = "amn_slump_dismissed";
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function SlumpMode({ userName, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISS_KEY) !== todayStr());
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, todayStr()); } catch {}
  }

  return (
    <div style={{ flex: 1 }}>
      {visible && (
        <div style={{
          background: "color-mix(in srgb, var(--accent) 6%, transparent)",
          border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "var(--accent)" }}>
              Tired? Take 5 minutes.
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
              Or just look around — no pressure. The afternoon slump is real.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss for today"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
              color: "var(--text-tertiary)", fontSize: 12, fontWeight: 600,
              fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
            }}
          >
            Not today
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
