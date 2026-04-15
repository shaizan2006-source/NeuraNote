"use client";

import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

function getCellColor(score) {
  if (!score || score === 0) return "#27272a";
  if (score < 0.5) {
    const opacity = 0.35 + (score / 0.49) * 0.3;
    return `rgba(245,158,11,${opacity.toFixed(2)})`;
  }
  return "#22C55E";
}

function buildCells(topics = []) {
  return Array.from({ length: 16 }, (_, i) => ({
    score: topics[i]?.mastery ?? 0,
    label: topics[i]?.name ?? "",
  }));
}

export default function YourBrainHeroCard() {
  const router = useRouter();
  const { masteryTopics } = useDashboard();
  const cells = buildCells(masteryTopics || []);

  const masteredCount = cells.filter(c => c.score >= 0.5).length;
  const filledDots = Math.round((masteredCount / 16) * 6);

  return (
    <div
      onClick={() => router.push("/mastery")}
      style={{
        background:    "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(20,10,40,0.4))",
        border:        "1px solid rgba(139,92,246,0.18)",
        borderRadius:  12,
        padding:       16,
        display:       "flex",
        flexDirection: "column",
        gap:           0,
        cursor:        "pointer",
        height:        "100%",
        boxSizing:     "border-box",
        transition:    "transform 200ms ease-out",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Your Brain</p>
      <p style={{ margin: "2px 0 0", fontSize: 9, color: "#52525b" }}>
        {masteredCount}/16 topics mastered
      </p>

      {/* 4×4 mastery grid */}
      <div style={{ marginTop: 4, display: "grid", gridTemplateColumns: "repeat(4, 7px)", gap: 2 }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              width:        7,
              height:       7,
              borderRadius: 2,
              background:   getCellColor(cell.score),
            }}
          />
        ))}
      </div>

      {/* 6-dot progress bar */}
      <div style={{ marginTop: 4, display: "flex", gap: 3 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   i < filledDots ? "#8B5CF6" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
