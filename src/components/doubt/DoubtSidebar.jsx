// src/components/doubt/DoubtSidebar.jsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clientFetch } from "@/lib/clientFetch";
import { parseSseStream } from "@/lib/sseParser";
import DoubtThreadView from "./DoubtThreadView";

function ExpandIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

/**
 * Doubt sidebar — right panel on desktop, full-width bottom sheet on mobile.
 * Owns thread state: opens (or resumes) the thread for the given Q&A target
 * and streams doubt answers. Each target maps to exactly one thread; a new
 * target means a completely fresh thread — nothing carries over.
 *
 * Props:
 *   target         {question, answer} | null   (null = closed)
 *   conversationId string
 *   onClose        () => void
 */
export default function DoubtSidebar({ target, conversationId, onClose }) {
  const router = useRouter();
  const [thread,        setThread]        = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [edits,         setEdits]         = useState([]);
  const [streamingText, setStreamingText] = useState(null);
  const [sending,       setSending]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [isMobile,      setIsMobile]      = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ESC closes
  useEffect(() => {
    if (!target) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  // Open (or resume) the thread whenever the target Q&A changes.
  useEffect(() => {
    if (!target || !conversationId) return;
    let cancelled = false;
    setThread(null); setMessages([]); setEdits([]); setStreamingText(null); setError(null);
    setLoading(true);

    (async () => {
      try {
        const res = await clientFetch("/api/doubt/open", {
          method: "POST",
          body:   JSON.stringify({
            conversation_id: conversationId,
            question:        target.question,
            answer:          target.answer,
          }),
        });
        if (!res?.ok) {
          const err = await res?.json().catch(() => ({}));
          throw new Error(err?.error || "Couldn't open the doubt panel.");
        }
        const data = await res.json();
        if (cancelled) return;
        setThread(data.thread);
        setMessages(data.messages ?? []);
        // Resume path returns messages but not edits — fetch full state.
        if ((data.messages ?? []).length > 0) {
          const full = await clientFetch(`/api/doubt/${data.thread.id}`);
          if (full?.ok && !cancelled) {
            const state = await full.json();
            setEdits(state.edits ?? []);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [target, conversationId]);

  const handleSend = useCallback(async (content) => {
    if (!thread || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setMessages(prev => [...prev, { id: `local-${Date.now()}`, role: "user", content }]);
    setStreamingText("");

    try {
      const res = await clientFetch("/api/doubt/message", {
        method: "POST",
        body:   JSON.stringify({ thread_id: thread.id, content }),
      });
      if (!res?.ok) {
        const err = await res?.json().catch(() => ({}));
        throw new Error(err?.error || "Couldn't send your doubt.");
      }

      let accumulated = "";
      let messageId   = null;
      for await (const event of parseSseStream(res)) {
        if (event.type === "token") {
          accumulated += event.text;
          setStreamingText(accumulated);
        } else if (event.type === "doubt_msg") {
          messageId = event.message_id;
        }
      }
      setMessages(prev => [...prev, {
        id:      messageId ?? `local-a-${Date.now()}`,
        role:    "assistant",
        content: accumulated,
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setStreamingText(null);
      setSending(false);
      sendingRef.current = false;
    }
  }, [thread]);

  const handleEditsChanged = useCallback((edit) => {
    setEdits(prev => {
      const rest = prev.filter(e => !(e.target_type === edit.target_type && e.target_key === edit.target_key));
      return edit.edited_content === null ? rest : [...rest, edit];
    });
  }, []);

  const panelMotion = isMobile
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          {...panelMotion}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: "fixed",
            zIndex: 200,
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--shadow-card)",
            ...(isMobile
              ? { left: 0, right: 0, bottom: 0, top: "10vh", borderTop: "1px solid var(--border-hairline)", borderRadius: "16px 16px 0 0" }
              : { top: 0, right: 0, bottom: 0, width: 420, maxWidth: "92vw", borderLeft: "1px solid var(--border-hairline)" }),
          }}
          role="dialog"
          aria-label="Doubt panel"
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px", borderBottom: "1px solid var(--border-hairline)", flexShrink: 0,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>Doubt</p>
            {thread && (
              <button
                onClick={() => router.push(`/doubt/${thread.id}`)}
                aria-label="Expand to full page"
                title="Expand to full page"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: 7, background: "none",
                  border: "1px solid var(--border-hairline)", color: "var(--text-tertiary)", cursor: "pointer",
                }}
              >
                <ExpandIcon />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close doubt panel"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 7, background: "none",
                border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 16, fontFamily: "inherit",
              }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          {loading || (!thread && !error) ? (
            <div style={{ padding: 20 }}>
              {[80, 100, 60].map((w, i) => (
                <div key={i} style={{
                  height: 12, width: `${w}%`, borderRadius: 6, marginBottom: 10,
                  background: "var(--bg-surface-2)",
                }} />
              ))}
            </div>
          ) : error && !thread ? (
            <p style={{ padding: 20, margin: 0, fontSize: 13, color: "var(--error)" }}>{error}</p>
          ) : (
            <DoubtThreadView
              thread={thread}
              messages={messages}
              edits={edits}
              streamingText={streamingText}
              sending={sending}
              error={error}
              onSend={handleSend}
              onEditsChanged={handleEditsChanged}
              compact
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
