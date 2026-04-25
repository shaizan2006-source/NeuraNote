"use client";
import { useRouter } from "next/navigation";

export default function WeeklyRecapCard({ thisWeekMins = 0, weeklyChange = 0, strongestSubject = null }) {
  const router = useRouter();
  const hrs  = Math.floor(thisWeekMins / 60);
  const mins = thisWeekMins % 60;
  const up   = weeklyChange >= 0;

  return (
    <div
      id="insights"
      style={{
        background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px",
        cursor: "pointer", transition: "transform 200ms ease-out",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      onClick={() => router.push("/dashboard")}
    >
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Weekly Recap</p>
      <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 700, color: "#f4f4f5" }}>
        {hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`} studied
      </p>

      <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14, color: up ? "#22C55E" : "#EF4444", fontWeight: 700 }}>
          {up ? "↑" : "↓"} {Math.abs(weeklyChange)}%
        </span>
        <span style={{ fontSize: 10, color: "#52525b" }}>vs last week</span>
      </div>

      {strongestSubject && (
        <p style={{ margin: "8px 0 0", fontSize: 10, color: "#a1a1aa" }}>
          Strongest: <span style={{ color: "#8B5CF6", fontWeight: 600 }}>{strongestSubject}</span>
        </p>
      )}

      <p style={{ margin: "6px 0 0", fontSize: 10, color: up ? "#22C55E" : "#71717a" }}>
        {weeklyChange === 0 ? "Same as last week" : up ? "You're improving — keep going!" : "Let's pick it up this week"}
      </p>
    </div>
  );
}
