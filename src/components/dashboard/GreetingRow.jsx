"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";

function getGreeting(hour) {
  if (hour >= 21 || hour < 5)  return { heading: "Studying late?",    subtext: "Stay consistent. You’re closer than you think." };
  if (hour >= 5  && hour < 12) return { heading: "Good morning",       subtext: "Ready to study?" };
  if (hour >= 12 && hour < 17) return { heading: "Good afternoon",     subtext: "Ready to study?" };
  return                               { heading: "Good evening",       subtext: "Ready to study?" };
}

const SSR_DEFAULT = { heading: "Good morning", subtext: "Ready to study?" };

export default function GreetingRow() {
  const [greeting, setGreeting] = useState(SSR_DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const { dashboardMode, toggleDashboardMode } = useDashboard();

  useEffect(() => {
    setHydrated(true);
    setGreeting(getGreeting(new Date().getHours()));
  }, []);

  const { heading, subtext } = greeting;

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>
          {heading}
        </h1>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 400, color: "#71717a", marginTop: 2 }}>
          {subtext}
        </p>
      </div>

      {/* Toggle button — Study | Progress pill */}
      {hydrated && (
        <button
          onClick={toggleDashboardMode}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 20,
            padding: 2,
            cursor: "pointer",
            transition: "all 200ms ease",
            height: 32,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
          }}
        >
          {/* Study label */}
          <div
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: dashboardMode === "study" ? "#f4f4f5" : "#71717a",
              background: dashboardMode === "study" ? "rgba(139,92,246,0.2)" : "transparent",
              borderRadius: 18,
              transition: "all 150ms ease",
            }}
          >
            Study
          </div>

          {/* Progress label */}
          <div
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: dashboardMode === "progress" ? "#f4f4f5" : "#71717a",
              background: dashboardMode === "progress" ? "rgba(139,92,246,0.2)" : "transparent",
              borderRadius: 18,
              transition: "all 150ms ease",
            }}
          >
            Progress
          </div>
        </button>
      )}
    </div>
  );
}
