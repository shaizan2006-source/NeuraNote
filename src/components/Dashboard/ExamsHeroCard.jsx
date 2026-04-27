"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ExamCountdownSection from "./exams/ExamCountdownSection";
import WeakTopicsSection from "./exams/WeakTopicsSection";
import AddExamModal from "./exams/AddExamModal";

export default function ExamsHeroCard({ exams = [], weakTopics = [], onAddExam = null }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <style>{CSS_ANIMATIONS}</style>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(139,92,246,0.08))",
          borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
          borderColor: "rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(139,92,246,0.35)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "inset 0 0 30px rgba(34,211,238,0.04)",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Title */}
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Exams</p>
          <p style={{ margin: "3px 0 0", fontSize: 9, color: "#52525b" }}>
            Track your upcoming exams and focus on weak areas
          </p>
        </div>

        {/* Countdown Section */}
        <ExamCountdownSection exams={exams} />

        {/* Weak Topics Section */}
        <WeakTopicsSection weakTopics={weakTopics} />

        {/* Add Exam Button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            marginTop: "auto",
            padding: "8px 12px",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 6,
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(139,92,246,0.2)";
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
