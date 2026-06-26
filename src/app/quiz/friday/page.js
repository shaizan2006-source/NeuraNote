"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FridayQuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [error, setError] = useState(false);

  function generate() {
    setError(false);
    setLoading(true);
    fetch("/api/quiz/friday/generate", { method: "POST" })
      .then(r => r.json())
      .then(d => { if (d.questions) setQuestions(d.questions); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    generate();
  }, []);

  function handleAnswer(idx, option) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [idx]: option }));
  }

  function handleSubmit() {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i]?.startsWith(q.correct)) correct++;
    });
    setScore({ correct, total: questions.length, pct: Math.round((correct / questions.length) * 100) });
    setSubmitted(true);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
      Generating your Friday quiz…
    </div>
  );

  if (error || !questions.length) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: 24, textAlign: "center", maxWidth: 360 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Couldn&apos;t generate this week&apos;s quiz — try again.</p>
        <button onClick={generate} style={{ marginTop: 16, background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "0 0 60px" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Friday Quiz</h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{questions.length} questions · ~15 min</p>
        </div>
        {!submitted && Object.keys(answers).length === questions.length && (
          <button onClick={handleSubmit} style={{ marginLeft: "auto", background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
            Submit
          </button>
        )}
      </div>

      {submitted && score && (
        <div style={{ margin: "20px", background: score.pct >= 70 ? "color-mix(in srgb, var(--success) 12%, transparent)" : "color-mix(in srgb, var(--accent-bright) 12%, transparent)", border: `1px solid ${score.pct >= 70 ? "color-mix(in srgb, var(--success) 40%, transparent)" : "color-mix(in srgb, var(--accent-bright) 40%, transparent)"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: score.pct >= 70 ? "var(--success)" : "var(--accent-bright)" }}>{score.pct}%</div>
          <div style={{ fontSize: 14, color: "var(--text-tertiary)", marginTop: 4 }}>{score.correct} of {score.total} correct</div>
        </div>
      )}

      <div style={{ padding: "0 16px", maxWidth: 720, margin: "0 auto" }}>
        {questions.map((q, i) => {
          const userAns = answers[i];
          const isCorrect = submitted && userAns?.startsWith(q.correct);
          const isWrong = submitted && userAns && !isCorrect;
          return (
            <div key={i} style={{ marginTop: 24, paddingBottom: 20, borderBottom: "1px solid var(--border-hairline)" }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
                <strong style={{ color: "var(--text-tertiary)" }}>{i + 1}.</strong> {q.question}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt, j) => {
                  const letter = opt[0];
                  const selected = userAns === opt;
                  const correct = submitted && letter === q.correct;
                  const wrong = submitted && selected && !correct;
                  return (
                    <button key={j} onClick={() => handleAnswer(i, opt)} style={{
                      background: correct ? "color-mix(in srgb, var(--success) 15%, transparent)" : wrong ? "color-mix(in srgb, var(--error) 15%, transparent)" : selected ? "var(--bg-surface-2)" : "var(--bg-surface)",
                      border: `1px solid ${correct ? "color-mix(in srgb, var(--success) 40%, transparent)" : wrong ? "color-mix(in srgb, var(--error) 40%, transparent)" : selected ? "var(--border-strong)" : "var(--border-hairline)"}`,
                      borderRadius: 8, padding: "10px 14px", textAlign: "left",
                      color: "var(--text-secondary)", fontSize: 13, cursor: submitted ? "default" : "pointer",
                    }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.6 }}>
                  💡 {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
