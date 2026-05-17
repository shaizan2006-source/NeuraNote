"use client";

function getDisplay(percentile, cohortSize) {
  if (!cohortSize || cohortSize < 30) {
    return { label: "Cohort building", meta: `${cohortSize ?? 0} members so far` };
  }
  if (percentile == null) return null;
  if (percentile >= 99) return { label: "Top 1%", meta: "rare air" };
  if (percentile < 5) return { label: "Building momentum", meta: "just getting started" };
  return { label: `Top ${100 - Math.round(percentile)}%`, meta: `of ${cohortSize.toLocaleString()} cohort members` };
}

function isSuppressedHour(hour) {
  // Suppress during slump (14-17) and night (22-5)
  return (hour >= 14 && hour < 17) || hour >= 22 || hour < 5;
}

export default function CohortWidget({ peerPercentile, cohortSize }) {
  const hour = new Date().getHours();
  if (isSuppressedHour(hour)) return null;

  const display = getDisplay(peerPercentile, cohortSize);
  if (!display) return null;

  return (
    <div style={{
      background: "rgba(34,211,238,0.06)",
      border: "1px solid rgba(34,211,238,0.12)",
      borderRadius: 10,
      padding: "10px 14px",
      display: "inline-flex",
      flexDirection: "column",
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: "#22D3EE" }}>{display.label}</span>
      <span style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{display.meta}</span>
    </div>
  );
}
