"use client";

import { useState, useEffect } from "react";

export default function ExamCountdownSection({ exams = [] }) {
  const [now, setNow] = useState(new Date());

  // Update time every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get next upcoming exam
  const activeExams = exams.filter((e) => e.status === "active");
  const nextExam = activeExams.length > 0
    ? activeExams.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0]
    : null;

  if (!nextExam) {
    return (
      <div
        style={{
          padding: "12px",
          background: "rgba(255,255,255,0.02)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>No upcoming exams</p>
      </div>
    );
  }

  const examDate = new Date(nextExam.exam_date + "T00:00:00");
  const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
  const isPast = daysLeft < 0;

  const countdownColor =
    isPast ? "#52525b" :
    daysLeft > 30 ? "#22C55E" :
    daysLeft > 7 ? "#F59E0B" :
    "#EF4444";

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        border: `1px solid ${countdownColor.replace(")", ", 0.2)")}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 10, color: "#71717a" }}>{nextExam.name}</p>
        {isPast ? (
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#52525b" }}>Exam passed</p>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: countdownColor, lineHeight: 1 }}>
            {daysLeft}
          </p>
        )}
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <p style={{ margin: 0, fontSize: 9, color: "#71717a" }}>days left</p>
        {daysLeft <= 7 && daysLeft >= 0 && (
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "#EF4444", fontWeight: 600 }}>Final sprint!</p>
        )}
      </div>
    </div>
  );
}
