// src/components/dashboard/exams/StudyPlanModal.jsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { generateExamStudyPlan, writeSessionStorage } from "@/lib/examUtils";

const URGENCY_COLORS = {
  "Learn":          { border: "#22c55e", bg: "rgba(34,197,94,0.05)",   text: "#4ade80" },
  "Practice":       { border: "#f59e0b", bg: "rgba(245,158,11,0.05)",  text: "#fbbf24" },
  "Revise":         { border: "#ef4444", bg: "rgba(239,68,68,0.05)",   text: "#f87171" },
  "Final Revision": { border: "#ef4444", bg: "rgba(239,68,68,0.08)",   text: "#f87171" },
};

function getColors(action) {
  for (const [key, colors] of Object.entries(URGENCY_COLORS)) {
    if (action.includes(key)) return colors;
  }
  return URGENCY_COLORS["Learn"];
}

/**
 * @param {{
 *   exam: object,
 *   weakTopics: Array,
 *   getDaysLeft: (date: string) => number,
 *   onClose: () => void,
 * }} props
 */
export default function StudyPlanModal({ exam, weakTopics, getDaysLeft, onClose }) {
  const router = useRouter();
  const daysLeft = getDaysLeft(exam.exam_date);

  const plan = useMemo(
    () => generateExamStudyPlan(exam, weakTopics, getDaysLeft),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam.exam_date, weakTopics.length]
  );

  function handleStart(dayTopics) {
    if (!dayTopics.length) return;
    writeSessionStorage("amn_focus_prefill", {
      subject: exam.subject,
      topic: dayTopics[0].topic,
    });
    router.push("/focus");
  }

  if (plan.length === 0) {
    return (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
        onClick={onClose}
      >
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, maxWidth: 400, width: "90%" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ margin: 0, fontSize: 13, color: "#e4e4e7", fontWeight: 700 }}>Exam date has passed</p>
          <p style={{ margin: "6px 0 12px", fontSize: 11, color: "#71717a" }}>No study plan available for a past exam.</p>
          <button onClick={onClose} style={{ padding: "6px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#a1a1aa", fontSize: 11, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: "20px 0" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, maxWidth: 440, width: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>{exam.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "#71717a" }}>
              {daysLeft === 0 ? "Exam is today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
              {weakTopics.length > 0 && ` · ${weakTopics.length} weak topic${weakTopics.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: "#a1a1aa", fontSize: 10, cursor: "pointer" }}>
            ✕ Close
          </button>
        </div>

        {/* Plan list */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {plan.map((item) => {
            const colors = getColors(item.action);
            return (
              <div
                key={item.day}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", background: colors.bg, borderLeft: `3px solid ${colors.border}`, borderRadius: 4, opacity: item.isRestDay ? 0.5 : 1 }}
              >
                <div style={{ minWidth: 40, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 10, color: colors.text, fontWeight: 700 }}>
                    {item.day === 0 ? "Today" : `Day ${item.day}`}
                  </p>
                  <p style={{ margin: 0, fontSize: 8, color: "#52525b" }}>{item.date}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#e4e4e7" }}>
                    {item.action}
                    {item.topics.length > 0
                      ? ": " + item.topics.map((t) => t.topic).join(", ")
                      : item.isRestDay ? " — Rest day" : " — General revision"}
                  </p>
                </div>
                {!item.isRestDay && item.topics.length > 0 && (
                  <button
                    onClick={() => handleStart(item.topics)}
                    style={{ flexShrink: 0, padding: "3px 8px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 3, color: colors.text, fontSize: 9, fontWeight: 600, cursor: "pointer" }}
                  >
                    Start
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
