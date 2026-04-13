"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useDrawer } from "@/context/DrawerContext";
import { useDashboard } from "@/context/DashboardContext";

const CURSOR_CSS = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;

function BlinkingCursor() {
  return (
    <span style={{
      display: "inline-block", width: 2, height: "1em",
      background: "#22D3EE", marginLeft: 2, verticalAlign: "text-bottom",
      animation: "blink 1s step-end infinite",
    }} />
  );
}

function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div style={{
        background: "rgba(139,92,246,0.12)", color: "#c4b5fd",
        borderRadius: 6, padding: "5px 8px", maxWidth: "80%",
        fontSize: 9, lineHeight: 1.5, wordBreak: "break-word",
      }}>{text}</div>
    </div>
  );
}

function AIBubble({ text, isStreaming = false }) {
  return (
    <div style={{
      borderLeft: "2px solid rgba(34,211,238,0.35)",
      padding: "5px 8px", borderRadius: "0 6px 6px 0",
      background: "rgba(34,211,238,0.02)",
      fontSize: 9, color: "#a1a1aa", lineHeight: 1.5,
    }}>
      {text}{isStreaming && <BlinkingCursor />}
    </div>
  );
}

export default function QuickChatDrawer({ userId }) {
  const router = useRouter();
  const { isOpen, closeDrawer, conversationId, setConversationId, activePdf } = useDrawer();
  const { documentId } = useDashboard();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Pick up initial question placed in sessionStorage by AskAIHeroCard
  useEffect(() => {
    if (!isOpen) return;
    const initial = sessionStorage.getItem("drawer_initial_question");
    if (initial) {
      sessionStorage.removeItem("drawer_initial_question");
      sendMessage(initial);
    }
  }, [isOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/quick-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question:        q,
          user_id:         userId,
          document_id:     activePdf?.id || documentId || null,
          conversation_id: conversationId,
        }),
      });
      const data = await res.json();
      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer || "Sorry, I couldn't answer that.",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Please try again.",
      }]);
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
            <div style={{
              flex: 1, overflowY: "auto",
              padding: "10px 12px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {messages.length === 0 && (
                <p style={{ color: "#3f3f46", fontSize: 9, textAlign: "center", marginTop: 20 }}>
                  Ask anything about your study material
                </p>
              )}
              {messages.map((m, i) => (
                m.role === "user"
                  ? <UserBubble key={i} text={m.content} />
                  : <AIBubble  key={i} text={m.content}
                      isStreaming={loading && i === messages.length - 1} />
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <AIBubble text="" isStreaming />
              )}
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
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Follow up…"
                  disabled={loading}
                  style={{
                    flex:         1,
                    background:   "rgba(255,255,255,0.04)",
                    border:       "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 5,
                    padding:      "4px 8px",
                    fontSize:     9,
                    color:        "#e4e4e7",
                    outline:      "none",
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
                  }}
                >↑</button>
              </div>
              {conversationId && (
                <button
                  onClick={() => { closeDrawer(); router.push(`/ask-ai?cid=${conversationId}`); }}
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
