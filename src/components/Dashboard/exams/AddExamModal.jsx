"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUBJECT_OPTIONS } from "@/lib/subjectOptions";
import { motion } from "framer-motion";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const MAX_NAME_LENGTH = 100;

export default function AddExamModal({ onClose, onSubmit }) {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef(null);

  // Focus name input on mount
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Dismiss on ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const today = new Date().toISOString().split("T")[0];
  const isPastDate = examDate && examDate < today;

  function validate() {
    if (!examName.trim()) return "Exam name is required.";
    if (examName.trim().length > MAX_NAME_LENGTH) return `Name must be under ${MAX_NAME_LENGTH} characters.`;
    if (!subject) return "Subject is required.";
    if (!examDate) return "Exam date is required.";
    if (isPastDate) return "Exam date cannot be in the past.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ name: examName.trim(), exam_date: examDate, subject }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error (${res.status})`);
      }
      const newExam = await res.json();
      onSubmit(newExam);
    } catch (err) {
      console.error("Add exam error:", err);
      setError(err.message || "Failed to save exam. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !loading) handleSubmit();
  }

  const charCount = examName.length;
  const nearLimit = charCount > MAX_NAME_LENGTH * 0.8;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-hairline)",
          borderRadius: 12,
          padding: 20,
          width: "90%",
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          Add Exam
        </p>

        {/* Exam name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            ref={nameRef}
            type="text"
            placeholder="Exam name (e.g. JEE Main)"
            value={examName}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => { setExamName(e.target.value); setError(""); }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error && !examName.trim() ? "color-mix(in srgb, var(--error) 50%, transparent)" : "var(--border-hairline)"}`,
              borderRadius: 6,
              padding: "10px",
              fontSize: 12,
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          {nearLimit && (
            <p style={{ margin: 0, fontSize: 9, color: charCount >= MAX_NAME_LENGTH ? "var(--error)" : "var(--text-tertiary)" }}>
              {charCount}/{MAX_NAME_LENGTH} characters
            </p>
          )}
        </div>

        {/* Subject */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <select
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setError(""); }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error && !subject ? "color-mix(in srgb, var(--error) 50%, transparent)" : "var(--border-hairline)"}`,
              borderRadius: 6,
              padding: "10px",
              fontSize: 12,
              color: subject ? "var(--text-primary)" : "var(--text-tertiary)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="">Select Subject...</option>
            {SUBJECT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Exam date */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            type="date"
            value={examDate}
            min={today}
            onChange={(e) => { setExamDate(e.target.value); setError(""); }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${isPastDate || (error && !examDate) ? "color-mix(in srgb, var(--error) 50%, transparent)" : "var(--border-hairline)"}`,
              borderRadius: 6,
              padding: "10px",
              fontSize: 12,
              color: examDate ? "var(--text-primary)" : "var(--text-tertiary)",
              outline: "none",
            }}
          />
          {isPastDate && (
            <p style={{ margin: 0, fontSize: 9, color: "var(--error)" }}>
              Date is in the past — the exam will be marked completed immediately.
            </p>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <div style={{
            padding: "8px 10px",
            background: "color-mix(in srgb, var(--error) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
            borderRadius: 6,
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--error)" }}>{error}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-hairline)",
              borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, padding: "10px",
              background: loading ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "var(--accent-grad)",
              border: "none", borderRadius: 6, color: "var(--bg-base)",
              fontSize: 12, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Adding..." : "Add Exam"}
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 9, color: "var(--text-disabled)", textAlign: "center" }}>
          Press Enter to submit · Esc to close
        </p>
      </motion.div>
    </motion.div>
  );
}
