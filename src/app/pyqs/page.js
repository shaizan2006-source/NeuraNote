"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const EXAMS = ["jee_main", "jee_advanced", "neet_ug"];
const SUBJECTS = { jee_main: ["Physics", "Chemistry", "Mathematics"], jee_advanced: ["Physics", "Chemistry", "Mathematics"], neet_ug: ["Physics", "Chemistry", "Biology"] };
const DIFFICULTIES = ["easy", "medium", "hard"];

// useSearchParams() requires a Suspense boundary for static generation.
export default function PYQsPage() {
  return (
    <Suspense fallback={null}>
      <PYQsPageInner />
    </Suspense>
  );
}

function PYQsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [exam, setExam] = useState(sp.get("exam") ?? "");
  const [subject, setSubject] = useState(sp.get("subject") ?? "");
  const [difficulty, setDifficulty] = useState(sp.get("difficulty") ?? "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    const params = new URLSearchParams({ page: String(page) });
    if (exam) params.set("exam", exam);
    if (subject) params.set("subject", subject);
    if (difficulty) params.set("difficulty", difficulty);
    fetch(`/api/pyqs/search?${params}`)
      .then(r => { if (!r.ok) throw new Error("bad status"); return r.json(); })
      .then(d => { setResults(d.results ?? []); setTotal(d.total ?? 0); })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [exam, subject, difficulty, page, reloadKey]);

  const chipBtn = (active, onClick, label, key) => (
    <button key={key} onClick={onClick}
      onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)"; }}
      onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
      style={{
      background: active ? "var(--accent-grad)" : "var(--bg-surface)",
      border: "none", borderRadius: 16, padding: "5px 12px",
      color: active ? "var(--bg-base)" : "var(--text-tertiary)", fontSize: 12, cursor: "pointer",
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", padding: "20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>PYQ Bank</h1>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 20 }}>{total.toLocaleString("en-IN")} questions from official JEE + NEET papers</p>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {EXAMS.map(e => chipBtn(exam === e, () => { setExam(exam === e ? "" : e); setSubject(""); setPage(1); }, e.replace("_", " ").toUpperCase(), `exam-${e}`))}
          {(SUBJECTS[exam] ?? []).map(s => chipBtn(subject === s, () => { setSubject(subject === s ? "" : s); setPage(1); }, s, `subj-${s}`))}
          {DIFFICULTIES.map(d => chipBtn(difficulty === d, () => { setDifficulty(difficulty === d ? "" : d); setPage(1); }, d.charAt(0).toUpperCase() + d.slice(1), `diff-${d}`))}
        </div>

        {loading ? (
          <div style={{ color: "var(--text-tertiary)", textAlign: "center", padding: 40 }}>Loading…</div>
        ) : fetchError ? (
          <div style={{ textAlign: "center", padding: "56px 20px", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>✦</div>
            <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>Couldn&apos;t load questions</p>
            <p style={{ margin: "6px 0 16px", fontSize: 13 }}>Something went wrong on our end.</p>
            <button onClick={() => setReloadKey(k => k + 1)}
              onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)"; }}
              onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
              style={{ background: "var(--accent-grad)", border: "none", borderRadius: 8, padding: "8px 16px", color: "var(--bg-base)", fontSize: 13, cursor: "pointer" }}>Retry</button>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 20px", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>✦</div>
            <p style={{ margin: 0, fontSize: 15, color: "var(--text-secondary)" }}>No questions match these filters</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Try a different exam, subject, or difficulty.</p>
          </div>
        ) : (
          <>
            {results.map(q => (
              <div key={q.id} onClick={() => router.push(`/pyqs/${q.slug}`)} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-hairline)",
                borderRadius: 10, padding: "14px 16px", marginBottom: 10, cursor: "pointer",
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{q.exam_type?.replace(/_/g, " ").toUpperCase()} {q.exam_year}</span>
                  {q.subject && <span style={{ fontSize: 11, color: "var(--info)" }}>{q.subject}</span>}
                  {q.chapter && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{q.chapter}</span>}
                  {q.difficulty && <span style={{ fontSize: 11, color: q.difficulty === "hard" ? "var(--error)" : q.difficulty === "medium" ? "var(--warning)" : "var(--success)" }}>{q.difficulty}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {q.question_text?.slice(0, 140)}{q.question_text?.length > 140 ? "…" : ""}
                </p>
              </div>
            ))}

            {total > 20 && (
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)"; }}
                  onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
                  style={{ background: "var(--bg-surface)", border: "none", borderRadius: 8, padding: "8px 16px", color: "var(--text-secondary)", cursor: "pointer" }}>← Prev</button>
                <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-tertiary)" }}>Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
                  onFocus={e => { e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)"; }}
                  onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
                  style={{ background: "var(--bg-surface)", border: "none", borderRadius: 8, padding: "8px 16px", color: "var(--text-secondary)", cursor: "pointer" }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
