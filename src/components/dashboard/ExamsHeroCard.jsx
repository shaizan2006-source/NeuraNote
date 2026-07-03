"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ExamCountdownSection from "./exams/ExamCountdownSection";
import WeakTopicsSection from "./exams/WeakTopicsSection";
import AddExamModal from "./exams/AddExamModal";
import { writeSessionStorage } from "@/lib/examUtils";

export default function ExamsHeroCard({ exams = [], weakTopics = [], onAddExam = null }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const selectedExam = exams.find((e) => e.status === "active") ?? exams[0] ?? null;

  const navigateToQuiz = (topic) => {
    writeSessionStorage("amn_prefill", {
      subject: selectedExam?.subject ?? "general",
      topic,
    });
    router.push("/quiz");
  };

  const navigateToAskAI = (topic) => {
    writeSessionStorage(
      "amn_ask_prefill",
      `Explain ${topic} from ${selectedExam?.subject ?? "this subject"} in simple terms`
    );
    router.push("/sage");
  };

  return (
    <>
      <style>{CSS_ANIMATIONS}</style>
      <div
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))",
          borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
          borderColor: "color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 32%, transparent)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "inset 0 0 30px var(--accent-glow-soft)",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Exams</p>
          <p style={{ margin: "3px 0 0", fontSize: 9, color: "var(--text-tertiary)" }}>
            Track your upcoming exams and focus on weak areas
          </p>
        </div>

        {/* Countdown Section */}
        <ExamCountdownSection exams={exams} />

        {/* Weak Topics Section */}
        <WeakTopicsSection
          topics={weakTopics}
          selectedExam={selectedExam}
          onAddExam={() => setShowModal(true)}
          onPractice={navigateToQuiz}
          onAskAI={navigateToAskAI}
          onStartQuiz={() => navigateToQuiz("")}
        />

        {/* Add Exam Button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            marginTop: "auto",
            padding: "8px 12px",
            background: "var(--accent-grad)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            borderRadius: 6,
            color: "var(--bg-base)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px var(--accent-glow-hard)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          + Add Exam
        </button>
      </div>

      {showModal && (
        <AddExamModal
          onClose={() => setShowModal(false)}
          onSubmit={(examData) => {
            if (onAddExam) onAddExam(examData);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

const CSS_ANIMATIONS = `
  @keyframes pulse-exam {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  @keyframes slideInTop {
    from { transform: translateY(-8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;
