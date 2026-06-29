"use client";
import { useEffect, useState, useCallback } from "react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "shaizan2006@gmail.com";

const EXAMS = ["jee_main", "jee_advanced", "neet_ug"];
const SUBJECTS_MAP = {
  jee_main: ["Physics", "Chemistry", "Mathematics"],
  jee_advanced: ["Physics", "Chemistry", "Mathematics"],
  neet_ug: ["Physics", "Chemistry", "Biology"],
};
const DIFFICULTIES = ["easy", "medium", "hard"];

export default function AdminPYQsPage() {
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ exam: "", subject: "", difficulty: "", q: "" });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ingestText, setIngestText] = useState("");
  const [ingestExam, setIngestExam] = useState("jee_main");
  const [ingestYear, setIngestYear] = useState(2024);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("sb_access_token") ?? sessionStorage.getItem("sb_access_token") ?? "";
      setToken(t);
    }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filter.exam) params.set("exam", filter.exam);
    if (filter.subject) params.set("subject", filter.subject);
    if (filter.difficulty) params.set("difficulty", filter.difficulty);
    fetch(`/api/pyqs/search?${params}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.results ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(q) {
    setSaving(true);
    await fetch(`/api/admin/pyqs/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ chapter: q.chapter, difficulty: q.difficulty, solution_text: q.solution_text, concepts: q.concepts }),
    });
    setSaving(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/admin/pyqs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function handleIngest() {
    if (!ingestText.trim()) return;
    setIngestLoading(true);
    setIngestMsg("");
    const res = await fetch("/api/admin/pyqs/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pyqs: [{ question_text: ingestText, exam_type: ingestExam, exam_year: ingestYear }] }),
    });
    const d = await res.json();
    setIngestMsg(d.inserted ? `Ingested ${d.inserted} question(s)` : d.error ?? "Unknown error");
    setIngestLoading(false);
    if (d.inserted) { setIngestText(""); load(); }
  }

  const inp = (style) => ({ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 10px", color: "#F9FAFB", fontSize: 13, ...style });
  const btn = (bg = "#8B5CF6") => ({ background: bg, border: "none", borderRadius: 6, padding: "6px 12px", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 });

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#F9FAFB", padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>PYQ Admin</h1>
        <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 24 }}>{total.toLocaleString("en-IN")} questions in database</p>

        {/* Quick ingest */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Quick Ingest</div>
          <textarea
            value={ingestText}
            onChange={e => setIngestText(e.target.value)}
            placeholder="Paste question text here…"
            rows={3}
            style={{ ...inp({ width: "100%", resize: "vertical", marginBottom: 10, boxSizing: "border-box" }) }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={ingestExam} onChange={e => setIngestExam(e.target.value)} style={inp({})}>
              {EXAMS.map(e => <option key={e} value={e}>{e.replace(/_/g, " ").toUpperCase()}</option>)}
            </select>
            <input type="number" value={ingestYear} onChange={e => setIngestYear(Number(e.target.value))} style={inp({ width: 80 })} min={2000} max={2030} />
            <button onClick={handleIngest} disabled={ingestLoading} style={btn()}>
              {ingestLoading ? "Ingesting…" : "Ingest + Auto-classify"}
            </button>
            {ingestMsg && <span style={{ fontSize: 12, color: ingestMsg.includes("error") || ingestMsg.includes("Unknown") ? "#EF4444" : "#10B981" }}>{ingestMsg}</span>}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <select value={filter.exam} onChange={e => setFilter(f => ({ ...f, exam: e.target.value, subject: "" }))} style={inp({})}>
            <option value="">All Exams</option>
            {EXAMS.map(e => <option key={e} value={e}>{e.replace(/_/g, " ").toUpperCase()}</option>)}
          </select>
          <select value={filter.subject} onChange={e => setFilter(f => ({ ...f, subject: e.target.value }))} style={inp({})}>
            <option value="">All Subjects</option>
            {(SUBJECTS_MAP[filter.exam] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))} style={inp({})}>
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Question list */}
        {loading ? (
          <div style={{ color: "#6B7280", padding: 40, textAlign: "center" }}>Loading…</div>
        ) : (
          questions.map(q => (
            <div key={q.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
              {editing?.id === q.id ? (
                <EditForm q={editing} onChange={setEditing} onSave={handleSave} onCancel={() => setEditing(null)} saving={saving} />
              ) : (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>{q.exam_type?.replace(/_/g, " ").toUpperCase()} {q.exam_year}</span>
                    {q.subject && <span style={{ fontSize: 11, color: "#8B5CF6" }}>{q.subject}</span>}
                    {q.chapter && <span style={{ fontSize: 11, color: "#6B7280" }}>{q.chapter}</span>}
                    {q.difficulty && <span style={{ fontSize: 11, color: q.difficulty === "hard" ? "#EF4444" : q.difficulty === "medium" ? "#F59E0B" : "#10B981" }}>{q.difficulty}</span>}
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, color: "#E5E7EB" }}>{q.question_text?.slice(0, 200)}{q.question_text?.length > 200 ? "…" : ""}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditing({ ...q })} style={btn("#374151")}>Edit</button>
                    <button onClick={() => handleDelete(q.id)} style={btn("#7F1D1D")}>Delete</button>
                    <a href={`/pyqs/${q.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...btn("#1E3A5F"), textDecoration: "none", display: "inline-block" }}>View</a>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {total > 20 && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={btn("#374151")}>← Prev</button>
            <span style={{ alignSelf: "center", fontSize: 13, color: "#6B7280" }}>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} style={btn("#374151")}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({ q, onChange, onSave, onCancel, saving }) {
  const inp = (extra) => ({ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 10px", color: "#F9FAFB", fontSize: 13, ...extra });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, color: "#6B7280" }}>Editing: <em>{q.question_text?.slice(0, 80)}</em></div>
      <input value={q.chapter ?? ""} onChange={e => onChange(p => ({ ...p, chapter: e.target.value }))} placeholder="Chapter" style={inp({ width: "100%" })} />
      <select value={q.difficulty ?? "medium"} onChange={e => onChange(p => ({ ...p, difficulty: e.target.value }))} style={inp({})}>
        {["easy", "medium", "hard"].map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <textarea value={q.solution_text ?? ""} onChange={e => onChange(p => ({ ...p, solution_text: e.target.value }))} placeholder="Solution (step-by-step)" rows={4} style={inp({ width: "100%", resize: "vertical", boxSizing: "border-box" })} />
      <input
        value={(q.concepts ?? []).join(", ")}
        onChange={e => onChange(p => ({ ...p, concepts: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
        placeholder="Concepts (comma-separated)"
        style={inp({ width: "100%" })}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSave(q)} disabled={saving} style={{ background: "#8B5CF6", border: "none", borderRadius: 6, padding: "7px 14px", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, padding: "7px 14px", color: "#9CA3AF", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}