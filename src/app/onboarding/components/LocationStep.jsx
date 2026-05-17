"use client";
import { useState } from "react";
import { REGIONS, CITIES_BY_REGION } from "@/lib/india-locations";

export default function LocationStep({ region, city, onRegionChange, onCityChange, onFinish, loading }) {
  const cities = region ? [...(CITIES_BY_REGION[region] ?? []), "Other"] : [];

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#F9FAFB", marginBottom: 8, textAlign: "center" }}>
        Where are you based?
      </h2>
      <p style={{ color: "#9CA3AF", textAlign: "center", marginBottom: 28, fontSize: 14 }}>
        Helps us match you with students in your region and surface local coaching context.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginBottom: 6 }}>Region</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => { onRegionChange(r); onCityChange(""); }}
              style={{
                background: region === r ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                border: `2px solid ${region === r ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8,
                padding: "8px",
                color: region === r ? "#A78BFA" : "#E5E7EB",
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
          <label style={{ fontSize: 12, color: "#9CA3AF", display: "block", marginBottom: 6 }}>City</label>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: "2px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "10px 12px",
              color: "#F9FAFB",
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
          background: "#8B5CF6",
          color: "#fff",
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

      <button onClick={onFinish} disabled={loading} style={{ width: "100%", background: "none", border: "none", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
        Skip location
      </button>
    </div>
  );
}
