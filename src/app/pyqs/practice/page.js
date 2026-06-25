"use client";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const EXAMS = ["jee_main", "jee_advanced", "neet_ug"];
const SUBJECTS_MAP = {
  jee_main: ["Physics", "Chemistry", "Mathematics"],
  jee_advanced: ["Physics", "Chemistry", "Mathematics"],
  neet_ug: ["Physics", "Chemistry", "Biology"],
};

// useSearchParams() requires a Suspense boundary for static generation.
export default function PYQPracticePage() {
  return (
    <Suspense fallback={null}>
      <PYQPracticePageInner />
    </Suspense>
  );
}

function PYQPracticePageInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const [exam, setExam] = useState(sp.get("exam") ?? "jee_main");
  const [subject, setSubject] = useState(sp.get("subject") ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(20);

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ per_page: String(count) });
    if (exam) params.set("exam", exam);
    if (subject) params.set("subject", subject);
    if (difficulty) params.set("difficulty", difficulty);
    const d = await fetch(`/api/pyqs/search?${params}`).then(r => r.json());
    // Shuffle
    const arr = (d.results ?? []).sort(() => Math.random() - 0.5).slice(0, count);
    setQuestions(arr);
    setCurrent(0);
    setAnswers({});
    setRevealed({});
    setSubmitted(false);
    setScore(null);
    setLoading(false);
    setStarted(true);
  }, [exam, subject, difficulty, count]);

  function handleAnswer(idx, opt) {
    if (submitted || revealed[idx]) return;
    setAnswers(prev => ({ ...prev, [idx]: opt }));
  }

  function handleReveal(idx) {
    setRevealed(prev => ({ ...prev, [idx]: true }));
  }

  function handleSubmit() {
    let correct = 0;
    questions.forEach((q, i) => {
      const userLetter = (answers[i] ?? "")[0];
      if (userLetter && userLetter === q.correct_answer) correct++;
    });
    const total = questions.length;
    setScore({ correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 });
    setSubmitted(true);
  }

  const q = questions[current];
  const hasOptions = q && Array.isArray(q.options) && q.options.length > 0;
  const inp = (s) => ({ background: "var(--bg-inset)", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "6px 10px", color: "var(--text-primary)", fontSize: 13, ...s });
  const focusRing = (e) => { e.target.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)"; };
  const blurRing = (e) => { e.target.style.boxShadow = "none"; };

  if (!started) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, width: "100%", padding: 24 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", marginBottom: 20 }}>← Back</button>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Practice Mode</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 24 }}>Build a custom practice set</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Exam</label>
              <select value={exam} onChange={e => { setExam(e.target.value); setSubject(""); }} onFocus={focusRing} onBlur={blurRing} style={{ ...inp({}), width: "100%" }}>
                {EXAMS.map(e => <option key={e} value={e}>{e.replace(/_/g, " ").toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} onFocus={focusRing} onBlur={blurRing} style={{ ...inp({}), width: "100%" }}>
                <option value="">All subjects</option>
                {(SUBJECTS_MAP[exam] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)} onFocus={focusRing} onBlur={blurRing} style={{ ...inp({}), width: "100%" }}>
                <option value="">Any</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-tertiary)", display: "block", marginBottom: 4 }}>Number of questions</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))} onFocus={focusRing} onBlur={blurRing} style={{ ...inp({}), width: "100%" }}>
                {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <button onClick={load} onFocus={focusRing} onBlur={blurRing} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8 }}>
              Start Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
        Loading questions…
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 16 }}>No questions found for this filter.</div>
        <button onClick={() => setStarted(false)} onFocus={focusRing} onBlur={blurRing} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer" }}>Change Filters</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, background: "var(--bg-base)", zIndex: 10 }}>
        <button onClick={() => setStarted(false)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Practice: {subject || "All subjects"}</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{current + 1} / {questions.length}</div>
        </div>
        {!submitted && (
          <button onClick={handleSubmit} onFocus={focusRing} onBlur={blurRing} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Submit All
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--border-hairline)" }}>
        <div style={{ height: "100%", width: `${((current + 1) / questions.length) * 100}%`, background: "var(--accent)", transition: "width 0.3s" }} />
      </div>

      {/* Score banner */}
      {submitted && score && (
        <div style={{ margin: "20px", background: score.pct >= 70 ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--accent) 12%, transparent)", border: `1px solid ${score.pct >= 70 ? "color-mix(in srgb, var(--success) 40%, transparent)" : "color-mix(in srgb, var(--accent) 40%, transparent)"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: score.pct >= 70 ? "var(--success)" : "var(--accent)" }}>{score.pct}%</div>
          <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginTop: 4 }}>{score.correct} of {score.total} correct</div>
          <button onClick={() => { setStarted(false); }} onFocus={focusRing} onBlur={blurRing} style={{ marginTop: 16, background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
            Practice Again
          </button>
        </div>
      )}

      {/* Question navigation dots */}
      <div style={{ display: "flex", gap: 4, padding: "12px 20px", overflowX: "auto" }}>
        {questions.map((_, i) => {
          const answered = i in answers;
          const isActive = i === current;
          return (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: 28, height: 28, borderRadius: 6, border: "none", flexShrink: 0,
              background: isActive ? "var(--accent)" : answered ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--bg-surface)",
              color: isActive ? "var(--bg-base)" : "var(--text-tertiary)", fontSize: 11, cursor: "pointer", fontWeight: isActive ? 700 : 400,
            }}>{i + 1}</button>
          );
        })}
      </div>

      {/* Question */}
      {q && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 60px" }}>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{q.exam_type?.replace(/_/g, " ").toUpperCase()} {q.exam_year}</span>
              {q.subject && <span style={{ fontSize: 11, color: "var(--info)" }}>{q.subject}</span>}
              {q.chapter && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{q.chapter}</span>}
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)" }}>{q.question_text}</p>
          </div>

          {hasOptions && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {q.options.map((opt, j) => {
                const letter = opt[0];
                const sel = answers[current] === opt;
                const isCorrect = revealed[current] && letter === q.correct_answer;
                const isWrong = revealed[current] && sel && !isCorrect;
                return (
                  <button key={j} onClick={() => handleAnswer(current, opt)} style={{
                    background: isCorrect ? "color-mix(in srgb, var(--success) 12%, transparent)" : isWrong ? "color-mix(in srgb, var(--error) 12%, transparent)" : sel ? "var(--bg-surface-2)" : "var(--bg-surface)",
                    border: `1px solid ${isCorrect ? "color-mix(in srgb, var(--success) 40%, transparent)" : isWrong ? "color-mix(in srgb, var(--error) 40%, transparent)" : sel ? "var(--border-strong)" : "var(--border-hairline)"}`,
                    borderRadius: 8, padding: "10px 14px", textAlign: "left", color: "var(--text-secondary)", fontSize: 14,
                    cursor: revealed[current] ? "default" : "pointer", width: "100%",
                  }}>{opt}</button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!revealed[current] && answers[current] && (
              <button onClick={() => handleReveal(current)} onFocus={focusRing} onBlur={blurRing} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Check Answer
              </button>
            )}
            {current < questions.length - 1 && (
              <button onClick={() => setCurrent(c => c + 1)} onFocus={focusRing} onBlur={blurRing} style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>
                Next →
              </button>
            )}
          </div>

          {revealed[current] && q.solution_text && (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 10, padding: "14px 18px", marginTop: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Solution</div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{q.solution_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}