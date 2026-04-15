"use client";

import { useRouter } from "next/navigation";

const BASE_CARD = {
  background:   "#111111",
  border:       "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  padding:      16,
  cursor:       "pointer",
  transition:   "transform 200ms ease-out",
};

function BentoCard({ title, subtitle, icon, onClick, subtitleColor }) {
  return (
    <div
      onClick={onClick}
      style={BASE_CARD}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#e4e4e7" }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 11, color: subtitleColor || "#a1a1aa" }}>{subtitle}</p>
    </div>
  );
}

export default function ProgressModeCards() {
  const router = useRouter();

  return (
    <>
      <BentoCard icon="📊" title="Analytics"      subtitle="6h studied this week" onClick={() => router.push("/dashboard#section-analytics")} />
      <BentoCard icon="📋" title="Study Plans"    subtitle="Day 12 of 30"          onClick={() => router.push("/dashboard#section-plan")} />
      <BentoCard icon="📅" title="Exam Countdown" subtitle="48 days left"          subtitleColor="#F59E0B" onClick={() => router.push("/dashboard#section-exam")} />
      <BentoCard icon="📈" title="Weekly Recap"   subtitle="+18% vs last week"     onClick={() => router.push("/dashboard#section-analytics")} />
    </>
  );
}
