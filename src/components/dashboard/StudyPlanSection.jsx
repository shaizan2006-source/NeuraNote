"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import { createClient } from "@supabase/supabase-js";

const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PLAN_TABS = [
  { id: "today",  label: "📅 Today"   },
  { id: "topics", label: "🔥 Topics"  },
  { id: "ai",     label: "🤖 AI Plan" },
];

// ── Animated checkable task row ────────────────────────────────────
function TaskRow({ index, label, timeSlot, accent, checked, onCheck }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 12px", borderRadius: 10,
        background: "var(--surface-raised)",
        borderLeft: `3px solid ${accent}`,
        opacity: checked ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onCheck}
        style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: 5,
          border: `2px solid ${checked ? accent : "var(--border-strong)"}`,
          background: checked ? accent : "transparent",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#fff", marginTop: 1,
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
          >
            ✓
          </motion.span>
        )}
      </motion.button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {timeSlot && (
          <span style={{
            display: "inline-block",
            background: "rgba(37,99,235,0.15)",
            color: "var(--blue)",
            border: "1px solid rgba(37,99,235,0.25)",
            borderRadius: 5, padding: "1px 8px",
            fontSize: 10, fontWeight: 600, marginBottom: 4,
          }}>
            🕐 {timeSlot}
          </span>
        )}
        <p style={{
          margin: 0, color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5,
          wordBreak: "break-word",
          textDecoration: checked ? "line-through" : "none",
        }}>
          {label}
        </p>
      </div>
    </motion.div>
  );
}

// ── Generic numbered list row ──────────────────────────────────────
function ListRow({ index, text, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "10px 12px", borderRadius: 10,
        background: "var(--surface-raised)",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <span style={{
        flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
        background: accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "#fff", marginTop: 1,
      }}>
        {index + 1}
      </span>
      <span style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
        {text}
      </span>
    </motion.div>
  );
}

function EmptyState({ icon, text, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ textAlign: "center", padding: "32px 16px" }}
    >
      <p style={{ fontSize: 30, margin: 0 }}>{icon}</p>
      <p style={{ color: "var(--text-muted)", margin: "8px 0 4px", fontWeight: 600, fontSize: 14 }}>{text}</p>
      <p style={{ color: "var(--text-faint)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>{sub}</p>
    </motion.div>
  );
}

