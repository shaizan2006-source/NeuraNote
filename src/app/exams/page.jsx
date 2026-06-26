"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useExamReminders } from "@/hooks/useExamReminders";
import ExamCountdownSection from "@/components/dashboard/exams/ExamCountdownSection";
import WeakTopicsSection from "@/components/dashboard/exams/WeakTopicsSection";
import AddExamModal from "@/components/dashboard/exams/AddExamModal";
import ExamsSidebar from "@/components/exams/ExamsSidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Activate reminders with current exams
  useExamReminders(exams);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [examsRes, topicsRes] = await Promise.all([
        fetch("/api/exam"),
        token ? fetch("/api/weak-topics", { headers }) : Promise.resolve(null),
      ]);

      if (examsRes.ok) {
        const { active = [], history = [] } = await examsRes.json();
        setExams([...active, ...history]);
      }
      if (topicsRes?.ok) {
        const { topics = [] } = await topicsRes.json();
        setWeakTopics(topics);
      }
    } catch (err) {
      console.error("ExamsPage fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeExams = exams.filter((e) => e.status === "active");

  const nextExamDaysLeft = activeExams.length > 0
    ? Math.ceil(
        (new Date(activeExams[0].exam_date + "T00:00:00") - new Date()) /
        (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface-2) 100%)",
    }}>
      <ExamsSidebar />

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
            Exams
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>
            Track your upcoming exams and focus on weak areas
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 80, borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                animation: "skeleton-pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : (
          <>
            {/* Main Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 24,
            }}>
              {/* Left — Countdown + list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))",
                  borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
                  borderColor: "color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 32%, transparent)",
                  borderRadius: 12, padding: 20,
                  boxShadow: "var(--accent-glow)",
                }}>
                  <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    Countdown
                  </p>
                  <ExamCountdownSection exams={activeExams} />
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  style={{
                    padding: "12px 16px",
                    background: "var(--accent-grad)",
                    border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                    borderRadius: 8, color: "var(--bg-base)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "var(--accent-glow)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  + Add Exam
                </button>

                {/* All exams list when multiple */}
                {activeExams.length > 1 && (
                  <div style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: 8, padding: 16,
                  }}>
                    <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>
                      All Active Exams ({activeExams.length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activeExams.map((exam) => {
                        const daysLeft = Math.ceil(
                          (new Date(exam.exam_date + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24)
                        );
                        return (
                          <div key={exam.id} style={{
                            padding: "8px 12px",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-hairline)",
                            borderRadius: 6,
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}>
                            <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{exam.name}</span>
                            <span style={{
                              fontSize: 11,
                              color: daysLeft <= 7 ? "var(--error)" : daysLeft <= 30 ? "var(--warning)" : "var(--success)",
                            }}>
                              {daysLeft > 0 ? `${daysLeft}d` : daysLeft === 0 ? "Today!" : "Past"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — Weak topics */}
              <div style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))",
                borderWidth: "1px 1px 1px 2px", borderStyle: "solid",
                borderColor: "color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 25%, transparent) color-mix(in srgb, var(--accent) 32%, transparent)",
                borderRadius: 12, padding: 20,
                boxShadow: "var(--accent-glow)",
              }}>
                <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                  Weak Topics
                </p>
                <WeakTopicsSection weakTopics={weakTopics} />

                {weakTopics.length > 0 && (
                  <div style={{
                    marginTop: 16, padding: 12,
                    background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 6,
                  }}>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--accent)", lineHeight: 1.5 }}>
                      💡 Topics asked 5+ times appear here. Focus on these to improve faster.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats bar */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12, padding: 16,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-hairline)", borderRadius: 8,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>Active Exams</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                  {activeExams.length}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>Weak Topics</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "var(--warning)" }}>
                  {weakTopics.length}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>Days to Next Exam</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "var(--success)" }}>
                  {nextExamDaysLeft !== null ? (nextExamDaysLeft >= 0 ? nextExamDaysLeft : "Past") : "—"}
                </p>
              </div>
            </div>
          </>
        )}
        </div>{/* /max-width */}
      </div>{/* /main content */}

      {/* Add Exam Modal */}
      {showModal && (
        <AddExamModal
          onClose={() => setShowModal(false)}
          onSubmit={(newExam) => {
            setExams((prev) => [...prev, newExam]);
            setShowModal(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
