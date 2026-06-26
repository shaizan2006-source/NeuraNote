"use client";
import MiniBarChart from "./MiniBarChart";

function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export default function StudyTimeCard({ thisWeekMins = 0, dailyStudyTime = [], peakStudyHour = null }) {
  const hrs  = Math.floor(thisWeekMins / 60);
  const mins = thisWeekMins % 60;
  const last7 = dailyStudyTime.slice(-7);

  return (
    <div id="analytics" style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 14, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Study Time</p>
      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
        {hrs > 0 ? `${hrs}h ` : ""}{mins > 0 || hrs === 0 ? `${mins}m` : ""}
        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 6 }}>this week</span>
      </p>
      <div style={{ marginTop: 10 }}>
        <MiniBarChart data={last7} height={36} barWidth={11} gap={4} />
        <div style={{ marginTop: 3, display: "flex", gap: 4 }}>
          {last7.map((d, i) => (
            <span key={i} style={{ width: 11, textAlign: "center", fontSize: 8, color: "var(--text-disabled)", display: "inline-block" }}>
              {DAYS[new Date(d.date + "T12:00:00").getDay()]}
            </span>
          ))}
        </div>
      </div>
      {peakStudyHour !== null && (
        <p style={{ margin: "8px 0 0", fontSize: 10, color: "var(--text-tertiary)" }}>
          Peak time: <span style={{ color: "var(--text-secondary)" }}>{fmtHour(peakStudyHour)}</span>
        </p>
      )}
    </div>
  );
}
