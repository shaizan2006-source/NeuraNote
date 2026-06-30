"use client";
import { useEffect, useState } from "react";

export default function StreakBadge() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/streak/status")
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.cumulative_days < 3) return null;

  return (
    <div style={{
      display: "inline-flex", flexDirection: "column",
      background: "color-mix(in srgb, var(--accent) 8%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
      borderRadius: 10, padding: "10px 14px",
      gap: 2,
    }}>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
        {data.badge_label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
        Day {data.cumulative_days}
      </span>
      {data.freezes_available > 0 && (
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
          {data.freezes_available} freeze{data.freezes_available !== 1 ? "s" : ""} available
        </span>
      )}
    </div>
  );
}
