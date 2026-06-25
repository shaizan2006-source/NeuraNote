"use client";
import { useState } from "react";
import { REGIONS, CITIES_BY_REGION } from "@/lib/india-locations";

export default function LocationStep({ region, city, onRegionChange, onCityChange, onFinish, loading }) {
  const cities = region ? [...(CITIES_BY_REGION[region] ?? []), "Other"] : [];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, textAlign: "center" }}>
        Where are you based?
      </h2>
      <p style={{ color: "var(--text-tertiary)", textAlign: "center", marginBottom: 28, fontSize: 14 }}>
        Helps us match you with students in your region and surface local coaching context.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: "var(--text-tertiary)", display: "block", marginBottom: 6 }}>Region</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => { onRegionChange(r); onCityChange(""); }}
              style={{
                background: region === r ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--bg-surface)",
                border: `2px solid ${region === r ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                borderRadius: 8,
                padding: "8px",
                color: region === r ? "var(--accent-bright)" : "var(--text-secondary)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {region && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: "var(--text-tertiary)", display: "block", marginBottom: 6 }}>City</label>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-surface-2)",
              border: "2px solid var(--border-strong)",
              borderRadius: 10,
              padding: "10px 12px",
              color: "var(--text-primary)",
              fontSize: 14,
            }}
          >
            <option value="">Select city…</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <button
        onClick={onFinish}
        disabled={loading}
        style={{
          width: "100%",
          background: "var(--accent-grad)",
          color: "var(--bg-base)",
          border: "none",
          borderRadius: 10,
          padding: "13px",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          marginBottom: 12,
        }}
      >
        {loading ? "Setting up…" : "Let's go →"}
      </button>

      <button onClick={onFinish} disabled={loading} style={{ width: "100%", background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>
        Skip location
      </button>
    </div>
  );
}
