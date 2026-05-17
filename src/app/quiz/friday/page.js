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

  useEffect(() => {
    fetch("/api/quiz/friday/generate", { method: "POST" })
      .then(r => r.json())
      .then(d => { if (d.questions) setQuestions(d.questions); })
      .finally(() => setLoading(false));
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
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280" }}>
      Generating your Friday quiz…
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#F9FAFB", padding: "0 0 60px" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer" }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Friday Quiz</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>{questions.length} questions · ~15 min</p>
        </div>
        {!submitted && Object.keys(answers).length === questions.length && (
          <button onClick={handleSubmit} style={{ marginLeft: "auto", background: "#8B5CF6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
            Submit
          </button>
        )}
      </div>

      {submitted && score && (
        <div style={{ margin: "20px", background: score.pct >= 70 ? "rgba(16,185,129,0.1)" : "rgba(139,92,246,0.1)", border: `1px solid ${score.pct >= 70 ? "rgba(16,185,129,0.3)" : "rgba(139,92,246,0.3)"}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: score.pct >= 70 ? "#10B981" : "#A78BFA" }}>{score.pct}%</div>
          <div style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4 }}>{score.correct} of {score.total} correct</div>
        </div>
      )}

      <div style={{ padding: "0 16px", maxWidth: 720, margin: "0 auto" }}>
        {questions.map((q, i) => {
          const userAns = answers[i];
          const isCorrect = submitted && userAns?.startsWith(q.correct);
          const isWrong = submitted && userAns && !isCorrect;
          return (
            <div key={i} style={{ marginTop: 24, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 14, color: "#E5E7EB", marginBottom: 12 }}>
                <strong style={{ color: "#6B7280" }}>{i + 1}.</strong> {q.question}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt, j) => {
                  const letter = opt[0];
                  const selected = userAns === opt;
                  const correct = submitted && letter === q.correct;
                  const wrong = submitted && selected && !correct;
                  return (
                    <button key={j} onClick={() => handleAnswer(i, opt)} style={{
                      background: correct ? "rgba(16,185,129,0.15)" : wrong ? "rgba(239,68,68,0.15)" : selected ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${correct ? "rgba(16,185,129,0.4)" : wrong ? "rgba(239,68,68,0.4)" : selected ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 8, padding: "10px 14px", textAlign: "left",
                      color: "#E5E7EB", fontSize: 13, cursor: submitted ? "default" : "pointer",
                    }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && q.explanation && (
                <p style={{ fontSize: 12, color: "#6B7280", marginTop: 10, lineHeight: 1.6 }}>
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
