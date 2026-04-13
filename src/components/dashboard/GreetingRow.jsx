"use client";

import { useDashboard } from "@/context/DashboardContext";

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getSubtext(mode, hour) {
  const isNight = hour >= 21 || hour < 5;
  if (mode === "progress") return "See your progress";
  return isNight ? "Studying late?" : "Ready to study?";
}

export default function GreetingRow({ userName = "there" }) {
  const { dashboardMode, toggleDashboardMode } = useDashboard();
  const hour    = new Date().getHours();
  const greeting = getGreeting(hour);
  const subtext  = getSubtext(dashboardMode, hour);

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      marginBottom:   20,
    }}>
      {/* Left: greeting */}
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#f4f4f5", lineHeight: 1.2 }}>
          {greeting}, {userName}
        </h1>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 400, color: "#71717a", marginTop: 2 }}>
          {subtext}
        </p>
      </div>

      {/* Right: mode toggle pill */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        background:    "rgba(255,255,255,0.04)",
        borderRadius:  20,
        padding:       2,
        border:        "1px solid rgba(255,255,255,0.08)",
      }}>
        {["study", "progress"].map(mode => (
          <button
            key={mode}
            onClick={() => toggleDashboardMode()}
            style={{
              padding:      "6px 12px",
              borderRadius: 18,
              fontSize:     10,
              fontWeight:   600,
              border:       "none",
              cursor:       "pointer",
              transition:   "all 200ms ease-in-out",
              background:   dashboardMode === mode
                ? "linear-gradient(135deg, #8B5CF6, #6D28D9)"
                : "transparent",
              color:        dashboardMode === mode ? "#fff" : "#71717a",
            }}
          >
            {mode === "study" ? "Study" : "Progress"}
          </button>
        ))}
      </div>
    </div>
  );
}
