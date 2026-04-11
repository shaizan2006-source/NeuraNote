"use client";

import { useDashboard } from "@/context/DashboardContext";

export default function ExamSection() {
  const {
    examName, setExamName, examDate, setExamDate,
    activeExams, historyExams,
    selectedExam, setSelectedExam,
    isExamExpanded, setIsExamExpanded,
    isHistoryExpanded, setIsHistoryExpanded,
    isExamSelectorOpen, setIsExamSelectorOpen,
    addExam, getActiveExam, getDaysLeft, getStudySuggestion,
  } = useDashboard();

  const activeExam = getActiveExam();

  return (
    <div id="section-exam" style={{ background: "linear-gradient(135deg, #0c1a2e 0%, #162032 100%)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 20, marginTop: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ fontSize: 22 }}>⏳</span>
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>Exam Countdown</span>
        {activeExams.length > 0 && (
          <span style={{ background: "var(--amber)", color: "black", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{activeExams.length} upcoming</span>
        )}
      </div>

      {/* Add exam form */}
      <div style={{ background: "var(--surface-card)", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid var(--border-default)" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>ADD NEW EXAM</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Subject" value={examName} onChange={(e) => setExamName(e.target.value)}
            style={{ flex: 2, minWidth: 90, padding: "9px 12px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--text-faint)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
            style={{ flex: 1, minWidth: 90, padding: "9px 12px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--text-faint)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
          <button onClick={addExam}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, var(--amber), var(--amber-dark))", color: "black", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Set Exam
          </button>
        </div>
      </div>

      {/* Active exam countdown */}
      {!activeExam ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-faint)", fontSize: 14 }}>No upcoming exams. Add one above ☝️</div>
      ) : (() => {
        const days = getDaysLeft(activeExam.exam_date);
        if (days < 0) return <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-muted)", fontSize: 14 }}>Your selected exam has passed.</div>;
        const urgencyBg = days <= 3 ? "linear-gradient(135deg, #7f1d1d, #450a0a)" : days <= 5 ? "linear-gradient(135deg, #78350f, #431407)" : "linear-gradient(135deg, #14532d, #052e16)";
        const urgencyColor = days <= 3 ? "#fca5a5" : days <= 5 ? "#fcd34d" : "#86efac";
        const urgencyMsg = days === 0 ? "🔥 Exam is TODAY!" : days === 1 ? "🚨 Tomorrow! Final revision now." : days <= 3 ? "🔴 Urgent — Revise weak areas" : days <= 5 ? "🟡 Revise important topics" : "🟢 Focus on core concepts";
        return (
          <div style={{ background: urgencyBg, borderRadius: 12, padding: "16px 18px", marginBottom: 16, border: `1px solid ${urgencyColor}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}>NEXT EXAM</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "var(--text-primary)" }}>{activeExam.name}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: "clamp(28px, 8vw, 42px)", color: urgencyColor, lineHeight: 1 }}>{Math.max(0, days)}</p>
                <p style={{ margin: 0, color: "#64748b", fontSize: 11 }}>days left</p>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontSize: 13, color: urgencyColor, fontWeight: 600 }}>{urgencyMsg}</div>
            <div style={{ marginTop: 6, color: "#0d9488", fontSize: 13, fontWeight: 500 }}>{getStudySuggestion()}</div>
          </div>
        );
      })()}

      {/* Exam selector */}
      {activeExams.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div onClick={() => setIsExamSelectorOpen((prev) => !prev)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--surface-card)", border: "1px solid var(--border-default)", cursor: "pointer", userSelect: "none" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>🗂 Select Active Exam ({activeExams.length})</span>
            <span style={{ color: "#64748b", fontSize: 14, display: "inline-block", transform: isExamSelectorOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>▼</span>
          </div>
          <div style={{ overflow: "hidden", maxHeight: isExamSelectorOpen ? "320px" : "0px", transition: "max-height 0.35s ease" }}>
            <div style={{ maxHeight: "300px", overflowY: "auto", paddingRight: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10 }}>
                {[...activeExams]
                  .filter((e) => { const t = new Date(); t.setHours(0,0,0,0); return new Date(e.exam_date + "T00:00:00") >= t; })
                  .sort((a, b) => new Date(a.exam_date + "T00:00:00") - new Date(b.exam_date + "T00:00:00"))
                  .map((exam) => {
                    const days = getDaysLeft(exam.exam_date);
                    const isSelected = selectedExam?.id === exam.id;
                    const urgencyColor = days <= 3 ? "var(--red)" : days <= 5 ? "var(--amber)" : "var(--green)";
                    return (
                      <div key={exam.id} onClick={() => { setSelectedExam(exam); setIsExamSelectorOpen(false); }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 10, cursor: "pointer", background: isSelected ? "#1e3a5f" : "var(--surface-card)", border: `2px solid ${isSelected ? urgencyColor : "var(--border-default)"}` }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{exam.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{exam.exam_date}</p>
                        </div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 20, color: urgencyColor }}>{days}d</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {historyExams.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div onClick={() => setIsHistoryExpanded((prev) => !prev)}
            style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", padding: "8px 0", userSelect: "none" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>📜 PREVIOUS EXAMS ({historyExams.length})</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12, display: "inline-block", transform: isHistoryExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>▼</span>
          </div>
          <div style={{ overflow: "hidden", maxHeight: isHistoryExpanded ? "260px" : "0px", transition: "max-height 0.35s ease" }}>
            <div style={{ maxHeight: "240px", overflowY: "auto", paddingTop: 8 }}>
              {[...historyExams].sort((a, b) => a.name.localeCompare(b.name)).map((exam) => (
                <div key={exam.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 6, background: "var(--surface-card)", opacity: 0.55 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{exam.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{exam.exam_date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
