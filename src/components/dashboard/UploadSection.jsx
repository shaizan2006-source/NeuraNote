"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// ── Streak Card ────────────────────────────────────────────────────
function StreakCard({ streak }) {
  const isActive = streak > 0;
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0 }}
      whileHover={{ y: -3, boxShadow: "0 8px 32px rgba(249,115,22,0.18)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130,
        background: "linear-gradient(160deg, #0f0a00 0%, #0a0f1e 100%)",
        border: `1px solid ${hovered ? "rgba(249,115,22,0.35)" : "#2a1a08"}`,
        borderRadius: 18,
        padding: "20px 20px",
        cursor: "default",
        transition: "border-color 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow blob */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80,
        background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, var(--orange-dark), var(--orange))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
          boxShadow: "0 0 14px rgba(249,115,22,0.35)",
          flexShrink: 0,
        }}>
          🔥
        </div>
        <span style={{ color: "#78350f", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Study Streak
        </span>
      </div>

      <p style={{ margin: "0 0 2px", fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 800, color: isActive ? "#fdba74" : "var(--text-faint)", lineHeight: 1 }}>
        {streak}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e", fontWeight: 500 }}>
        {isActive ? "days in a row 🎯" : "Start your streak today"}
      </p>

      {/* Mini day dots */}
      <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i < (streak % 7 || (streak > 0 ? 7 : 0))
              ? "linear-gradient(90deg, var(--orange-dark), var(--orange))"
              : "var(--border-default)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <p style={{ margin: "5px 0 0", fontSize: 10, color: "#44250a" }}>This week</p>
    </motion.div>
  );
}

