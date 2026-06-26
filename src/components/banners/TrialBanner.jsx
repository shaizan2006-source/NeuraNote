"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrialBanner() {
  const router = useRouter();
  const [trial, setTrial] = useState(null);

  useEffect(() => {
    fetch("/api/trial/status").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.is_trial && data.days_remaining <= 2) setTrial(data);
    }).catch(() => {});
  }, []);

  if (!trial) return null;

  return (
    <div style={{
      background: "color-mix(in srgb, var(--accent) 12%, transparent)",
      border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
      borderRadius: 8,
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 13, color: "var(--accent)" }}>
        ⏱ Pro trial: <strong>{trial.days_remaining} day{trial.days_remaining !== 1 ? "s" : ""} left.</strong>
      </span>
      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <button onClick={() => router.push("/pricing?plan=pro")} style={{
          background: "var(--accent)", color: "var(--bg-base)", border: "none", borderRadius: 6,
          padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Continue Pro</button>
        <button onClick={() => router.push("/pricing?plan=student")} style={{
          background: "transparent", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer",
        }}>Student plan</button>
      </div>
    </div>
  );
}
