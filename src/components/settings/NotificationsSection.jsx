"use client";
import { useState, useEffect } from "react";
import { SettingsCard, SettingsGroup } from "./SettingsShell";
import { subscribeUser, unsubscribeUser, getPermissionState } from "@/lib/push";

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? "var(--accent-grad)" : "var(--bg-inset)",
        position: "relative", transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "var(--text-primary)", transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
      }} />
    </button>
  );
}

export default function NotificationsSection() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
  }, []);

  async function handleToggle(next) {
    setLoading(true);
    try {
      if (next) {
        const sub = await subscribeUser();
        setEnabled(!!sub);
        setPermission(Notification.permission);
      } else {
        await unsubscribeUser();
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Notifications</h1>

      <SettingsGroup label="Push notifications">
        <SettingsCard>
          {!supported ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Push notifications are not supported in this browser.</p>
          ) : permission === "denied" ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Notifications are blocked — update this in your browser settings and reload.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Study reminders &amp; streaks</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Get nudged when it&apos;s time to review or keep your streak alive.</p>
              </div>
              <Toggle on={enabled && !loading} onChange={handleToggle} />
            </div>
          )}
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
