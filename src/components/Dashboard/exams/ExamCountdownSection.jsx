"use client";

import { useState, useEffect } from "react";

// Hex colors can't use .replace(")", ...) — map to rgba explicitly
function borderColor(hex) {
  const map = {
    "#22C55E": "rgba(34,197,94,0.2)",
    "#EAB308": "rgba(234,179,8,0.2)",
    "#EF4444": "rgba(239,68,68,0.2)",
    "#52525b": "rgba(82,82,91,0.2)",
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
        <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>No upcoming exams</p>
        <p style={{ margin: "4px 0 0", fontSize: 9, color: "#3f3f46" }}>Add one with the button below</p>
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
        border: "1px solid rgba(239,68,68,0.2)",
        textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "#EF4444" }}>Invalid exam date</p>
      </div>
    );
  }

  const msLeft = examDate - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isPast = daysLeft < 0;
  const isToday = daysLeft === 0;

  const countdownColor =
    isPast    ? "#52525b" :
    isToday   ? "#EF4444" :
    daysLeft > 14 ? "#22C55E" :
    daysLeft > 7  ? "#EAB308" :
                    "#EF4444";

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
          margin: 0, fontSize: 10, color: "#71717a",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {nextExam.name || "Untitled exam"}
        </p>

        {isPast ? (
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#52525b" }}>Exam passed</p>
        ) : isToday ? (
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 900, color: "#EF4444", lineHeight: 1 }}>
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
          <p style={{ margin: 0, fontSize: 9, color: "#71717a" }}>days left</p>
        )}
        {daysLeft <= 7 && daysLeft >= 0 && (
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "#EF4444", fontWeight: 600 }}>
            {isToday ? "🔥 Exam day!" : "Final sprint!"}
          </p>
        )}
        {activeExams.length > 1 && (
          <p style={{ margin: "4px 0 0", fontSize: 9, color: "#52525b" }}>
            +{activeExams.length - 1} more
          </p>
        )}
      </div>
    </div>
  );
}