// ── Daily Progress Card ────────────────────────────────────────────
function ProgressCard({ progressScore, progressQuestions }) {
  const pct = Math.min(progressScore, 100);
  const grade = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--blue)" : "var(--text-muted)";
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      whileHover={{ y: -3, boxShadow: "0 8px 32px rgba(59,130,246,0.18)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130,
        background: "linear-gradient(160deg, #020b18 0%, #0a0f1e 100%)",
        border: `1px solid ${hovered ? "rgba(59,130,246,0.35)" : "#0d2240"}`,
        borderRadius: 18,
        padding: "20px 20px",
        cursor: "default",
        transition: "border-color 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80,
        background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #1d4ed8, var(--blue))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
          boxShadow: "0 0 14px rgba(59,130,246,0.3)",
          flexShrink: 0,
        }}>
          📈
        </div>
        <span style={{ color: "#1e3a5f", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Daily Progress
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
        <p style={{ margin: 0, fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 800, color: pct > 0 ? "#93c5fd" : "var(--text-faint)", lineHeight: 1 }}>
          {pct}
        </p>
        <span style={{ color: "#1e3a5f", fontSize: 16, fontWeight: 600 }}>/100</span>
      </div>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#1e3a5f", fontWeight: 500 }}>
        {progressQuestions} question{progressQuestions !== 1 ? "s" : ""} answered today
      </p>

      {/* Animated progress bar */}
      <div style={{ background: "#0d1829", borderRadius: 99, height: 5, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: 99,
            background: `linear-gradient(90deg, #1d4ed8, ${grade})`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Smart Progress Bar ─────────────────────────────────────────────
const UPLOAD_MESSAGES = [
  { at: 0,  text: "Reading your PDF..." },
  { at: 22, text: "Extracting content..." },
  { at: 45, text: "Analyzing topics..." },
  { at: 65, text: "Building knowledge base..." },
  { at: 80, text: "Almost there..." },
];
const PROCESSING_MESSAGES = [
  { at: 0,  text: "Processing topics..." },
  { at: 92, text: "Indexing your notes..." },
  { at: 97, text: "Finalizing..." },
];

function SmartProgressBar({ progress, stage }) {
  const msgs = stage === "processing" ? PROCESSING_MESSAGES : UPLOAD_MESSAGES;
  let statusText = msgs[0].text;
  for (const m of msgs) { if (progress >= m.at) statusText = m.text; }

  return (
    <div style={{ padding: "4px 0" }}>
      <style>{`
        @keyframes amn-gradient {
          0%   { background-position: 0%   50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0%   50%; }
        }
        @keyframes amn-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(450%);  }
        }
        @keyframes amn-pulse {
          0%,100% { opacity:.5; transform:translate(-50%,-50%) scale(.8); }
          50%      { opacity:1; transform:translate(-50%,-50%) scale(1.35); }
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <motion.p
          key={statusText}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, margin: 0 }}
        >
          {statusText}
        </motion.p>
        <span style={{
          color: "#a855f7", fontSize: 15, fontWeight: 800,
          fontVariantNumeric: "tabular-nums", minWidth: 42, textAlign: "right",
        }}>
          {progress}%
        </span>
      </div>

      {/* Track */}
      <div style={{
        height: 10, borderRadius: 99, overflow: "hidden", position: "relative",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Animated fill */}
        <div style={{
          height: "100%", borderRadius: 99, position: "relative", overflow: "hidden",
          width: `${progress}%`,
          transition: "width 0.18s linear",
          background: "linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7, #ec4899, #7c3aed)",
          backgroundSize: "300% 100%",
          animation: "amn-gradient 3s ease infinite",
        }}>
          {/* Shimmer sweep */}
          <div style={{
            position: "absolute", inset: 0, width: "38%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
            animation: "amn-shimmer 2.2s ease-in-out infinite",
          }} />
        </div>

        {/* Leading-edge glow */}
        {progress > 2 && progress < 100 && (
          <div style={{
            position: "absolute", top: "50%", left: `${progress}%`,
            width: 18, height: 18, borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(168,85,247,0.9) 0%, transparent 65%)",
            animation: "amn-pulse 1.4s ease-in-out infinite",
          }} />
        )}
      </div>

      {/* Milestone checkpoints */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 1px" }}>
        {[25, 50, 75, 100].map((ms) => (
          <div key={ms} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <motion.div
              animate={{ scale: progress >= ms ? 1.25 : 1, opacity: progress >= ms ? 1 : 0.25 }}
              transition={{ duration: 0.22 }}
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: progress >= ms
                  ? "linear-gradient(135deg, #7c3aed, #ec4899)"
                  : "rgba(255,255,255,0.18)",
              }}
            />
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: progress >= ms ? "#a855f7" : "rgba(255,255,255,0.18)",
            }}>
              {ms}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Weak Topics Card ───────────────────────────────────────────────
function WeakTopicsCard({ topics }) {
  const count   = topics.length;
  const visible = topics.slice(0, 3);
  const extra   = count - visible.length;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.16 }}
      whileHover={{ y: -3, boxShadow: "0 8px 32px rgba(239,68,68,0.14)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130,
        background: "linear-gradient(160deg, #0f0006 0%, #0a0f1e 100%)",
        border: `1px solid ${hovered ? "rgba(239,68,68,0.28)" : "#280a0a"}`,
        borderRadius: 18,
        padding: "20px 20px",
        cursor: "default",
        transition: "border-color 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80,
        background: "radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #b91c1c, var(--red))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
          boxShadow: "0 0 14px rgba(239,68,68,0.3)",
          flexShrink: 0,
        }}>
          ⚠️
        </div>
        <span style={{ color: "#450a0a", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Weak Topics
        </span>
      </div>

      <p style={{ margin: "0 0 2px", fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 800, color: count > 0 ? "#fca5a5" : "var(--text-faint)", lineHeight: 1 }}>
        {count}
      </p>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#450a0a", fontWeight: 500 }}>
        {count > 0 ? "topics need revision" : "All topics looking good!"}
      </p>

      {/* Topic chips */}
      {visible.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {visible.map((t) => (
            <span key={t.topic} style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "#fca5a5",
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 20,
              whiteSpace: "nowrap",
            }}>
              {t.topic}{t.count > 1 ? ` ×${t.count}` : ""}
            </span>
          ))}
          {extra > 0 && (
            <span style={{
              background: "var(--surface-raised)",
              color: "var(--text-muted)",
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 20,
            }}>
              +{extra} more
            </span>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>✓ No weak areas detected</span>
      )}
    </motion.div>
  );
}

export default function UploadSection() {
  const {
    file, setFile,
    examName, setExamName,
    uploadStage, setUploadStage,
    uploadProgress, uploadedFileName, uploadedFileSize,
    isDragging, setIsDragging,
    documentId, handleUpload, handleSavePDF, cancelUpload,
    streak, progressScore, progressQuestions,
    weakTopics, getActiveExam,
  } = useDashboard();

  return (
    <>
      {/* ── UPLOAD PDF ── */}
      <div id="section-upload" style={{ background: "linear-gradient(135deg, var(--surface-card) 0%, var(--surface-raised) 100%)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 20, marginBottom: 20, marginTop: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Upload PDF Notes</span>
        </div>
        <input
          placeholder="Subject name (e.g. Web Technologies)"
          value={examName}
          onChange={(e) => setExamName(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: "var(--surface-raised)", border: "1px solid var(--text-faint)", color: "var(--text-primary)", fontSize: 13, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); handleUpload(f); } }}
          onClick={() => document.getElementById("pdf-file-input").click()}
          style={{ border: `2px dashed ${isDragging ? "var(--blue-dark)" : "var(--text-faint)"}`, borderRadius: 12, padding: "clamp(16px, 4vw, 32px) 20px", textAlign: "center", cursor: "pointer", background: isDragging ? "rgba(37,99,235,0.08)" : "var(--surface-card)", transition: "all 0.2s ease", marginBottom: 14 }}
        >
          <input
            id="pdf-file-input"
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => { const s = e.target.files[0]; if (s) { setFile(s); handleUpload(s); } }}
          />
          {uploadStage === "idle" && (
            <>
              <div style={{ fontSize: 36, marginBottom: 10 }}>☁️</div>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>Drag & drop your PDF here</p>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>or <span style={{ color: "var(--blue-dark)", fontWeight: 600 }}>click to browse</span></p>
              <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 8 }}>Max file size: 20MB</p>
            </>
          )}
          {(uploadStage === "uploading" || uploadStage === "processing") && (
            <SmartProgressBar progress={uploadProgress} stage={uploadStage} />
          )}
          {uploadStage === "done" && (
            <div>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <p style={{ color: "var(--green)", fontSize: 15, fontWeight: 700, margin: 0 }}>PDF uploaded successfully!</p>
              <p style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>📄 {uploadedFileName} · {uploadedFileSize}</p>
            </div>
          )}
          {uploadStage === "error" && (
            <div>
              <div style={{ fontSize: 36, marginBottom: 10 }}>❌</div>
              <p style={{ color: "var(--red)", fontSize: 14, fontWeight: 600, margin: 0 }}>Upload failed. Please try again.</p>
            </div>
          )}
        </div>

        {(uploadStage === "uploading" || uploadStage === "processing") && (
          <button
            onClick={cancelUpload}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.08)",
              color: "#f87171", fontWeight: 600, fontSize: 13,
              cursor: "pointer", marginTop: 10,
            }}
          >
            ✕ Cancel Upload
          </button>
        )}

        {uploadStage === "done" && (
          <div style={{ display: "flex", gap: 8 }}>
            {documentId && file && (
              <button onClick={handleSavePDF} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, var(--green), var(--green-dark))", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                💾 Save PDF to Library
              </button>
            )}
            <button
              onClick={() => {
                setFile(null);
                setUploadStage("idle");
                const input = document.getElementById("pdf-file-input");
                if (input) input.value = "";
              }}
              style={{
                flex: documentId && file ? "0 0 auto" : 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid var(--text-faint)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Add New PDF
            </button>
          </div>
        )}
        {uploadStage === "error" && (
          <button onClick={() => setUploadStage("idle")} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid var(--text-faint)", background: "transparent", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 8 }}>
            Try Again
          </button>
        )}
      </div>

      {/* ── STATS ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StreakCard streak={streak} />
        <ProgressCard progressScore={progressScore} progressQuestions={progressQuestions} />
        <WeakTopicsCard
          topics={weakTopics.filter((t) => {
            const activeSubject = getActiveExam()?.name?.toLowerCase().trim() || "";
            if (!activeSubject) return true;
            return t.subject?.toLowerCase().trim() === activeSubject || t.subject?.toLowerCase().trim() === "general";
          })}
        />
      </div>
    </>
  );
}
