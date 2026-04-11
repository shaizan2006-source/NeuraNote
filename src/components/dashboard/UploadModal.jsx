"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

// Re-use SmartProgressBar from UploadSection without copying its deps.
// All logic (handleUpload, cancelUpload, etc.) lives in DashboardContext.

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>{statusText}</span>
        <span style={{ color: "#a855f7", fontSize: 14, fontWeight: 800 }}>{progress}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${progress}%`,
          transition: "width 0.18s linear",
          background: "linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)",
        }} />
      </div>
    </div>
  );
}

export default function UploadModal() {
  const {
    file, setFile,
    examName, setExamName,
    uploadStage, setUploadStage,
    uploadProgress, uploadedFileName, uploadedFileSize,
    isDragging, setIsDragging,
    documentId, handleUpload, handleSavePDF, cancelUpload,
  } = useDashboard();

  const [open, setOpen] = useState(false);

  // Auto-close on successful upload after a short delay
  useEffect(() => {
    if (uploadStage === "done") {
      const t = setTimeout(() => setOpen(false), 2200);
      return () => clearTimeout(t);
    }
  }, [uploadStage]);

  const handleClose = () => {
    // Don't close mid-upload
    if (uploadStage === "uploading" || uploadStage === "processing") return;
    setOpen(false);
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen(true)}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            6,
          padding:        "7px 14px",
          borderRadius:   9,
          border:         "1px solid rgba(124,58,237,0.4)",
          background:     "rgba(124,58,237,0.12)",
          color:          "#a78bfa",
          fontSize:       13,
          fontWeight:     600,
          cursor:         "pointer",
          transition:     "background 0.15s",
          flexShrink:     0,
        }}
      >
        <span style={{ fontSize: 14 }}>📄</span>
        Upload PDF
      </motion.button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={handleClose}
              style={{
                position:   "fixed",
                inset:      0,
                background: "rgba(0,0,0,0.65)",
                zIndex:     1000,
                backdropFilter: "blur(4px)",
              }}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                position:     "fixed",
                top:          "50%",
                left:         "50%",
                transform:    "translate(-50%, -50%)",
                zIndex:       1001,
                width:        "min(480px, 92vw)",
                background:   "var(--surface-card)",
                border:       "1px solid var(--border-default)",
                borderRadius: 16,
                padding:      24,
                boxShadow:    "0 24px 64px rgba(0,0,0,0.65)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Upload PDF Notes</span>
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    background:   "transparent",
                    border:       "1px solid var(--border-subtle)",
                    borderRadius: 7,
                    color:        "var(--text-muted)",
                    fontSize:     13,
                    cursor:       uploadStage === "uploading" || uploadStage === "processing" ? "not-allowed" : "pointer",
                    padding:      "4px 9px",
                    opacity:      uploadStage === "uploading" || uploadStage === "processing" ? 0.4 : 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Subject input */}
              <input
                placeholder="Subject name (e.g. Web Technologies)"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                style={{
                  width:        "100%",
                  padding:      "9px 12px",
                  borderRadius: 8,
                  background:   "var(--surface-raised)",
                  border:       "1px solid var(--text-faint)",
                  color:        "var(--text-primary)",
                  fontSize:     13,
                  outline:      "none",
                  marginBottom: 12,
                  boxSizing:    "border-box",
                }}
              />

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) { setFile(f); handleUpload(f); }
                }}
                onClick={() => document.getElementById("modal-pdf-input").click()}
                style={{
                  border:       `2px dashed ${isDragging ? "var(--blue-dark)" : "var(--text-faint)"}`,
                  borderRadius: 12,
                  padding:      "28px 20px",
                  textAlign:    "center",
                  cursor:       "pointer",
                  background:   isDragging ? "rgba(37,99,235,0.08)" : "var(--surface-raised)",
                  transition:   "all 0.2s ease",
                  marginBottom: 14,
                }}
              >
                <input
                  id="modal-pdf-input"
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { setFile(f); handleUpload(f); }
                  }}
                />

                {uploadStage === "idle" && (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>☁️</div>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}>Drag & drop your PDF here</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                      or <span style={{ color: "var(--blue-dark)", fontWeight: 600 }}>click to browse</span>
                    </p>
                    <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 8 }}>Max 20MB</p>
                  </>
                )}
                {(uploadStage === "uploading" || uploadStage === "processing") && (
                  <SmartProgressBar progress={uploadProgress} stage={uploadStage} />
                )}
                {uploadStage === "done" && (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    <p style={{ color: "var(--green)", fontSize: 14, fontWeight: 700, margin: 0 }}>Uploaded successfully!</p>
                    <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>📄 {uploadedFileName} · {uploadedFileSize}</p>
                  </>
                )}
                {uploadStage === "error" && (
                  <>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>❌</div>
                    <p style={{ color: "var(--red)", fontSize: 13, fontWeight: 600, margin: 0 }}>Upload failed. Please try again.</p>
                  </>
                )}
              </div>

              {/* Action buttons */}
              {(uploadStage === "uploading" || uploadStage === "processing") && (
                <button
                  onClick={cancelUpload}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  ✕ Cancel Upload
                </button>
              )}
              {uploadStage === "done" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {documentId && file && (
                    <button
                      onClick={() => { handleSavePDF(); setOpen(false); }}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                        background: "linear-gradient(135deg, var(--green), var(--green-dark))",
                        color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      💾 Save to Library
                    </button>
                  )}
                  <button
                    onClick={() => { setFile(null); setUploadStage("idle"); const inp = document.getElementById("modal-pdf-input"); if (inp) inp.value = ""; }}
                    style={{
                      flex: documentId && file ? "0 0 auto" : 1,
                      padding: "10px 16px", borderRadius: 8,
                      border: "1px solid var(--text-faint)",
                      background: "transparent",
                      color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    + Add New PDF
                  </button>
                </div>
              )}
              {uploadStage === "error" && (
                <button
                  onClick={() => setUploadStage("idle")}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    border: "1px solid var(--text-faint)", background: "transparent",
                    color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Try Again
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
