"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EXAM_OPTIONS = [
  { value: "JEE", label: "JEE (Joint Entrance Exam)", icon: "⚙️" },
  { value: "NEET", label: "NEET (Medical Entrance)", icon: "🩺" },
  { value: "GATE", label: "GATE (Graduation Exam)", icon: "🎓" },
  { value: "UPSC", label: "UPSC (Civil Services)", icon: "🏛️" },
  { value: "CA", label: "CA (Chartered Accountancy)", icon: "📊" },
  { value: "College", label: "College / University Exams", icon: "📚" },
  { value: "Other", label: "Other Competitive Exam", icon: "🎯" },
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [examType, setExamType] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examName, setExamName] = useState("");
  const [uploadedDocId, setUploadedDocId] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [demoQuestion, setDemoQuestion] = useState("");
  const [demoAnswer, setDemoAnswer] = useState("");
  const [demoAsking, setDemoAsking] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return null; }
    return {
      "Authorization": `Bearer ${session.access_token}`,
    };
  };

  // ── Step 1: Exam type ─────────────────────────────────────────
  const handleExamSelect = (value) => {
    setExamType(value);
    // Pre-fill exam name label
    const opt = EXAM_OPTIONS.find((o) => o.value === value);
    setExamName(opt ? opt.label.split(" (")[0] : value);
  };

  // ── Step 2: Save exam ─────────────────────────────────────────
  const handleSaveExam = async () => {
    if (!examDate) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ name: examName || examType, exam_date: examDate }),
      });
      // Save onboarding meta to Supabase user
      await supabase.auth.updateUser({
        data: { onboarding_exam_type: examType, onboarding_exam_date: examDate },
      });
    } catch (_) {
      // Non-blocking — proceed anyway
    } finally {
      setSaving(false);
      setStep(3);
    }
  };

  // ── Step 3: Upload PDF ───────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file.");
      return;
    }
    setUploadError("");
    setUploading(true);
    setUploadedFileName(file.name);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/process-pdf", {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedDocId(data.documentId || data.id || null);
      // Pre-fill demo question
      if (data.suggestedQuestion) setDemoQuestion(data.suggestedQuestion);
    } catch (err) {
      setUploadError("Upload failed. Please try again.");
      setUploadedFileName("");
    } finally {
      setUploading(false);
    }
  };

  const skipUpload = () => {
    setStep(4);
  };

  const proceedAfterUpload = () => {
    setStep(4);
  };

  // ── Step 4: Demo Q&A ─────────────────────────────────────────
  const handleDemoAsk = async () => {
    if (!demoQuestion.trim()) return;
    setDemoAsking(true);
    setDemoAnswer("");
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          question: demoQuestion,
          documentId: uploadedDocId,
          mode: "detailed",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("__META__")) continue;
          text += line;
        }
        setDemoAnswer(text);
      }
    } catch (_) {
      setDemoAnswer("Could not get an answer right now, but your notes are ready!");
    } finally {
      setDemoAsking(false);
    }
  };

  // ── Finish: mark onboarding done ─────────────────────────────
  const handleFinish = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } });
    } catch (_) {
      // Non-blocking
    } finally {
      setSaving(false);
      router.push("/ask-ai");
    }
  };

  // ── Progress dots ────────────────────────────────────────────
  const StepDots = () => (
    <div className="onboarding-steps">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`onboarding-step-dot ${i + 1 < step ? "completed" : i + 1 === step ? "active" : ""}`}
        />
      ))}
    </div>
  );

  // ── Back button ──────────────────────────────────────────────
  const BackBtn = () =>
    step > 1 ? (
      <button
        onClick={() => setStep((s) => s - 1)}
        style={{ background: "transparent", border: "none", color: "#6b7280", fontSize: 14, cursor: "pointer", padding: "8px 0", marginBottom: 8 }}
      >
        ← Back
      </button>
    ) : null;

  // ────────────────────────────────────────────────────────────
  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        <StepDots />

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >

        {/* ── STEP 1: Choose exam ── */}
        {step === 1 && (
          <>
            <h2 style={{ color: "white", marginTop: 0, marginBottom: 8, fontSize: 22 }}>
              What exam are you preparing for?
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              We&apos;ll personalise your study plan and AI coach for your exam.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {EXAM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleExamSelect(opt.value)}
                  style={{
                    background: examType === opt.value ? "#1e3a5f" : "#1f2937",
                    border: examType === opt.value ? "2px solid #3b82f6" : "2px solid transparent",
                    borderRadius: 10,
                    padding: "14px 12px",
                    color: examType === opt.value ? "#60a5fa" : "#d1d5db",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: examType === opt.value ? 600 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20, display: "block", marginBottom: 4 }}>{opt.icon}</span>
                  {opt.label.split(" (")[0]}
                </button>
              ))}
            </div>
            <button
              onClick={() => examType && setStep(2)}
              disabled={!examType}
              style={{
                marginTop: 24,
                width: "100%",
                background: examType ? "#2563eb" : "#374151",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                cursor: examType ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              Continue →
            </button>
          </>
        )}

        {/* ── STEP 2: Exam date ── */}
        {step === 2 && (
          <>
            <BackBtn />
            <h2 style={{ color: "white", marginTop: 0, marginBottom: 8, fontSize: 22 }}>
              When is your {examType} exam?
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              We&apos;ll create a countdown and adjust your study intensity accordingly.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>
                Exam name (optional)
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder={`e.g. JEE Advanced 2025`}
                className="input-field"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>
                Exam date *
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={getMinDate()}
                className="input-field"
                style={{ colorScheme: "dark" }}
              />
            </div>
            {examDate && (
              <div style={{ background: "#0f2744", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
                <p style={{ margin: 0, color: "#60a5fa", fontSize: 14 }}>
                  📅 {Math.ceil((new Date(examDate) - new Date()) / 86400000)} days to go
                </p>
              </div>
            )}
            <button
              onClick={handleSaveExam}
              disabled={!examDate || saving}
              style={{
                width: "100%",
                background: examDate && !saving ? "#2563eb" : "#374151",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                cursor: examDate && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Saving…" : "Continue →"}
            </button>
          </>
        )}

        {/* ── STEP 3: Upload first PDF ── */}
        {step === 3 && (
          <>
            <BackBtn />
            <h2 style={{ color: "white", marginTop: 0, marginBottom: 8, fontSize: 22 }}>
              Upload your first notes
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              Upload a PDF of your notes or textbook — your AI study assistant will read it and answer your questions.
            </p>

            {!uploadedFileName ? (
              <div
                className="upload-zone"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginBottom: 20 }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                {uploading ? (
                  <>
                    <p style={{ color: "#9ca3af", margin: 0, fontSize: 28 }}>⏳</p>
                    <p style={{ color: "#6b7280", margin: "8px 0 0", fontSize: 14 }}>Processing your PDF…</p>
                  </>
                ) : (
                  <>
                    <p style={{ color: "#6b7280", margin: 0, fontSize: 36 }}>📄</p>
                    <p style={{ color: "#d1d5db", margin: "8px 0 4px", fontWeight: 600 }}>Click to upload PDF</p>
                    <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>Supports any textbook or notes PDF</p>
                  </>
                )}
              </div>
            ) : (
              <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <p style={{ margin: 0, color: "#86efac", fontWeight: 600, fontSize: 14 }}>{uploadedFileName}</p>
                  <p style={{ margin: 0, color: "#4ade80", fontSize: 12 }}>PDF processed successfully</p>
                </div>
              </div>
            )}

            {uploadError && (
              <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{uploadError}</p>
            )}

            <button
              onClick={uploadedFileName ? proceedAfterUpload : skipUpload}
              disabled={uploading}
              style={{
                width: "100%",
                background: uploading ? "#374151" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                cursor: uploading ? "not-allowed" : "pointer",
                marginBottom: 10,
              }}
            >
              {uploading ? "Processing…" : uploadedFileName ? "Continue →" : "Skip for now →"}
            </button>

            {!uploadedFileName && !uploading && (
              <p style={{ textAlign: "center", color: "#4b5563", fontSize: 12 }}>
                You can always upload PDFs from your dashboard later
              </p>
            )}
          </>
        )}

        {/* ── STEP 4: Demo Q&A ── */}
        {step === 4 && (
          <>
            <h2 style={{ color: "white", marginTop: 0, marginBottom: 8, fontSize: 22 }}>
              {uploadedDocId ? "Ask your first question!" : "You're almost ready!"}
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              {uploadedDocId
                ? "Your notes are loaded. Try asking something — see how your AI tutor answers."
                : "Your study plan is set up. Head to your dashboard to upload notes and start learning."}
            </p>

            {uploadedDocId && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    value={demoQuestion}
                    onChange={(e) => setDemoQuestion(e.target.value)}
                    placeholder="Ask anything about your notes…"
                    className="input-field"
                    onKeyDown={(e) => e.key === "Enter" && handleDemoAsk()}
                    style={{ marginBottom: 8 }}
                  />
                  <button
                    onClick={handleDemoAsk}
                    disabled={!demoQuestion.trim() || demoAsking}
                    style={{
                      width: "100%",
                      background: demoQuestion.trim() && !demoAsking ? "#7c3aed" : "#374151",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: demoQuestion.trim() && !demoAsking ? "pointer" : "not-allowed",
                    }}
                  >
                    {demoAsking ? "Thinking…" : "Ask AI ✨"}
                  </button>
                </div>

                {demoAnswer && (
                  <div style={{ background: "#0f0f2e", border: "1px solid #312e81", borderRadius: 10, padding: 14, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
                    <p style={{ color: "#c4b5fd", margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                      {demoAnswer}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Summary card */}
            <div style={{ background: "#0c1a0c", border: "1px solid #166534", borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ margin: 0, color: "#86efac", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>🎯 Your study setup</p>
              <p style={{ margin: "4px 0", color: "#4ade80", fontSize: 13 }}>✓ Exam: {examName || examType}</p>
              {examDate && <p style={{ margin: "4px 0", color: "#4ade80", fontSize: 13 }}>✓ Date: {new Date(examDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
              {uploadedFileName && <p style={{ margin: "4px 0", color: "#4ade80", fontSize: 13 }}>✓ Notes: {uploadedFileName}</p>}
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              style={{
                width: "100%",
                background: saving ? "#374151" : "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Setting up…" : "Go to Dashboard 🚀"}
            </button>
          </>
        )}

        </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}
