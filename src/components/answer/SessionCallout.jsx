"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const DOMAIN_LABELS = {
  cs:         "Computer Science",
  physics:    "Physics",
  chemistry:  "Chemistry",
  math:       "Mathematics",
  biology:    "Biology",
  law:        "Law",
  finance:    "Finance",
  mechanical: "Mechanical Eng.",
  electrical: "Electrical Eng.",
  general:    "General Studies",
};

/**
 * SessionCallout — motivational nudge shown once after each answer.
 *
 * Props:
 *   streak         {number}  — from DashboardContext
 *   domain         {string}  — from classification
 *   sessionCount   {number}  — questions answered this session (passed from AskAISection)
 *   isStreaming     {boolean}
 */
export default function SessionCallout({ streak, domain, sessionCount, isStreaming }) {
  const message = useMemo(() => {
    if (!domain || isStreaming) return null;
    return buildMessage(streak, domain, sessionCount);
  }, [streak, domain, sessionCount, isStreaming]);

  if (!message) return null;

  return (
    <motion.div
      key={`${domain}-${sessionCount}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: 0.3 }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        marginTop:    12,
        padding:      "8px 12px",
        borderRadius: 8,
        background:   "rgba(124,58,237,0.07)",
        border:       "1px solid rgba(124,58,237,0.15)",
        fontSize:     12,
        color:        "#a78bfa",
        fontWeight:   600,
      }}
    >
      <span style={{ fontSize: 14 }}>{message.icon}</span>
      <span>{message.text}</span>
    </motion.div>
  );
}

function buildMessage(streak, domain, sessionCount) {
  const domainLabel = DOMAIN_LABELS[domain] || "this subject";

  // Milestone: streak callouts
  if (streak >= 7 && sessionCount === 1) {
    return { icon: "🔥", text: `${streak}-day streak! Consistency is your superpower.` };
  }
  if (streak >= 3 && sessionCount === 1) {
    return { icon: "⚡", text: `${streak} days in a row — momentum is building.` };
  }

  // Session count milestones
  if (sessionCount === 5) {
    return { icon: "💪", text: `5 questions today in ${domainLabel} — that's a strong session.` };
  }
  if (sessionCount === 10) {
    return { icon: "🎯", text: `10 questions answered! You're in deep focus mode.` };
  }

  // Domain-specific nudges (shown on 2nd+ question)
  if (sessionCount >= 2) {
    const domainNudges = {
      cs:         { icon: "💻", text: `Keep going — algorithms get clearer with every question.` },
      physics:    { icon: "⚛️",  text: `Great work — each formula you practice sticks better.` },
      chemistry:  { icon: "🧪", text: `Solid session — mechanisms become automatic with repetition.` },
      math:       { icon: "📐", text: `Good momentum — mathematical intuition builds with practice.` },
      biology:    { icon: "🌿", text: `Nice — diagrams and processes are best learned by revisiting.` },
      law:        { icon: "⚖️",  text: `Cases and provisions get sharper with active recall.` },
      finance:    { icon: "📊", text: `Numbers feel natural when you work through examples daily.` },
      mechanical: { icon: "⚙️",  text: `Engineering problems click when you draw the FBD every time.` },
      electrical: { icon: "⚡", text: `Circuit problems rewire your thinking — keep at it.` },
      general:    { icon: "📚", text: `Every question you answer builds your edge.` },
    };
    return domainNudges[domain] || domainNudges.general;
  }

  // First question — simple welcome
  return { icon: "✨", text: `Good start — ${domainLabel} answers are ready when you are.` };
}
