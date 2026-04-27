"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function AddExamModal({ onClose, onSubmit }) {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!examName.trim() || !examDate.trim()) {
      alert("Please enter exam name and date");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: examName, exam_date: examDate }),
      });

      if (!res.ok) throw new Error("Failed to save exam");
      const newExam = await res.json();
      onSubmit(newExam);
    } catch (err) {
      console.error("Add exam error:", err);
      alert("Failed to save exam. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
        style={{
          background: "#111111",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 20,
          width: "90%",
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>
          Add Exam
        </p>

        <input
          type="text"
          placeholder="Exam name (e.g. JEE Main)"
          value={examName}
          onChange={(e) => setExamName(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            padding: "10px",
            fontSize: 12,
            color: "#e4e4e7",
            outline: "none",
          }}
        />

        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            padding: "10px",
            fontSize: 12,
            color: "#e4e4e7",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 6,
              color: "#a1a1aa",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px",
              background: loading ? "rgba(139,92,246,0.3)" : "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Adding..." : "Add Exam"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
