"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import ThinkingAnimation from "@/components/ThinkingAnimation";
import StructuredAnswer from "@/components/answer/StructuredAnswer";
import DynamicGreeting from "@/components/dashboard/DynamicGreeting";

function hashQuestion(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0;
  return (h >>> 0).toString(16);
}

// ── Sub-components ───────────────────────────────────────────────


function CopyBtn({ text, light = false }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <button
      onClick={copy}
      title={copied ? "Copied!" : "Copy"}
      style={{
        background:   "transparent",
        border:       "none",
        cursor:       "pointer",
        padding:      "3px 5px",
        borderRadius: 5,
        color:        copied ? "#22c55e" : light ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
        fontSize:     13,
        lineHeight:   1,
        transition:   "color 0.15s",
        flexShrink:   0,
      }}
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
}

function UserMessage({ text, innerRef }) {
  return (
    <motion.div
      ref={innerRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6 }}
    >
      <CopyBtn text={text} light />
      <div style={{
        background:   "linear-gradient(135deg, var(--brand), #4f46e5)",
        color:        "#fff",
        borderRadius: "16px 16px 4px 16px",
        padding:      "10px 16px",
        maxWidth:     "75%",
        fontSize:     14,
        lineHeight:   1.6,
        wordBreak:    "break-word",
        boxShadow:    "0 2px 8px var(--brand-glow)",
      }}>
        {text}
      </div>
    </motion.div>
  );
}

