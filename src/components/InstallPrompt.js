"use client";
import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't re-show if already dismissed this session
    if (sessionStorage.getItem("pwa-prompt-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setDismissed(true);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        left: 16,
        right: 16,
        zIndex: 2000,
        background: "var(--surface-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-card-high)",
      }}
    >
      <img src="/icons/icon-72.png" alt="" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>
          Add to Home Screen
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
          Study offline, get notifications
        </div>
      </div>
      <button
        onClick={handleInstall}
        style={{
          background: "var(--brand)",
          color: "var(--bg-base)",
          border: "none",
          borderRadius: 8,
          padding: "7px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          fontSize: 18,
          cursor: "pointer",
          padding: "4px 6px",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
