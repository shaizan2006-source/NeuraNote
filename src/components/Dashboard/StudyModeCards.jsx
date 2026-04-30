"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import ExamCard from "./exams/ExamCard";

const CARD_BASE = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  padding: 16,
  display: "block",
  textDecoration: "none",
  outline: "none",
  userSelect: "none",
};

const HOVER_VARIANTS = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.04, y: -3, transition: { duration: 0.18, ease: "easeOut" } },
  tap:   { scale: 0.97, y: 0,  transition: { duration: 0.1 } },
};

function BentoCard({ title, subtitle, icon, href, glowColor = "rgba(124,58,237,0.25)", style = {} }) {
  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      style={{ display: "block", textDecoration: "none", outline: "none", borderRadius: 10 }}
    >
      <motion.div
        variants={HOVER_VARIANTS}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        style={{ ...CARD_BASE, ...style }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = glowColor.replace(/[\d.]+\)$/, "0.5)");
          e.currentTarget.style.boxShadow   = `0 8px 28px ${glowColor}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
          e.currentTarget.style.boxShadow   = "none";
        }}
      >
        <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#e4e4e7" }}>{title}</p>
        <p style={{ margin: "3px 0 0", fontSize: 11, color: "#a1a1aa" }}>{subtitle}</p>
      </motion.div>
    </Link>
  );
}

export default function StudyModeCards() {
  const { progressQuestions } = useDashboard();

  return (
    <>
      <BentoCard
        icon="⏱"
        title="Focus Mode"
        subtitle="Pomodoro 25m"
        href="/focus"
        glowColor="rgba(124,58,237,0.25)"
      />
      <BentoCard
        icon="✓"
        title="Quiz"
        subtitle={`${progressQuestions ?? 0} cards ready`}
        href="/quiz"
        glowColor="rgba(34,211,238,0.25)"
      />
      <BentoCard
        icon="🎤"
        title="Call Tutor"
        subtitle="Speak to learn"
        href="/call-tutor"
        glowColor="rgba(245,158,11,0.25)"
      />
      <ExamCard />
    </>
  );
}
