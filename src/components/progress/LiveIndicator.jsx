"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * 6px dot in the dashboard header reflecting live-connection status.
 * - connected:    green pulse (2s)
 * - polling:      amber slower pulse (3s)
 * - disconnected: red, no pulse
 *
 * Tooltip shows "Last update: Ns ago" updated every 1s while mounted.
 */
const COLORS = {
  connected:    { dot: "#22C55E", glow: "rgba(34,197,94,0.55)",  label: "Live" },
  connecting:   { dot: "#F59E0B", glow: "rgba(245,158,11,0.55)", label: "Connecting…" },
  polling:      { dot: "#F59E0B", glow: "rgba(245,158,11,0.55)", label: "Polling fallback" },
  disconnected: { dot: "#EF4444", glow: "rgba(239,68,68,0.55)",  label: "Disconnected" },
};

function formatAgo(ts) {
  if (!ts) return "never";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

export default function LiveIndicator({ status = "connecting", lastUpdateAt = null }) {
  const c = COLORS[status] || COLORS.connecting;
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const stale = lastUpdateAt && Date.now() - lastUpdateAt > 5 * 60 * 1000;

  return (
    <div
      title={`${c.label} · Last update: ${formatAgo(lastUpdateAt)}${stale ? " — reconnecting…" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "help",
        userSelect: "none",
      }}
    >
      <span style={{ position: "relative", display: "inline-block", width: 6, height: 6 }}>
        <span
          style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            background: c.dot,
            boxShadow: `0 0 0 0 ${c.glow}`,
          }}
        />
        {(status === "connected" || status === "polling") && (
          <motion.span
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              background: c.dot,
              opacity: 0.6,
            }}
            animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: status === "connected" ? 2 : 3, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </span>
      <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 500, letterSpacing: 0.2 }}>
        {c.label}
      </span>
    </div>
  );
}
