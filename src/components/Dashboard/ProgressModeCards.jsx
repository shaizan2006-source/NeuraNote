"use client";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";

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
  const { analytics, streak, selectedExam, getDaysLeft } = useDashboard();

  const daysLeft = selectedExam ? getDaysLeft(selectedExam.exam_date) : null;
  const sessions = analytics?.totalCompleted || 0;

  return (
    <>
      <BentoCard icon="📊" title="Analytics"
        subtitle={sessions > 0 ? `${sessions} sessions done` : "View breakdown"}
        onClick={() => router.push("/progress#analytics")} />
      <BentoCard icon="📋" title="Study Plan"
        subtitle="View your progress"
        onClick={() => router.push("/progress#study-plan")} />
      <BentoCard icon="📅" title="Exam Countdown"
        subtitle={daysLeft !== null ? `${daysLeft} days left` : "No exam set"}
        subtitleColor="#F59E0B"
        onClick={() => router.push("/progress#exam")} />
      <BentoCard icon="📈" title="Weekly Recap"
        subtitle={streak > 0 ? `${streak}-day streak 🔥` : "See insights"}
        onClick={() => router.push("/progress#insights")} />
    </>
  );
}
