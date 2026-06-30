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
      whileHover={{ y: -3, boxShadow: "0 8px 32px var(--accent-glow-soft)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130,
        background: "var(--bg-surface)",
        border: `1px solid ${hovered ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "var(--border-hairline)"}`,
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
        background: "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Study Streak
        </span>
      </div>

      <p style={{ margin: "0 0 2px", fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 800, color: isActive ? "var(--accent-bright)" : "var(--text-faint)", lineHeight: 1 }}>
        {streak}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
        {isActive ? "days in a row" : "Start your streak today"}
      </p>

      {/* Mini day dots */}
      <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i < (streak % 7 || (streak > 0 ? 7 : 0))
              ? "var(--accent-grad)"
              : "var(--border-default)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <p style={{ margin: "5px 0 0", fontSize: 10, color: "var(--text-tertiary)" }}>This week</p>
    </motion.div>
  );
}

// ── Daily Progress Card ────────────────────────────────────────────
function ProgressCard({ progressScore, progressQuestions }) {
  const pct = Math.min(progressScore, 100);
  const grade = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--accent)" : "var(--text-muted)";
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      whileHover={{ y: -3, boxShadow: "0 8px 32px var(--accent-glow-soft)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130,
        background: "var(--bg-surface)",
        border: `1px solid ${hovered ? "color-mix(in srgb, var(--accent) 35%, transparent)" : "var(--border-hairline)"}`,
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
        background: "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Daily Progress
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
        <p style={{ margin: 0, fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 800, color: pct > 0 ? "var(--accent-bright)" : "var(--text-faint)", lineHeight: 1 }}>
          {pct}
        </p>
        <span style={{ color: "var(--text-tertiary)", fontSize: 16, fontWeight: 600 }}>/100</span>
      </div>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
        {progressQuestions} question{progressQuestions !== 1 ? "s" : ""} answered today
      </p>

      {/* Animated progress bar */}
      <div style={{ background: "var(--bg-inset)", borderRadius: 99, height: 5, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: 99,
            background: `linear-gradient(90deg, var(--accent-dim), ${grade})`,
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
          color: "var(--accent)", fontSize: 15, fontWeight: 800,
          fontVariantNumeric: "tabular-nums", minWidth: 42, textAlign: "right",
        }}>
          {progress}%
        </span>
      </div>

      {/* Track */}
      <div style={{
        height: 10, borderRadius: 99, overflow: "hidden", position: "relative",
        background: "var(--bg-inset)",
        border: "1px solid var(--border-hairline)",
      }}>
        {/* Animated fill */}
        <div style={{
          height: "100%", borderRadius: 99, position: "relative", overflow: "hidden",
          width: `${progress}%`,
          transition: "width 0.18s linear",
          background: "linear-gradient(90deg, var(--accent-dim), var(--accent), var(--accent-bright), var(--accent), var(--accent-dim))",
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
            background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)",
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
                  ? "linear-gradient(135deg, var(--accent-dim), var(--accent-bright))"
                  : "var(--border-strong)",
              }}
            />
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: progress >= ms ? "var(--accent)" : "var(--text-disabled)",
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
      whileHover={{ y: -3, boxShadow: "0 8px 32px color-mix(in srgb, var(--error) 14%, transparent)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1, minWidth: 130,
        background: "var(--bg-surface)",
        border: `1px solid ${hovered ? "color-mix(in srgb, var(--error) 28%, transparent)" : "var(--border-hairline)"}`,
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
        background: "radial-gradient(circle, color-mix(in srgb, var(--error) 10%, transparent) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
        <span style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Weak Topics
        </span>
      </div>

      <p style={{ margin: "0 0 2px", fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 800, color: count > 0 ? "var(--error)" : "var(--text-faint)", lineHeight: 1 }}>
        {count}
      </p>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>
        {count > 0 ? "topics need revision" : "All topics looking good!"}
      </p>

      {/* Topic chips */}
      {visible.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {visible.map((t) => (
            <span key={t.topic} style={{
              background: "color-mix(in srgb, var(--error) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--error) 22%, transparent)",
              color: "var(--error)",
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
          style={{ border: `2px dashed ${isDragging ? "var(--accent)" : "var(--text-faint)"}`, borderRadius: 12, padding: "clamp(16px, 4vw, 32px) 20px", textAlign: "center", cursor: "pointer", background: isDragging ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--surface-card)", transition: "all 0.2s ease", marginBottom: 14 }}
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
              <p style={{ color: "var(--green)", fontSize: 15, fontWeight: 700, margin: 0 }}>PDF uploaded successfully!</p>
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 6 }}>{uploadedFileName} · {uploadedFileSize}</p>
            </div>
          )}
          {uploadStage === "error" && (
            <div>
              <p style={{ color: "var(--red)", fontSize: 14, fontWeight: 600, margin: 0 }}>Upload failed. Please try again.</p>
            </div>
          )}
        </div>

        {(uploadStage === "uploading" || uploadStage === "processing") && (
          <button
            onClick={cancelUpload}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 8,
              border: "1px solid color-mix(in srgb, var(--error) 40%, transparent)",
              background: "color-mix(in srgb, var(--error) 8%, transparent)",
              color: "var(--error)", fontWeight: 600, fontSize: 13,
              cursor: "pointer", marginTop: 10,
            }}
          >
            ✕ Cancel Upload
          </button>
        )}

        {uploadStage === "done" && (
          <div style={{ display: "flex", gap: 8 }}>
            {documentId && file && (
              <button onClick={handleSavePDF} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, var(--green), var(--green-dark))", color: "var(--text-primary)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Save PDF to Library
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
