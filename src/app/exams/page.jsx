"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useExamReminders } from "@/hooks/useExamReminders";
import ExamCountdownSection from "@/components/dashboard/exams/ExamCountdownSection";
import WeakTopicsSection from "@/components/dashboard/exams/WeakTopicsSection";
import AddExamModal from "@/components/dashboard/exams/AddExamModal";
import Link from "next/link";

export default function ExamsPage() {
  const { exams, activeExams, weakTopics, addExam } = useDashboard();
  const [showModal, setShowModal] = useState(false);

  useExamReminders(exams);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%)",
      padding: "20px",
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href="/dashboard" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#71717a",
            textDecoration: "none",
            marginBottom: 16,
            cursor: "pointer",
            transition: "color 200ms ease",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#a1a1aa"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}
          >
            ← Back to Dashboard
          </Link>

          <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 700, color: "#f4f4f5" }}>
            Exams
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#71717a" }}>
            Track your upcoming exams and focus on weak areas
          </p>
        </div>

        {/* Main Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 32,
        }}>
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Countdown Section */}
            <div style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(139,92,246,0.08))",
              borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
              borderColor: "rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(139,92,246,0.35)",
              borderRadius: 12,
              padding: 20,
              boxShadow: "inset 0 0 30px rgba(34,211,238,0.04)",
            }}>
              <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#e4e4e7" }}>
                Countdown
              </p>
              <ExamCountdownSection exams={exams} />
            </div>

            {/* Add Exam Button */}
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                border: "1px solid rgba(139,92,246,0.3)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(139,92,246,0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              + Add Exam
            </button>

            {/* Exams List */}
            {activeExams.length > 1 && (
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 16,
              }}>
                <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#71717a" }}>
                  All Exams ({activeExams.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeExams.map((exam) => {
                    const examDate = new Date(exam.exam_date + "T00:00:00");
                    const daysLeft = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={exam.id} style={{
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 6,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{ fontSize: 12, color: "#e4e4e7" }}>{exam.name}</span>
                        <span style={{ fontSize: 11, color: "#52525b" }}>
                          {daysLeft > 0 ? `${daysLeft}d` : "Past"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(139,92,246,0.08))",
            borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
            borderColor: "rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(34,211,238,0.25) rgba(139,92,246,0.35)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "inset 0 0 30px rgba(34,211,238,0.04)",
          }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#e4e4e7" }}>
              Weak Topics
            </p>
            <WeakTopicsSection weakTopics={weakTopics} />

            {weakTopics.length > 0 && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: "rgba(59,130,246,0.05)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: 6,
              }}>
                <p style={{ margin: 0, fontSize: 11, color: "#60a5fa", lineHeight: 1.5 }}>
                  💡 Tip: Topics you've asked about {weakTopics.some(t => (t.count || 0) >= 5) ? "5+ times" : "multiple times"} appear here. Focus practice on these areas to improve faster.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          padding: 16,
          background: "rgba(255,255,255,0.01)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#71717a" }}>Active Exams</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#22D3EE" }}>
              {activeExams.length}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#71717a" }}>Weak Topics</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#F59E0B" }}>
              {weakTopics.length}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#71717a" }}>Days to Next Exam</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#22C55E" }}>
              {activeExams.length > 0
                ? Math.ceil(
                    (new Date(activeExams[0].exam_date + "T00:00:00") - new Date()) /
                    (1000 * 60 * 60 * 24)
                  )
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AddExamModal
          onClose={() => setShowModal(false)}
          onSubmit={(examData) => {
            if (addExam) addExam();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
