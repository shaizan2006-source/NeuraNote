"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDrawer } from "@/context/DrawerContext";
import { useDashboard } from "@/context/DashboardContext";

const CURSOR_CSS = `
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40%           { opacity: 1;    transform: scale(1);    }
}
/* Code blocks inside the drawer scroll horizontally instead of overflowing */
.qcd-messages pre  { overflow-x: auto; max-width: 100%; white-space: pre; }
.qcd-messages code { white-space: pre-wrap; word-break: break-word; }
.qcd-messages pre code { white-space: pre; word-break: normal; }
`;

function BlinkingCursor() {
  return (
    <span style={{
      display: "inline-block", width: 2, height: "1em",
      background: "#22D3EE", marginLeft: 2, verticalAlign: "text-bottom",
      animation: "blink 1s step-end infinite",
    }} />
  );
}

function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#52525b",
          display: "inline-block",
          animation: `dotPulse 1.4s ease-in-out ${i * 0.22}s infinite`,
        }} />
      ))}
    </span>
  );
}

function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
      <div style={{
        background:     "rgba(139,92,246,0.12)",
        color:          "#c4b5fd",
        borderRadius:   6,
        padding:        "5px 8px",
        maxWidth:       "80%",
        fontSize:       9,
        lineHeight:     1.5,
        wordBreak:      "break-word",
        overflowWrap:   "anywhere",
        whiteSpace:     "pre-wrap",
        overflowX:      "hidden",
      }}>{text}</div>
    </div>
  );
}

function AIBubble({ text, isStreaming = false }) {
  return (
    <div style={{
      borderLeft:   "2px solid rgba(34,211,238,0.35)",
      padding:      "5px 8px",
      borderRadius: "0 6px 6px 0",
      background:   "rgba(34,211,238,0.02)",
      fontSize:     9,
      color:        "#a1a1aa",
      lineHeight:   1.5,
      minHeight:    20,
      // overflow containment
      minWidth:     0,
      overflowX:    "hidden",
      wordBreak:    "break-word",
      overflowWrap: "anywhere",
      whiteSpace:   "pre-wrap",
    }}>
      {!text && isStreaming
        ? <ThinkingDots />
        : <>{text}{isStreaming && <BlinkingCursor />}</>
      }
    </div>
  );
}

