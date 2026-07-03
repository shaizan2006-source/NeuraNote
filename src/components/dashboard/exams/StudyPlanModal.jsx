// src/components/dashboard/exams/StudyPlanModal.jsx
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { generateExamStudyPlan, writeSessionStorage } from "@/lib/examUtils";

const URGENCY_COLORS = {
  "Learn":          { border: "var(--success)", bg: "color-mix(in srgb, var(--success) 5%, transparent)", text: "var(--success)" },
  "Practice":       { border: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 5%, transparent)", text: "var(--warning)" },
  "Revise":         { border: "var(--error)",   bg: "color-mix(in srgb, var(--error) 5%, transparent)",   text: "var(--error)" },
  "Final Revision": { border: "var(--error)",   bg: "color-mix(in srgb, var(--error) 8%, transparent)",   text: "var(--error)" },
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
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: 20, maxWidth: 400, width: "90%" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>Exam date has passed</p>
          <p style={{ margin: "6px 0 12px", fontSize: 11, color: "var(--text-tertiary)" }}>No study plan available for a past exam.</p>
          <button onClick={onClose} style={{ padding: "6px 16px", background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 11, cursor: "pointer" }}>Close</button>
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
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: 20, maxWidth: 440, width: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{exam.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-tertiary)" }}>
              {daysLeft === 0 ? "Exam is today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
              {weakTopics.length > 0 && ` · ${weakTopics.length} weak topic${weakTopics.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: "4px 10px", background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", borderRadius: 4, color: "var(--text-secondary)", fontSize: 10, cursor: "pointer" }}>
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
                  <p style={{ margin: 0, fontSize: 8, color: "var(--text-disabled)" }}>{item.date}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 10, color: "var(--text-primary)" }}>
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