function AIMessage({ msg, isLast, onExport, isExporting }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
    >
      {/* Avatar */}
      <div style={{
        width:          28,
        height:         28,
        borderRadius:   "50%",
        flexShrink:     0,
        background:     "linear-gradient(135deg, var(--brand), #4f46e5)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       12,
        color:          "#fff",
        marginTop:      2,
        fontWeight:     700,
      }}>✦</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Thinking state — before first chunk arrives */}
        {msg.thinking && !msg.text && (
          <ThinkingAnimation domain={msg.classification?.domain} uploadPending={msg.uploadPending} />
        )}

        {/* Streamed / completed answer */}
        {msg.text && (
          <div style={{
            background:   "var(--surface-card)",
            border:       "1px solid var(--border-default)",
            borderRadius: 12,
            padding:      "14px 16px",
          }}>
            {msg.done && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <CopyBtn text={msg.text} />
              </div>
            )}
            <StructuredAnswer
              answer={msg.text}
              isStreaming={!msg.done}
              marks={msg.classification?.marks ?? 10}
            />

            {/* Post-answer actions — only on last completed message */}
            {msg.done && isLast && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", borderTop: "1px solid var(--border-subtle)", paddingTop: 14, alignItems: "center" }}>
                  {msg.downloadUrl ? (
                    <a
                      href={msg.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "6px 12px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      Download PDF
                    </a>
                  ) : (
                    <button
                      onClick={() => onExport(msg.text)}
                      disabled={isExporting}
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "6px 12px", opacity: isExporting ? 0.7 : 1 }}
                    >
                      {isExporting ? "Generating…" : "Export PDF"}
                    </button>
                  )}
                </div>

                {msg.sources?.length > 0 && (
                  <div style={{
                    marginTop:    10,
                    padding:      "7px 12px",
                    background:   "var(--surface-raised)",
                    borderRadius: 8,
                    fontSize:     11,
                    color:        "var(--text-muted)",
                  }}>
                    Source: {msg.sources.join(", ")}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function AskAISection({ fullPage = false, conversationId = null }) {
  const {
    question, setQuestion,
    answer,
    asking, setAsking,
    sources,
    usedContext,
    downloadUrl, setDownloadUrl,
    documentId,
    enqueue,
    queue,
    // Upload — reuse existing context logic
    file: ctxFile, setFile: ctxSetFile,
    uploadStage, setUploadStage,
    uploadProgress, uploadedFileName,
    isDragging, setIsDragging,
    handleUpload, cancelUpload,
  } = useDashboard();

  const [isFocused,   setIsFocused]   = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [classification, setClassification] = useState(null);

  // Staged file — the PDF the user attached but hasn't sent yet
  const [stagedFile, setStagedFile] = useState(null);

  const nextIdRef      = useRef(0);
  const aiMsgIdRef     = useRef(null);
  const currentQRef    = useRef("");
  const sourcesRef     = useRef(null);
  const prevAskingRef  = useRef(false);
  const lastUserMsgRef   = useRef(null);
  const shouldScrollRef  = useRef(false);
  const chatContainerRef = useRef(null);
  const fileInputRef     = useRef(null);

  const nextId = () => { nextIdRef.current += 1; return nextIdRef.current; };

  // ── File handling ─────────────────────────────────────────────
  const handleFileSelect = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      alert("Only PDF files are supported.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      alert("File too large. Max 20MB.");
      return;
    }
    setStagedFile(f);
  };

  const removeStagedFile = () => {
    setStagedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data.messages)) return;
        const loaded = data.messages.map((m, i) => ({
          id: i + 1,
          role: m.role,
          text: m.content,
        }));
        setMessages(loaded);
        nextIdRef.current = loaded.length + 1;
      })
      .catch(() => {});
  }, [conversationId]);

  // When upload completes, clear the staged file
  useEffect(() => {
    if (uploadStage === "done") setStagedFile(null);
  }, [uploadStage]);

  // Safety net: if AI response finishes but upload UI is still stuck,
  // force-complete it. Only fires on true asking→false transitions, not on mount.
  const askingTransitionRef = useRef(false);
  useEffect(() => {
    if (asking) {
      askingTransitionRef.current = true;          // mark that a question started
    } else if (askingTransitionRef.current) {
      askingTransitionRef.current = false;         // transition complete — reset for next cycle
      if (uploadStage === "uploading" || uploadStage === "processing") {
        setUploadStage("done");
      }
    }
  }, [asking, uploadStage, setUploadStage]);

  // Sync sources ref for finalization
  useEffect(() => { sourcesRef.current = sources; }, [sources]);

  // Classification event — updates both local state AND current AI message (for ThinkingAnimation domain)
  useEffect(() => {
    const handler = (e) => {
      setClassification(e.detail);
      if (aiMsgIdRef.current) {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgIdRef.current ? { ...m, classification: e.detail } : m
        ));
      }
    };
    window.addEventListener("askmynotes:classification", handler);
    return () => window.removeEventListener("askmynotes:classification", handler);
  }, []);

  // asking transitions:
  //   false→true : push AI thinking message
  //   true→false : finalize AI message (include latest answer for safety)
  useEffect(() => {
    const wasAsking = prevAskingRef.current;
    prevAskingRef.current = asking;

    if (!wasAsking && asking) {
      const id = nextId();
      aiMsgIdRef.current = id;
      setMessages(prev => [...prev, {
        id,
        role:         "ai",
        text:         "",
        thinking:     true,
        done:         false,
        questionText: currentQRef.current,
        questionHash: hashQuestion(currentQRef.current),
        classification: null,
        sources:      [],
        downloadUrl:  null,
      }]);
    }

    if (wasAsking && !asking) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgIdRef.current
          ? { ...m, text: answer || m.text, thinking: false, done: true, sources: sourcesRef.current || [] }
          : m
      ));
    }
  }, [asking, answer]);

  // Stream answer text into current AI message
  useEffect(() => {
    if (!asking || !aiMsgIdRef.current || !answer) return;
    setMessages(prev => prev.map(m =>
      m.id === aiMsgIdRef.current ? { ...m, text: answer, thinking: false } : m
    ));
  }, [answer, asking]);

  // Propagate downloadUrl to the last completed AI message
  useEffect(() => {
    if (!downloadUrl) return;
    setMessages(prev => {
      const lastAI = [...prev].reverse().find(m => m.role === "ai" && m.done);
      if (!lastAI) return prev;
      return prev.map(m => m.id === lastAI.id ? { ...m, downloadUrl } : m);
    });
  }, [downloadUrl]);

  // Scroll to latest user message once on new question — skips first question, respects manual scroll
  useEffect(() => {
    if (!shouldScrollRef.current || !lastUserMsgRef.current) return;
    shouldScrollRef.current = false;

    const container = chatContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (!isNearBottom) return; // user scrolled up — don't override
    }

    const target = lastUserMsgRef.current;
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [messages]);

  const submitQuestion = async (q) => {
    const hasText = q.trim().length > 0;
    const hasFile = !!stagedFile;
    if (!hasText && !hasFile) return;

    if (messages.length > 0) shouldScrollRef.current = true;

    // Show user message immediately (don't wait for upload)
    if (hasText) {
      currentQRef.current = q;
      setMessages(prev => [...prev, { id: nextId(), role: "user", text: q }]);
    }

    // If a file is staged, upload it and wait for documentId before
    // enqueueing the question — otherwise the AI answers without PDF context.
    if (hasFile) {
      const pendingFile = stagedFile;
      ctxSetFile(pendingFile);
      setStagedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Show a temporary "processing PDF" thinking bubble so UI never looks stuck
      if (hasText) {
        const uploadMsgId = nextId();
        setMessages(prev => [...prev, {
          id: uploadMsgId, role: "ai", text: "",
          thinking: true, done: false, uploadPending: true,
          classification: null, sources: [], downloadUrl: null,
        }]);
        await handleUpload(pendingFile);
        // Remove the temporary thinking bubble — the real AI bubble will replace it
        setMessages(prev => prev.filter(m => m.id !== uploadMsgId));
      } else {
        await handleUpload(pendingFile);
      }
    }

    // Enqueue after upload completes so documentId is available
    if (hasText) {
      enqueue(q);
    }
  };

  const handleExportPdf = async (text) => {
    if (!text || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/generate-document", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: text, type: "pdf", filename: `notes-${Date.now()}` }),
      });
      const data = await res.json();
      if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      id="section-ask"
      className={fullPage ? undefined : "section-card"}
      style={fullPage
        ? { display: "flex", flexDirection: "column", height: "100%", padding: "20px 0 16px" }
        : { marginTop: 0, padding: 24 }
      }
    >

      {/* ── Header — hidden in fullPage mode (page has its own top bar) ── */}
      <div style={{ display: fullPage ? "none" : "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", flex: 1 }}>
          Ask AI
        </span>
        <AnimatePresence>
          {documentId && (
            <motion.span
              key="pdf-badge"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="badge badge-green"
            >
              PDF connected
            </motion.span>
          )}
          {usedContext === false && hasMessages && (
            <motion.span
              key="general-badge"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="badge badge-orange"
            >
              General knowledge
            </motion.span>
          )}
          {classification?.domain && hasMessages && (
            <motion.span
              key="domain-badge"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontSize:      11,
                fontWeight:    700,
                padding:       "3px 10px",
                borderRadius:  20,
                background:    "rgba(124,58,237,0.12)",
                color:         "#a78bfa",
                border:        "1px solid rgba(124,58,237,0.25)",
                letterSpacing: "0.3px",
              }}
            >
              {classification.domain.toUpperCase()} · {classification.marks}M
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Chat messages ─────────────────────────────────── */}
      <div ref={chatContainerRef} style={{
        flex:          fullPage ? 1 : undefined,
        maxHeight:     fullPage ? undefined : "min(520px, 55vh)",
        overflowY:     "auto",
        display:       "flex",
        flexDirection: "column",
        gap:           16,
        marginBottom:  16,
        paddingRight:  4,
      }}>
        <DynamicGreeting isEmptyChat={!hasMessages} />
        {messages.map((msg, i) => {
          const isLastUser = msg.role === "user" && messages.slice(i + 1).every(m => m.role !== "user");
          return msg.role === "user"
            ? <UserMessage key={msg.id} text={msg.text} innerRef={isLastUser ? lastUserMsgRef : null} />
            : <AIMessage
                key={msg.id}
                msg={msg}
                isLast={i === messages.length - 1}
                onExport={handleExportPdf}
                isExporting={isExporting}
              />;
        })}
      </div>

      {/* ── Input area ─────────────────────────────────────── */}
      <div style={{ maxWidth: 580, margin: "0 auto", width: "100%" }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFileSelect(f);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position:           "relative",
          borderRadius:       14,
          background:         isDragging
            ? "rgba(99,102,241,0.08)"
            : "rgba(255,255,255,0.04)",
          backdropFilter:     "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border:             `1px solid ${
            isDragging || isFocused
              ? "rgba(34,211,238,0.5)"
              : isHovered
                ? "rgba(34,211,238,0.25)"
                : "rgba(255,255,255,0.08)"
          }`,
          boxShadow:          isDragging || isFocused
            ? "0 0 0 3px rgba(34,211,238,0.08), 0 8px 32px rgba(0,0,0,0.3)"
            : isHovered
              ? "0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(34,211,238,0.08)"
              : "0 2px 12px rgba(0,0,0,0.2)",
          transform:          isHovered && !isFocused ? "translateY(-1px)" : "translateY(0)",
          transition:         "border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.2s",
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) handleFileSelect(f);
          }}
        />

        {/* Staged file chip — shows above textarea when a PDF is attached */}
        <AnimatePresence>
          {stagedFile && uploadStage !== "uploading" && uploadStage !== "processing" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                display:      "flex",
                alignItems:   "center",
                gap:          8,
                padding:      "8px 12px 0",
              }}>
                <div style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          8,
                  padding:      "6px 10px",
                  borderRadius: 8,
                  background:   "rgba(124,58,237,0.1)",
                  border:       "1px solid rgba(124,58,237,0.25)",
                  fontSize:     12,
                  color:        "#a78bfa",
                  fontWeight:   600,
                  maxWidth:     "80%",
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
                  <span style={{
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                  }}>
                    {stagedFile.name}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, flexShrink: 0 }}>
                    ({(stagedFile.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    onClick={removeStagedFile}
                    style={{
                      background:   "transparent",
                      border:       "none",
                      color:        "var(--text-muted)",
                      cursor:       "pointer",
                      fontSize:     13,
                      padding:      "0 2px",
                      lineHeight:   1,
                      flexShrink:   0,
                    }}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline upload progress — replaces the chip while uploading */}
        <AnimatePresence>
          {(uploadStage === "uploading" || uploadStage === "processing") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "10px 14px 2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                    {uploadStage === "processing" ? "Processing PDF..." : "Uploading PDF..."}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#a855f7", fontWeight: 700 }}>{uploadProgress}%</span>
                    <button
                      onClick={cancelUpload}
                      style={{
                        background: "transparent",
                        border:     "none",
                        color:      "var(--text-muted)",
                        cursor:     "pointer",
                        fontSize:   11,
                        padding:    "2px 4px",
                      }}
                      title="Cancel upload"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div style={{
                  height:       4,
                  borderRadius: 99,
                  overflow:     "hidden",
                  background:   "rgba(255,255,255,0.06)",
                }}>
                  <div style={{
                    height:       "100%",
                    borderRadius: 99,
                    width:        `${uploadProgress}%`,
                    transition:   "width 0.18s linear",
                    background:   "linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7)",
                  }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag overlay hint */}
        {isDragging && (
          <div style={{
            position:       "absolute",
            inset:          0,
            borderRadius:   12,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            background:     "rgba(99,102,241,0.08)",
            zIndex:         2,
            pointerEvents:  "none",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)" }}>
              Drop PDF here
            </span>
          </div>
        )}

        {/* Textarea row with attach button */}
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          {/* Attach button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStage === "uploading" || uploadStage === "processing"}
            style={{
              background:     "transparent",
              border:         "none",
              cursor:         uploadStage === "uploading" || uploadStage === "processing" ? "not-allowed" : "pointer",
              padding:        "10px 4px 10px 12px",
              fontSize:       18,
              color:          stagedFile ? "#a78bfa" : "var(--text-muted)",
              flexShrink:     0,
              display:        "flex",
              alignItems:     "center",
              transition:     "color 0.15s",
              opacity:        uploadStage === "uploading" || uploadStage === "processing" ? 0.4 : 1,
            }}
            title="Attach PDF"
          >
            📎
          </motion.button>

          <textarea
            placeholder={stagedFile ? "Add a message about this PDF…" : "Ask any academic question"}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (question.trim() || stagedFile) { submitQuestion(question); setQuestion(""); }
              }
            }}
            onPaste={(e) => {
              const files = e.clipboardData?.files;
              if (files && files.length > 0) {
                const f = files[0];
                if (f.type === "application/pdf") {
                  e.preventDefault();
                  handleFileSelect(f);
                }
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={2}
            style={{
              flex:         1,
              padding:      "14px 52px 14px 4px",
              background:   "transparent",
              color:        "var(--text-primary)",
              border:       "none",
              fontSize:     14,
              lineHeight:   1.6,
              resize:       "none",
              outline:      "none",
              boxSizing:    "border-box",
              fontFamily:   "inherit",
            }}
          />

          {/* Send / Stop button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={asking ? () => setAsking(false) : () => { submitQuestion(question); setQuestion(""); }}
            disabled={!asking && !question.trim() && !stagedFile}
            style={{
              position:       "absolute",
              right:          10,
              bottom:         10,
              width:          36,
              height:         36,
              borderRadius:   9,
              border:         "none",
              background:     asking
                ? "linear-gradient(135deg, var(--red), var(--red-dark))"
                : (!question.trim() && !stagedFile)
                  ? "var(--border-default)"
                  : "linear-gradient(135deg, var(--brand), #4f46e5)",
              color:          !asking && !question.trim() && !stagedFile ? "var(--text-faint)" : "#fff",
              fontSize:       15,
              cursor:         !asking && !question.trim() && !stagedFile ? "not-allowed" : "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              boxShadow:      asking || question.trim() || stagedFile ? "0 2px 10px var(--brand-glow)" : "none",
              transition:     "background 0.18s, box-shadow 0.18s",
            }}
            title={asking ? "Stop" : "Send"}
          >
            {asking ? "⏹" : "➤"}
          </motion.button>
        </div>
      </div>
      </div>

      {queue.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0", textAlign: "center" }}>
          {queue.length} question{queue.length > 1 ? "s" : ""} queued
        </p>
      )}

      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
