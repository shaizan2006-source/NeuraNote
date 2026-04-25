"use client";

function readinessColor(pct) {
  return pct >= 70 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#EF4444";
}

export default function ExamCountdownCard({ examName = null, examDaysLeft = null, examReadiness = 0, syllabusPct = 0 }) {
  if (!examName) {
    return (
      <div id="exam" style={{
        background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 140,
      }}>
        <p style={{ margin: 0, fontSize: 13, color: "#52525b" }}>No exam scheduled</p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#3f3f46" }}>Go to dashboard to add one</p>
      </div>
    );
  }

  const daysColor = examDaysLeft == null ? "#71717a" : examDaysLeft > 30 ? "#22C55E" : examDaysLeft > 7 ? "#F59E0B" : "#EF4444";

  return (
    <div id="exam" style={{
      background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px",
    }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Exam Countdown</p>
      <p style={{ margin: "2px 0 6px", fontSize: 12, color: "#a1a1aa" }}>{examName}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 52, fontWeight: 900, color: daysColor, lineHeight: 1 }}>{examDaysLeft ?? "—"}</span>
        <div>
          <p style={{ margin: 0, fontSize: 14, color: "#71717a" }}>days left</p>
          {examDaysLeft != null && examDaysLeft <= 7 && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#EF4444", fontWeight: 600 }}>Final sprint!</p>}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 18 }}>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Readiness</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: readinessColor(examReadiness) }}>{examReadiness}%</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Syllabus done</p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#8B5CF6" }}>{syllabusPct}%</p>
        </div>
      </div>

      <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
        <div style={{
          height: 4, width: `${examReadiness}%`, background: readinessColor(examReadiness),
          borderRadius: 2, transition: "width 1s ease-out",
        }} />
      </div>
    </div>
  );
}