// ── AI Plan tab (self-contained) ───────────────────────────────────
function AIPlanTab() {
  const LEVEL_OPTIONS  = ["Beginner", "Intermediate", "Advanced"];
  const PREF_OPTIONS   = ["Concept Learning", "Revision-Heavy", "Mixed"];
  const PRIORITY_COLOR = { high: "var(--red)", medium: "var(--amber)", low: "var(--green)" };
  const TYPE_BADGE     = {
    learn:    { label: "Learn",    bg: "rgba(37,99,235,0.12)",   color: "var(--blue)"        },
    revise:   { label: "Revise",   bg: "rgba(124,58,237,0.12)",  color: "var(--brand-light)" },
    practice: { label: "Practice", bg: "rgba(5,150,105,0.12)",   color: "var(--green)"       },
  };

  const EMPTY_FORM = { subject: "", hoursPerDay: "", target: "", deadline: "", level: "", preference: "" };
  const [form, setForm]         = useState(EMPTY_FORM);
  const [aiPlan, setAiPlan]     = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError]   = useState("");

  const field = (k) => ({
    value: form[k],
    onChange: (e) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
      // reset plan when subject changes
      if (k === "subject") setAiPlan(null);
    },
  });

  const isValid = form.subject.trim() && form.hoursPerDay && form.target.trim() && form.level && form.preference;

  async function generate(optimize = false) {
    setGenerating(true);
    setAiError("");
    try {
      const { data: { session } } = await _supabase.auth.getSession();
      const res = await fetch("/api/study-plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ ...form, hoursPerDay: Number(form.hoursPerDay), optimize }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || "Failed to generate plan"); return; }
      setAiPlan(data);
    } catch {
      setAiError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "var(--surface-raised)", border: "1px solid var(--border-default)",
    borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "var(--text-primary)",
    outline: "none",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" };

  // ── Plan result view ──
  if (aiPlan) {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {/* Summary */}
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "var(--brand-light)", marginBottom: 4 }}>🤖 AI Plan — {form.subject}</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{aiPlan.summary}</p>
        </div>

        {/* Day-wise sessions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {aiPlan.days?.map((day) => (
            <div key={day.day}>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{day.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {day.sessions?.map((s, si) => {
                  const badge = TYPE_BADGE[s.type] || TYPE_BADGE.learn;
                  return (
                    <motion.div
                      key={si}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18, delay: si * 0.04 }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "9px 12px", borderRadius: 9,
                        background: "var(--surface-raised)",
                        borderLeft: `3px solid ${PRIORITY_COLOR[s.priority] || "var(--border-strong)"}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 4, padding: "1px 6px" }}>
                            🕐 {s.time}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: "1px 6px", background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>{s.topic}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => generate(true)}
            disabled={generating}
            className="btn-ghost"
            style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600 }}
          >
            {generating ? "Regenerating…" : "✨ Optimize Plan"}
          </button>
          <button
            onClick={() => { setAiPlan(null); setForm(EMPTY_FORM); }}
            className="btn-ghost"
            style={{ flex: 1, padding: "9px 0", fontSize: 12 }}
          >
            ← New Plan
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Input form view ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
        Tell me about your study goal — I'll build a personalized plan.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Subject */}
        <div>
          <label style={labelStyle}>Subject *</label>
          <input {...field("subject")} placeholder="e.g. DBMS, Organic Chemistry, Anatomy…" style={inputStyle} />
        </div>

        {/* Hours + Target */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Hours / Day *</label>
            <input {...field("hoursPerDay")} type="number" min="1" max="12" placeholder="e.g. 3" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Target *</label>
            <input {...field("target")} placeholder="e.g. 12 chapters, all concepts" style={inputStyle} />
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label style={labelStyle}>Exam / Deadline (optional)</label>
          <input {...field("deadline")} type="date" style={inputStyle} min={new Date().toISOString().split("T")[0]} />
        </div>

        {/* Level */}
        <div>
          <label style={labelStyle}>Current Level *</label>
          <div style={{ display: "flex", gap: 6 }}>
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setForm((p) => ({ ...p, level: opt }))}
                style={{
                  flex: 1, padding: "7px 4px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${form.level === opt ? "var(--brand)" : "var(--border-default)"}`,
                  background: form.level === opt ? "rgba(124,58,237,0.12)" : "var(--surface-raised)",
                  color: form.level === opt ? "var(--brand-light)" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Preference */}
        <div>
          <label style={labelStyle}>Study Preference *</label>
          <div style={{ display: "flex", gap: 6 }}>
            {PREF_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setForm((p) => ({ ...p, preference: opt }))}
                style={{
                  flex: 1, padding: "7px 4px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${form.preference === opt ? "var(--blue)" : "var(--border-default)"}`,
                  background: form.preference === opt ? "rgba(37,99,235,0.1)" : "var(--surface-raised)",
                  color: form.preference === opt ? "var(--blue)" : "var(--text-muted)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {aiError && (
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--red)" }}>{aiError}</p>
      )}

      <button
        onClick={() => generate(false)}
        disabled={!isValid || generating}
        style={{
          marginTop: 14, width: "100%", padding: "10px 0",
          borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700,
          background: isValid && !generating ? "var(--brand)" : "var(--surface-raised)",
          color: isValid && !generating ? "#fff" : "var(--text-faint)",
          cursor: isValid && !generating ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {generating ? "Generating Plan…" : "Generate My Plan →"}
      </button>
    </motion.div>
  );
}

export default function StudyPlanSection() {
  const [planTab, setPlanTab]     = useState("today");
  const [showAll, setShowAll]     = useState(false);
  const [checked, setChecked]     = useState({});

  const { smartPlan, dailyPlan, adaptivePlan, plan, selectedExam } = useDashboard();

  const isEmpty = dailyPlan.length === 0 && smartPlan.length === 0 && adaptivePlan.length === 0 && plan.length === 0;

  const doneCount   = Object.values(checked).filter(Boolean).length;
  const totalToday  = dailyPlan.length;
  const progressPct = totalToday ? (doneCount / totalToday) * 100 : 0;

  const toggleCheck = (i) => setChecked((p) => ({ ...p, [i]: !p[i] }));

  const countLabel = planTab === "today"
    ? `${totalToday} tasks`
    : planTab === "topics"
      ? `${smartPlan.length} topics`
      : `${adaptivePlan.length || plan.length} items`;

  return (
    <div id="section-plan" className="section-card">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📖</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Study Plan</span>
          {!isEmpty && (
            <span className="badge badge-blue">{countLabel}</span>
          )}
        </div>
        {selectedExam && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            📅 {selectedExam.name}
          </span>
        )}
      </div>

      {/* ── Today progress bar ──────────────────────────────────── */}
      {planTab === "today" && totalToday > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Today's progress</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
              {doneCount}/{totalToday}
              {doneCount === totalToday && totalToday > 0 && " ✓ Done!"}
            </span>
          </div>
          <div style={{ height: 5, background: "var(--border-default)", borderRadius: 99, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                height: "100%", borderRadius: 99,
                background: doneCount === totalToday
                  ? "var(--green)"
                  : "linear-gradient(90deg, var(--brand), var(--blue))",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 8 }}>
        {PLAN_TABS.map((tab) => {
          const active = planTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setPlanTab(tab.id); setShowAll(false); }}
              style={{
                position: "relative",
                background: "transparent",
                border: "none",
                borderRadius: 8, padding: "6px 12px",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: "pointer", transition: "color 0.15s", whiteSpace: "nowrap",
              }}
            >
              {active && (
                <motion.div
                  layoutId="plan-tab-pill"
                  style={{
                    position: "absolute", inset: 0,
                    background: "var(--surface-raised)",
                    borderRadius: 8,
                    border: "1px solid var(--border-strong)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={planTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >

          {/* TODAY */}
          {planTab === "today" && (
            dailyPlan.length === 0
              ? <EmptyState icon="📅" text="No schedule yet" sub="Set an exam date and upload a PDF to generate your daily schedule." />
              : <>
                  {/* Today's Focus card — first unchecked task */}
                  {(() => {
                    const nextIdx = dailyPlan.findIndex((_, i) => !checked[i]);
                    if (nextIdx === -1) return null;
                    const task     = dailyPlan[nextIdx];
                    const arrowIdx = task.indexOf("→");
                    const timeSlot = arrowIdx !== -1 ? task.slice(0, arrowIdx).trim() : null;
                    const label    = arrowIdx !== -1 ? task.slice(arrowIdx + 1).trim() : task;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          marginBottom: 12, padding: "14px 16px", borderRadius: 12,
                          background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(79,70,229,0.07) 100%)",
                          border: "1px solid rgba(124,58,237,0.25)",
                          borderLeft: "3px solid var(--brand)",
                        }}
                      >
                        <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--brand-light)" }}>
                          ⚡ Today's Focus
                        </p>
                        {timeSlot && (
                          <span style={{
                            display: "inline-block", marginBottom: 6,
                            background: "rgba(37,99,235,0.15)", color: "var(--blue)",
                            border: "1px solid rgba(37,99,235,0.25)",
                            borderRadius: 5, padding: "1px 8px",
                            fontSize: 10, fontWeight: 600,
                          }}>
                            🕐 {timeSlot}
                          </span>
                        )}
                        <p style={{ margin: 0, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
                          {label}
                        </p>
                      </motion.div>
                    );
                  })()}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(showAll ? dailyPlan : dailyPlan.slice(0, 5)).map((task, i) => {
                      const arrowIdx = task.indexOf("→");
                      const timeSlot = arrowIdx !== -1 ? task.slice(0, arrowIdx).trim() : null;
                      const label    = arrowIdx !== -1 ? task.slice(arrowIdx + 1).trim() : task;
                      const isHard   = task.includes("🔥");
                      const isMed    = task.includes("⚡");
                      const accent   = isHard ? "var(--red)" : isMed ? "var(--amber)" : "var(--green)";
                      return (
                        <TaskRow
                          key={task}
                          index={i}
                          label={label}
                          timeSlot={timeSlot}
                          accent={accent}
                          checked={!!checked[i]}
                          onCheck={() => toggleCheck(i)}
                        />
                      );
                    })}
                  </div>
                  {dailyPlan.length > 5 && (
                    <button
                      onClick={() => setShowAll((p) => !p)}
                      className="btn-ghost"
                      style={{ marginTop: 10, width: "100%", padding: "8px 0" }}
                    >
                      {showAll ? "▲ See less" : `▼ ${dailyPlan.length - 5} more tasks`}
                    </button>
                  )}
                </>
          )}

          {/* TOPICS */}
          {planTab === "topics" && (
            smartPlan.length === 0
              ? <EmptyState icon="🔥" text="No topics yet" sub="Upload a PDF to get your prioritised topic list." />
              : <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(showAll ? smartPlan : smartPlan.slice(0, 5)).map((item, i) => (
                      <ListRow key={item} index={i} text={item} accent="var(--blue)" />
                    ))}
                  </div>
                  {smartPlan.length > 5 && (
                    <button
                      onClick={() => setShowAll((p) => !p)}
                      className="btn-ghost"
                      style={{ marginTop: 10, width: "100%", padding: "8px 0" }}
                    >
                      {showAll ? "▲ See less" : `▼ ${smartPlan.length - 5} more topics`}
                    </button>
                  )}
                </>
          )}

          {/* AI PLAN */}
          {planTab === "ai" && (
            <AIPlanTab />
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
