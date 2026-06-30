"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { normalizeOptions } from "@/lib/pyqs/normalizeQuestion";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const EXAMS = [
  { id: "jee_main", label: "JEE Main", desc: "90 Q · 3 hours · 300 marks" },
  { id: "jee_advanced", label: "JEE Advanced", desc: "54 Q · 3 hours · 180 marks" },
  { id: "neet_ug", label: "NEET UG", desc: "180 Q · 3h 20min · 720 marks" },
];

const VIEWS = { setup: "setup", running: "running", result: "result" };

function fmt(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export default function MockTestPage() {
  const router = useRouter();
  const [view, setView] = useState(VIEWS.setup);
  const [exam, setExam] = useState("jee_main");
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const [token, setToken] = useState(null);

  // F-017/F-027: require a session (redirect logged-out users) AND capture the token —
  // create/submit previously sent no Authorization header, so the simulator 401'd for
  // everyone (verifyAuth is Bearer-only).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data?.session?.access_token;
      if (!t) { router.push("/login"); return; }
      setToken(t);
    });
  }, []);

  useEffect(() => {
    if (view === VIEWS.running && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      }), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [view, timeLeft]);

  async function startTest() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/mock-test/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exam_type: exam }),
      });
      const d = await res.json();
      if (!res.ok || d.error) { setError(d.error || "Couldn't load the test — try again."); return; }
      setTest(d);
      setTimeLeft(d.duration_seconds);
      setAnswers({});
      setCurrent(0);
      setView(VIEWS.running);
    } catch {
      setError("Couldn't load the test — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    clearInterval(timerRef.current);
    setError(null);
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([qid, ans]) => ({ question_id: qid, answer: ans }));
      const res = await fetch("/api/mock-test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ test_id: test.test_id, answers: payload }),
      });
      const d = await res.json();
      if (!res.ok || d.error) { setError(d.error || "Couldn't submit your test — try again."); return; }
      setResult(d);
      setView(VIEWS.result);
    } catch {
      setError("Couldn't submit your test — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const q = test?.questions[current];
  const opts = q ? normalizeOptions(q.options) : [];
  const timerColor = timeLeft < 300 ? "var(--error)" : timeLeft < 900 ? "var(--warning)" : "var(--success)";

  if (view === VIEWS.setup) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", padding: 32 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", marginBottom: 20 }}>← Back</button>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Mock Test</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 24 }}>Full syllabus simulation with official paper pattern</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {EXAMS.map(e => (
              <button key={e.id} onClick={() => setExam(e.id)} style={{
                background: exam === e.id ? "var(--bg-surface-2)" : "var(--bg-surface)",
                border: `1px solid ${exam === e.id ? "var(--accent-dim)" : "var(--border-hairline)"}`,
                borderRadius: 10, padding: "14px 18px", textAlign: "left", cursor: "pointer",
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: exam === e.id ? "var(--text-primary)" : "var(--text-secondary)" }}>{e.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{e.desc}</div>
              </button>
            ))}
          </div>

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "var(--warning)", marginBottom: 4 }}>Before you start</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.8 }}>
              <li>Ensure you have an uninterrupted 3 hour window</li>
              <li>No calculator, no notes — exam conditions</li>
              <li>Timer starts immediately when you click Begin</li>
            </ul>
          </div>

          {error && (
            <div style={{ background: "color-mix(in srgb, var(--error) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--error) 35%, transparent)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--error)" }}>{error}</span>
              <button onClick={startTest} disabled={loading} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Retry</button>
            </div>
          )}

          <button onClick={startTest} disabled={loading} style={{ width: "100%", background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: 14, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
            {loading ? "Loading questions…" : "Begin Mock Test →"}
          </button>
        </div>
      </div>
    );
  }

  if (view === VIEWS.running && q) {
    const subjects = [...new Set((test.questions ?? []).map(q => q.subject))];
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
        {/* Top bar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "var(--bg-base)", zIndex: 20 }}>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{exam.replace(/_/g, " ").toUpperCase()} · {current + 1}/{test.questions.length}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: timerColor, fontVariantNumeric: "tabular-nums" }}>{fmt(timeLeft)}</div>
          <button onClick={handleSubmit} disabled={submitting} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 6, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>

        {error && (
          <div style={{ background: "color-mix(in srgb, var(--error) 12%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--error) 35%, transparent)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--error)" }}>{error}</span>
            <button onClick={handleSubmit} disabled={submitting} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 6, padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>{submitting ? "Submitting…" : "Retry"}</button>
          </div>
        )}

        {/* Subject tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-hairline)", overflowX: "auto" }}>
          {subjects.map(sub => {
            const subQs = test.questions.filter(q => q.subject === sub);
            const answered = subQs.filter(q => answers[q.id]).length;
            const active = q.subject === sub;
            return (
              <button key={sub} onClick={() => { const first = test.questions.findIndex(q => q.subject === sub); if (first >= 0) setCurrent(first); }} style={{
                padding: "10px 16px", background: "none", border: "none", borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                color: active ? "var(--text-primary)" : "var(--text-tertiary)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                {sub} <span style={{ opacity: 0.6 }}>({answered}/{subQs.length})</span>
              </button>
            );
          })}
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 20px 80px" }}>
          {/* Question number grid */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
            {test.questions.map((tq, i) => {
              const isActive = i === current;
              const isAnswered = !!answers[tq.id];
              return (
                <button key={i} onClick={() => setCurrent(i)} style={{
                  width: 32, height: 32, borderRadius: 6, border: "none", flexShrink: 0,
                  background: isActive ? "var(--accent)" : isAnswered ? "color-mix(in srgb, var(--accent) 28%, transparent)" : "var(--bg-surface)",
                  color: isActive ? "var(--bg-base)" : "var(--text-tertiary)", fontSize: 11, cursor: "pointer", fontWeight: isActive ? 700 : 400,
                }}>{i + 1}</button>
              );
            })}
          </div>

          {/* Question card */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 8 }}>{q.subject} {q.chapter ? `· ${q.chapter}` : ""}</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--text-primary)" }}>{q.question_text}</p>
          </div>

          {/* Options */}
          {opts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {opts.map((opt) => {
                const selected = answers[q.id] === opt.key;
                return (
                  <button key={opt.key} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))} style={{
                    background: selected ? "var(--bg-surface-2)" : "var(--bg-surface)",
                    border: `1px solid ${selected ? "var(--border-strong)" : "var(--border-hairline)"}`,
                    borderRadius: 8, padding: "10px 14px", textAlign: "left", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", width: "100%",
                  }}>
                    <span style={{ fontWeight: 700, marginRight: 8 }}>{opt.key}.</span>{opt.text}
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 8 }}>
            {current > 0 && (
              <button onClick={() => setCurrent(c => c - 1)} style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>← Prev</button>
            )}
            {current < test.questions.length - 1 && (
              <button onClick={() => setCurrent(c => c + 1)} style={{ background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer" }}>Next →</button>
            )}
            {answers[q.id] && (
              <button onClick={() => setAnswers(prev => { const n = { ...prev }; delete n[q.id]; return n; })} style={{ marginLeft: "auto", background: "color-mix(in srgb, var(--error) 12%, transparent)", color: "var(--error)", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 12, cursor: "pointer" }}>Clear</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === VIEWS.result && result) {
    const pct = result.percentage ?? 0;
    const color = pct >= 70 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--error)";
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "0 0 60px" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-hairline)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>← Dashboard</button>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Mock Test Results</h1>
        </div>

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px" }}>
          {/* Score */}
          <div style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`, borderRadius: 16, padding: "28px 24px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 56, fontWeight: 800, color }}>{pct}%</div>
            <div style={{ fontSize: 16, color: "var(--text-tertiary)", marginTop: 4 }}>{result.marks_obtained} / {result.total_marks} marks</div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 8 }}>
              {result.correct} correct · {result.incorrect} wrong · {result.unanswered} unanswered
            </div>
          </div>

          {/* Percentile among app users for this exam (real; shown once enough peers exist) */}
          {result.percentile != null && (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "16px 20px", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your Percentile</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                {result.percentile}{result.percentile === 1 ? "st" : result.percentile === 2 ? "nd" : result.percentile === 3 ? "rd" : "th"} percentile
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>vs others who took this mock</div>
            </div>
          )}

          {/* Subject breakdown */}
          {result.topic_breakdown && (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject Breakdown</div>
              {Object.entries(result.topic_breakdown).map(([sub, data]) => {
                const subPct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                const subColor = subPct >= 70 ? "var(--success)" : subPct >= 50 ? "var(--warning)" : "var(--error)";
                return (
                  <div key={sub} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{sub}</span>
                      <span style={{ fontSize: 12, color: subColor }}>{data.correct}/{data.total} · {data.marks > 0 ? "+" : ""}{data.marks}m</span>
                    </div>
                    <div style={{ height: 4, background: "var(--border-hairline)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${subPct}%`, background: subColor, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setView(VIEWS.setup)} style={{ flex: 1, background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Take Another Test</button>
            <button onClick={() => router.push("/pyqs/practice")} style={{ flex: 1, background: "var(--bg-surface-2)", color: "var(--text-secondary)", border: "none", borderRadius: 8, padding: 12, fontWeight: 600, cursor: "pointer" }}>Practice Weak Areas</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === VIEWS.running && !q) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", padding: 32, textAlign: "center" }}>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-hairline)", borderRadius: 12, padding: "28px 24px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>No questions available</h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 8, marginBottom: 20, lineHeight: 1.6 }}>No questions available for this exam yet. Pick another exam and try again.</p>
            <button onClick={() => { setError(null); setView(VIEWS.setup); }} style={{ background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Back to setup</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}