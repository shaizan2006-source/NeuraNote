"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
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

// ── Upload menu icons ────────────────────────────────────────────
function PaperclipIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}
function ImageFileIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}
function PDFFileIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function DocFileIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="8" y2="18"/>
      <line x1="16" y1="14" x2="8" y2="14"/>
    </svg>
  );
}
function SpinnerIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "askmySpin 0.75s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function FileChip({ sf, onRemove, isUploading }) {
  const isPdf   = sf.fileType === "pdf";
  const isImage = sf.fileType === "image";
  const iconColor = isPdf ? "#a78bfa" : isImage ? "#22D3EE" : "#71717a";
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88, y: 3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 3 }}
      transition={{ duration: 0.15 }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          6,
        padding:      "5px 7px 5px 9px",
        borderRadius: 8,
        background:   "rgba(255,255,255,0.05)",
        border:       "1px solid rgba(255,255,255,0.09)",
        fontSize:     12,
        color:        "#e4e4e7",
        maxWidth:     220,
        flexShrink:   0,
      }}
    >
      <span style={{ color: iconColor, flexShrink: 0, display: "flex" }}>
        {isUploading
          ? <SpinnerIcon size={13} />
          : isPdf ? <PDFFileIcon /> : isImage ? <ImageFileIcon size={13} /> : <DocFileIcon />
        }
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0, color: "#d4d4d8" }}>
        {sf.name}
      </span>
      <button
        onClick={() => onRemove(sf.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background:  "transparent",
          border:      "none",
          cursor:      "pointer",
          color:       hovered ? "#e4e4e7" : "#52525b",
          padding:     "0 2px",
          lineHeight:  1,
          fontSize:    12,
          display:     "flex",
          alignItems:  "center",
          flexShrink:  0,
          transition:  "color 0.1s",
        }}
        title="Remove"
      >✕</button>
    </motion.div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function AutoScrollButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position:             "absolute",
        bottom:               76,
        left:                 "50%",
        transform:            `translateX(-50%) translateY(${hovered ? "-1px" : "0"})`,
        width:                36,
        height:               36,
        borderRadius:         "50%",
        background:           "rgba(28,28,32,0.92)",
        border:               `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
        boxShadow:            "0 4px 16px rgba(0,0,0,0.45)",
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "center",
        cursor:               "pointer",
        color:                "#a1a1aa",
        zIndex:               20,
        backdropFilter:       "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding:              0,
        transition:           "border-color 0.15s, transform 0.15s",
      }}
      aria-label="Scroll to bottom"
    >
      <ChevronDownIcon />
    </motion.button>
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
    setFile: ctxSetFile,
    uploadStage, setUploadStage,
    isDragging, setIsDragging,
    handleUpload,
  } = useDashboard();

  const [isFocused,   setIsFocused]   = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [classification, setClassification] = useState(null);

  // Staged files — files the user attached but hasn't sent yet
  const [stagedFiles, setStagedFiles] = useState([]);
  const stagedFileIdRef = useRef(0);

  const nextIdRef      = useRef(0);
  const aiMsgIdRef     = useRef(null);
  const currentQRef    = useRef("");
  const sourcesRef     = useRef(null);
  const prevAskingRef  = useRef(false);
  const lastUserMsgRef   = useRef(null);
  const shouldScrollRef  = useRef(false);
  const chatContainerRef = useRef(null);
  const textareaRef      = useRef(null);
  const fileInputRef     = useRef(null);
  const imageInputRef    = useRef(null);
  const menuRef          = useRef(null);

  const [menuOpen,    setMenuOpen]    = useState(false);
  const [menuHovered, setMenuHovered] = useState(null);

  const nextId = () => { nextIdRef.current += 1; return nextIdRef.current; };

  // ── File handling ─────────────────────────────────────────────
  // autoResize — called via useLayoutEffect so it runs after React commits
  // new DOM value to the textarea, before the browser paints. Using "auto"
  // lets the UA restore its intrinsic height so scrollHeight is accurate.
  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height    = "auto";
    const h = ta.scrollHeight;
    ta.style.height    = Math.min(h, 160) + "px";
    ta.style.overflowY = h > 160 ? "auto" : "hidden";
  };

  const handleFileSelect = (f) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { alert("File too large. Max 20MB."); return; }
    if (stagedFiles.some(s => s.name === f.name)) return; // deduplicate
    const fileType = f.type === "application/pdf" ? "pdf"
      : f.type.startsWith("image/") ? "image" : "doc";
    stagedFileIdRef.current += 1;
    setStagedFiles(prev => [...prev, {
      id: stagedFileIdRef.current,
      file: f, name: f.name, size: f.size,
      fileType, status: "staged",
    }]);
  };

  const removeStagedFile = (id) => {
    setStagedFiles(prev => prev.filter(s => s.id !== id));
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

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

  // When upload completes, clear all staged files
  useEffect(() => {
    if (uploadStage === "done") setStagedFiles([]);
  }, [uploadStage]);

  // useLayoutEffect fires after React commits but before paint — no height flash
  useLayoutEffect(() => { autoResize(); }, [question]);

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
    const pdfs    = stagedFiles.filter(sf => sf.fileType === "pdf");
    const hasPDF  = pdfs.length > 0;
    if (!hasText && !hasPDF) return;

    if (messages.length > 0) shouldScrollRef.current = true;

    if (hasText) {
      currentQRef.current = q;
      setMessages(prev => [...prev, { id: nextId(), role: "user", text: q }]);
    }

    // Upload PDFs sequentially — last one's documentId is used for the query
    if (hasPDF) {
      for (const sf of pdfs) {
        setStagedFiles(prev => prev.map(s => s.id === sf.id ? { ...s, status: "uploading" } : s));
        ctxSetFile(sf.file);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (hasText) {
          const uploadMsgId = nextId();
          setMessages(prev => [...prev, {
            id: uploadMsgId, role: "ai", text: "",
            thinking: true, done: false, uploadPending: true,
            classification: null, sources: [], downloadUrl: null,
          }]);
          await handleUpload(sf.file);
          setMessages(prev => prev.filter(m => m.id !== uploadMsgId));
        } else {
          await handleUpload(sf.file);
        }
      }
    }

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
      {/*
        Architecture: outer wrapper (position:relative) holds the floating menu
        as a sibling of the pill. The pill itself gets overflow:hidden so content
        is always clipped to the rounded shape. The menu lives OUTSIDE the pill
        so overflow:hidden doesn't clip it.
      */}
      <div
        ref={menuRef}
        style={{ maxWidth: 580, margin: "0 auto", width: "100%", position: "relative" }}
      >
        {/* Hidden file inputs — outside pill so they're never clipped */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.doc,.docx,.txt"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
        />

        {/* ── Floating attach menu — SIBLING of pill, not inside it ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              style={{
                position:             "absolute",
                bottom:               "calc(100% + 6px)",
                left:                 10,
                background:           "rgba(18,18,20,0.97)",
                backdropFilter:       "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border:               "1px solid rgba(255,255,255,0.08)",
                borderRadius:         12,
                boxShadow:            "0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.2)",
                minWidth:             176,
                overflow:             "hidden",
                zIndex:               100,
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                onMouseEnter={() => setMenuHovered("files")}
                onMouseLeave={() => setMenuHovered(null)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        10,
                  width:      "100%",
                  padding:    "9px 14px",
                  background: menuHovered === "files" ? "rgba(255,255,255,0.06)" : "transparent",
                  border:     "none",
                  cursor:     "pointer",
                  color:      "#e4e4e7",
                  fontSize:   13,
                  textAlign:  "left",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ color: "#71717a", flexShrink: 0, display: "flex" }}><PaperclipIcon /></span>
                Add files
              </button>
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 8px" }} />
              <button
                onClick={() => { setMenuOpen(false); imageInputRef.current?.click(); }}
                onMouseEnter={() => setMenuHovered("image")}
                onMouseLeave={() => setMenuHovered(null)}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        10,
                  width:      "100%",
                  padding:    "9px 14px",
                  background: menuHovered === "image" ? "rgba(255,255,255,0.06)" : "transparent",
                  border:     "none",
                  cursor:     "pointer",
                  color:      "#e4e4e7",
                  fontSize:   13,
                  textAlign:  "left",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ color: "#71717a", flexShrink: 0, display: "flex" }}><ImageFileIcon /></span>
                Add image
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pill container — overflow:hidden clips everything to rounded shape ── */}
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
            position:             "relative",
            borderRadius:         9999,
            overflow:             "hidden",   // THE fix — clips content to pill shape
            background:           isDragging
              ? "rgba(99,102,241,0.08)"
              : "rgba(255,255,255,0.04)",
            backdropFilter:       "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border:               `1px solid ${
              isDragging || isFocused
                ? "rgba(34,211,238,0.5)"
                : isHovered
                  ? "rgba(34,211,238,0.25)"
                  : "rgba(255,255,255,0.08)"
            }`,
            boxShadow:            isDragging || isFocused
              ? "0 0 0 3px rgba(34,211,238,0.08), 0 8px 32px rgba(0,0,0,0.3)"
              : isHovered
                ? "0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(34,211,238,0.08)"
                : "0 2px 12px rgba(0,0,0,0.2)",
            transform:            isHovered && !isFocused ? "translateY(-1px)" : "translateY(0)",
            transition:           "border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.2s",
          }}
        >
          {/* Drag-over overlay */}
          {isDragging && (
            <div style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "rgba(99,102,241,0.10)",
              zIndex:         2,
              pointerEvents:  "none",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)" }}>
                Drop PDF here
              </span>
            </div>
          )}

          {/* ── Attachment row (slides in when files are staged) ── */}
          <AnimatePresence>
            {stagedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  display:   "flex",
                  flexWrap:  "wrap",
                  gap:       6,
                  padding:   "10px 14px 4px",
                }}>
                  <AnimatePresence mode="popLayout">
                    {stagedFiles.map(sf => (
                      <FileChip
                        key={sf.id}
                        sf={sf}
                        onRemove={removeStagedFile}
                        isUploading={
                          sf.status === "uploading" ||
                          uploadStage === "uploading" ||
                          uploadStage === "processing"
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input row ── */}
          <div style={{
            display:    "flex",
            alignItems: "flex-end",   // buttons pin to bottom as textarea grows
          }}>
            {/* + button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setMenuOpen(o => !o)}
              style={{
                flexShrink:  0,
                background:  "transparent",
                border:      "none",
                cursor:      "pointer",
                // Match textarea metrics exactly so the + sits on the same
                // optical baseline as the first line of text.
                // fontSize 15 → 1px over textarea (14) for slight visual weight.
                // lineHeight 1.6 → identical to textarea, makes button height
                // = padding-top(14) + 15*1.6(24) + padding-bottom(14) = 52px,
                // centering the + at 14+12=26px from bottom.
                // Textarea first-line center = padding-bottom(14)+half-line(11.2) = 25.2px.
                // Delta = 0.8px — imperceptible optically.
                // fontSize 20, lineHeight 1.6 → line = 32px, half = 16px
                // paddingBottom = 25.2 (text center from floor) − 16 = 9.2 ≈ 9px
                padding:     "14px 6px 9px 14px",
                fontSize:    20,
                lineHeight:  1.6,
                fontWeight:  300,
                color:       menuOpen || stagedFiles.length > 0 ? "#a78bfa" : "#71717a",
                transition:  "color 0.15s",
              }}
              title="Attach file"
            >
              +
            </motion.button>

            {/*
              Textarea
              ─────────────────────────────────────────────────────────────────
              flex:1 + minWidth:0 = fills remaining space without blowing out
              overflow:hidden on pill clips any stray rendering at the corners
              overflowY managed by autoResize (hidden → auto at max-height)
              wordBreak + overflowWrap guarantee long strings wrap, never overflow
            */}
            <textarea
              ref={textareaRef}
              placeholder={stagedFiles.length > 0 ? "Add a message about these files…" : "Ask any academic question"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (question.trim() || stagedFiles.length > 0) {
                    submitQuestion(question);
                    setQuestion("");
                  }
                }
              }}
              onPaste={(e) => {
                const files = e.clipboardData?.files;
                if (files?.length > 0 && files[0].type === "application/pdf") {
                  e.preventDefault();
                  handleFileSelect(files[0]);
                }
              }}
              onFocus={() => { setIsFocused(true); setMenuOpen(false); }}
              onBlur={() => setIsFocused(false)}
              rows={1}
              style={{
                flex:         1,
                minWidth:     0,
                padding:      "14px 8px",
                background:   "transparent",
                color:        "var(--text-primary)",
                border:       "none",
                fontSize:     14,
                lineHeight:   1.6,
                resize:       "none",
                outline:      "none",
                overflowY:    "hidden",
                boxSizing:    "border-box",
                fontFamily:   "inherit",
                wordBreak:    "break-word",
                overflowWrap: "break-word",
                whiteSpace:   "pre-wrap",
                display:      "block",
              }}
            />

            {/* Send / Stop button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              onClick={asking ? () => setAsking(false) : () => { submitQuestion(question); setQuestion(""); }}
              disabled={!asking && !question.trim() && stagedFiles.length === 0}
              style={{
                flexShrink:     0,
                alignSelf:      "flex-end",
                // margin-bottom: 14 (textarea pad) + 11.2 (half text line) − 17 (half button) = 8.2 → 8px
                // This centres the button on the same optical axis as the text.
                margin:         "0 10px 8px 4px",
                width:          34,
                height:         34,
                borderRadius:   "50%",
                border:         "none",
                background:     asking
                  ? "linear-gradient(135deg, var(--red), var(--red-dark))"
                  : (!question.trim() && stagedFiles.length === 0)
                    ? "rgba(255,255,255,0.07)"
                    : "linear-gradient(135deg, var(--brand), #4f46e5)",
                color:          !asking && !question.trim() && stagedFiles.length === 0
                  ? "#3f3f46"
                  : "#fff",
                fontSize:       14,
                cursor:         !asking && !question.trim() && stagedFiles.length === 0
                  ? "default"
                  : "pointer",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                boxShadow:      asking || question.trim() || stagedFiles.length > 0
                  ? "0 2px 10px var(--brand-glow)"
                  : "none",
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
        @keyframes askmySpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
