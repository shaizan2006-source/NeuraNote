"use client";

import { useState, useEffect } from "react";

// Hex colors can't use .replace(")", ...) — map to rgba explicitly
function borderColor(hex) {
  const map = {
    "#34D399": "rgba(52,211,153,0.2)",
    "#F5B544": "rgba(245,181,68,0.2)",
    "#F0584F": "rgba(240,88,79,0.2)",
    "#46464B": "rgba(70,70,75,0.2)",
  };
  return map[hex] || "rgba(255,255,255,0.06)";
}

export default function ExamCountdownSection({ exams = [] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Guard: exams must be a non-null array
  const safeExams = Array.isArray(exams) ? exams : [];
  const activeExams = safeExams.filter((e) => e?.status === "active" && e?.exam_date);
  const nextExam = activeExams.length > 0
    ? [...activeExams].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0]
    : null;

  if (!nextExam) {
    return (
      <div style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "#46464B" }}>No upcoming exams</p>
        <p style={{ margin: "4px 0 0", fontSize: 9, color: "#46464B" }}>Add one with the button below</p>
      </div>
    );
  }

  // Guard: invalid date string produces NaN
  const examDate = new Date(nextExam.exam_date + "T00:00:00");
  const isValidDate = !isNaN(examDate.getTime());

  if (!isValidDate) {
    return (
      <div style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: "1px solid rgba(240,88,79,0.2)",
        textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "#F0584F" }}>Invalid exam date</p>
      </div>
    );
  }

  const msLeft = examDate - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isPast = daysLeft < 0;
  const isToday = daysLeft === 0;

  const countdownColor =
    isPast    ? "#46464B" :
    isToday   ? "#F0584F" :
    daysLeft > 14 ? "#34D399" :
    daysLeft > 7  ? "#F5B544" :
                    "#F0584F";

  return (
    <div style={{
      padding: "12px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 8,
      border: `1px solid ${borderColor(countdownColor)}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0, fontSize: 10, color: "#6B6B70",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {nextExam.name || "Untitled exam"}
        </p>

        {isPast ? (
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#46464B" }}>Exam passed</p>
        ) : isToday ? (
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 900, color: "#F0584F", lineHeight: 1 }}>
            Today!
          </p>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: countdownColor, lineHeight: 1 }}>
            {daysLeft}
          </p>
        )}
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {!isPast && !isToday && (
          <p style={{ margin: 0, fontSize: 9, color: "#6B6B70" }}>days left</p>
        )}
        {daysLeft <= 7 && daysLeft >= 0 && (
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "#F0584F", fontWeight: 600 }}>
            {isToday ? "Exam day!" : "Final sprint!"}
          </p>
        )}
        {activeExams.length > 1 && (
          <p style={{ margin: "4px 0 0", fontSize: 9, color: "#46464B" }}>
            +{activeExams.length - 1} more
          </p>
        )}
      </div>
    </div>
  );
}
