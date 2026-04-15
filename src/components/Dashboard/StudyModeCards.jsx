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

function BentoCard({ title, subtitle, icon, onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{ ...BASE_CARD, ...style }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#e4e4e7" }}>{title}</p>
      <p style={{ margin: "3px 0 0", fontSize: 11, color: "#a1a1aa" }}>{subtitle}</p>
    </div>
  );
}

export default function StudyModeCards() {
  const router = useRouter();
  const { progressQuestions } = useDashboard();

  return (
    <>
      <BentoCard
        icon="⏱"
        title="Focus Mode"
        subtitle="Pomodoro 25m"
        onClick={() => router.push("/dashboard#section-focus")}
      />
      <BentoCard
        icon="✓"
        title="Quiz"
        subtitle={`${progressQuestions ?? 0} cards ready`}
        onClick={() => router.push("/dashboard#section-quiz")}
      />
      {/* AI Coach — cyan left border = AI signal */}
      <BentoCard
        icon="💬"
        title="AI Coach"
        subtitle="3 suggestions"
        onClick={() => router.push("/dashboard#section-coach")}
        style={{
          borderLeft:  "3px solid rgba(34,211,238,0.3)",
          boxShadow:   "0 0 16px rgba(34,211,238,0.08)",
        }}
      />
      <BentoCard
        icon="🎤"
        title="Voice Tutor"
        subtitle="Speak to learn"
        onClick={() => router.push("/call-tutor")}
      />
    </>
  );
}
