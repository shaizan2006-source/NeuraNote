"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { ThemeToggle } from "@/components/Theme/ThemeToggle";
import UserProfileButton from "@/components/ui/UserProfile";

function getGreeting(hour) {
  if (hour >= 21 || hour < 5)  return { heading: "Studying late?",   subtext: "Stay consistent. You’re closer than you think." };
  if (hour >= 5  && hour < 12) return { heading: "Good morning",      subtext: "Ready to study?" };
  if (hour >= 12 && hour < 17) return { heading: "Good afternoon",    subtext: "Ready to study?" };
  return                               { heading: "Good evening",      subtext: "Ready to study?" };
}

const SSR_DEFAULT = { heading: "Good morning", subtext: "Ready to study?" };

export default function GreetingRow() {
  const [greeting, setGreeting] = useState(SSR_DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const { dashboardMode, toggleDashboardMode, user } = useDashboard();

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
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
          {heading}
        </h1>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 2 }}>
          {subtext}
        </p>
      </div>

      {/* Right side actions — Theme Toggle + Study/Progress toggle */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ThemeToggle />

        {/* Toggle button — Study | Progress pill */}
      {hydrated && (
        <button
          onClick={toggleDashboardMode}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 20,
            padding: 2,
            cursor: "pointer",
            transition: "all 200ms ease",
            height: 32,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.borderColor = "var(--border-hairline)";
          }}
        >
          {/* Study label */}
          <div
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600,
              color: dashboardMode === "study" ? "var(--text-primary)" : "var(--text-tertiary)",
              background: dashboardMode === "study" ? "var(--bg-surface-2)" : "transparent",
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
              color: dashboardMode === "progress" ? "var(--text-primary)" : "var(--text-tertiary)",
              background: dashboardMode === "progress" ? "var(--bg-surface-2)" : "transparent",
              borderRadius: 18,
              transition: "all 150ms ease",
            }}
          >
            Progress
          </div>
        </button>
      )}

        {/* Account menu — Profile / Settings / Support / Logout, on every dashboard visit */}
        {hydrated && <UserProfileButton user={user} />}
      </div>
    </div>
  );
}