export default function QuickChatDrawer({ userId }) {
  const router = useRouter();
  const { isOpen, closeDrawer, conversationId, setConversationId, activePdf } = useDrawer();
  const { documentId } = useDashboard();

  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);

  const bottomRef      = useRef(null);
  const drawerInputRef = useRef(null);
  const loadingRef     = useRef(false);   // mirror of loading — stable inside timeouts

  // Keep loadingRef in sync
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Auto-resize the textarea as the user types
  const resizeInput = () => {
    const el = drawerInputRef.current;
    if (!el) return;
    el.style.height    = "auto";
    const h = el.scrollHeight;
    el.style.height    = Math.min(h, 80) + "px";
    el.style.overflowY = h > 80 ? "auto" : "hidden";
  };
  useLayoutEffect(() => { resizeInput(); }, [input]);

  // Focus input once drawer is open and not loading.
  // Fires on open (no initial question) and on every loading→false transition.
  useEffect(() => {
    if (!isOpen || loading) return;
    const id = setTimeout(() => drawerInputRef.current?.focus(), 60);
    return () => clearTimeout(id);
  }, [isOpen, loading]);

  // Pick up initial question placed in sessionStorage by AskAIHeroCard
  useEffect(() => {
    if (!isOpen) return;
    const initial = sessionStorage.getItem("drawer_initial_question");
    if (initial) {
      sessionStorage.removeItem("drawer_initial_question");
      sendMessage(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // sendMessage is stable — intentional

  // Auto-scroll on new messages / content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);

    // Append user bubble + empty AI placeholder immediately
    setMessages(prev => [
      ...prev,
      { role: "user",      content: q },
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/quick-chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          question:        q,
          user_id:         userId,
          document_id:     activePdf?.id || documentId || null,
          conversation_id: conversationId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Request failed");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });

        // Visible text is everything before the __CONV__ marker (if it arrived yet)
        const sep = raw.indexOf("\n__CONV__");
        const visible = sep !== -1 ? raw.slice(0, sep) : raw;

        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: "assistant", content: visible, streaming: true };
          return msgs;
        });
      }

      // Parse conversation metadata appended at end of stream
      const sep = raw.indexOf("\n__CONV__");
      if (sep !== -1) {
        try {
          const meta = JSON.parse(raw.slice(sep + 9)); // 9 === "\n__CONV__".length
          if (meta.conversation_id) setConversationId(meta.conversation_id);
        } catch {}
      }

      // Mark last message as done (remove streaming cursor)
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false };
        return msgs;
      });

    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role:      "assistant",
          content:   "Something went wrong. Please try again.",
          streaming: false,
        };
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  }

  const effectivePdfName = activePdf?.name || null;

  return (
    <>
      <style>{CURSOR_CSS}</style>

      {/* Backdrop overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 9,
            }}
          />
        )}
      </AnimatePresence>

      {/* Drawer panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              position:      "fixed",
              top:           0,
              right:         0,
              height:        "100vh",
              width:         "clamp(320px, 40vw, 600px)",
              background:    "#111111",
              borderLeft:    "1px solid rgba(255,255,255,0.05)",
              zIndex:        10,
              display:       "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding:        "8px 12px",
              borderBottom:   "1px solid rgba(255,255,255,0.05)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              flexShrink:     0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5" }}>◈ Quick Ask</span>
                {effectivePdfName ? (
                  <span style={{
                    fontSize: 9, color: "#22D3EE",
                    background: "rgba(34,211,238,0.08)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    borderRadius: 4, padding: "1px 5px",
                  }}>{effectivePdfName}</span>
                ) : (
                  <span style={{
                    fontSize: 9, color: "#52525b",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4, padding: "1px 5px",
                  }}>No PDF</span>
                )}
              </div>
              <button onClick={closeDrawer} style={{
                background: "transparent", border: "none",
                color: "#52525b", cursor: "pointer", fontSize: 14,
              }}>✕</button>
            </div>

            {/* Message thread */}
            <div className="qcd-messages" style={{
              flex:      1,
              overflowY: "auto",
              overflowX: "hidden",   // prevent any child from blowing out width
              padding:   "10px 12px",
              display:   "flex", flexDirection: "column", gap: 8,
              minWidth:  0,          // flex child must shrink below content size
              minHeight: 0,          // CRITICAL: allows overflow: auto to work in flex container
            }}>
              {messages.length === 0 && (
                <p style={{ color: "#3f3f46", fontSize: 9, textAlign: "center", marginTop: 20 }}>
                  Ask anything about your study material
                </p>
              )}
              {messages.map((m, i) => (
                m.role === "user"
                  ? <UserBubble key={i} text={m.content} />
                  : <AIBubble  key={i} text={m.content} isStreaming={!!m.streaming} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div style={{
              padding:       "7px 12px",
              borderTop:     "1px solid rgba(255,255,255,0.05)",
              display:       "flex",
              flexDirection: "column",
              gap:           4,
              flexShrink:    0,
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                <textarea
                  ref={drawerInputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); resizeInput(); }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Follow up… (Shift+Enter for new line)"
                  disabled={loading}
                  rows={1}
                  style={{
                    flex:         1,
                    background:   "rgba(255,255,255,0.04)",
                    border:       "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 5,
                    padding:      "4px 8px",
                    fontSize:     9,
                    color:        "#e4e4e7",
                    outline:      "none",
                    resize:       "none",
                    overflowY:    "hidden",
                    lineHeight:   1.5,
                    fontFamily:   "inherit",
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 20, height: 20, flexShrink: 0,
                    background:   "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                    border:       "none",
                    borderRadius: 5,
                    color:        "#fff",
                    fontSize:     9,
                    cursor:       loading ? "not-allowed" : "pointer",
                    display:      "flex", alignItems: "center", justifyContent: "center",
                    opacity:      loading ? 0.5 : 1,
                    marginBottom: 1,   // optical alignment with single-line textarea
                  }}
                >↑</button>
              </div>
              {conversationId && (
                <button
                  onClick={() => {
                    // Snapshot all completed messages so the Ask-AI page can hydrate
                    // instantly without waiting for a Supabase round-trip.
                    const snapshot = messages
                      .filter(m => !m.streaming)
                      .map(m => ({ role: m.role, content: m.content }));
                    if (snapshot.length > 0) {
                      try {
                        sessionStorage.setItem("amn_qc_handoff", JSON.stringify({
                          cid:      conversationId,
                          messages: snapshot,
                        }));
                      } catch {} // sessionStorage unavailable (private mode / quota)
                    }
                    closeDrawer();
                    router.push(`/ask-ai?cid=${conversationId}`);
                  }}
                  style={{
                    background: "transparent", border: "none",
                    color: "#22D3EE", fontSize: 8,
                    cursor: "pointer", textAlign: "right",
                    padding: 0, alignSelf: "flex-end",
                  }}
                >
                  Open full chat →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
