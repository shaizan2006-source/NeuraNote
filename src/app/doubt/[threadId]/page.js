// src/app/doubt/[threadId]/page.js — full-page view of a doubt thread.
// Same thread id, same APIs as the sidebar; only the shell differs.
"use client";
import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FLAGS } from "@/lib/featureFlags";
import { clientFetch } from "@/lib/clientFetch";
import { parseSseStream } from "@/lib/sseParser";
import DoubtThreadView from "@/components/doubt/DoubtThreadView";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function DoubtFullPage({ params }) {
  const { threadId } = use(params);
  const router = useRouter();

  const [thread,        setThread]        = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [edits,         setEdits]         = useState([]);
  const [streamingText, setStreamingText] = useState(null);
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState(null);
  const [notFound,      setNotFound]      = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (!FLAGS.DOUBT_SIDEBAR) { router.push("/sage"); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const res = await clientFetch(`/api/doubt/${threadId}`);
      if (!res?.ok) { setNotFound(true); return; }
      const data = await res.json();
      setThread(data.thread);
      setMessages(data.messages ?? []);
      setEdits(data.edits ?? []);
    });
  }, [threadId, router]);

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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 24px", borderBottom: "1px solid var(--border-hairline)", flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
        >
          ← Back
        </button>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Doubt</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 760, padding: "0 24px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {notFound ? (
            <p style={{ marginTop: 40, fontSize: 14, color: "var(--text-tertiary)", textAlign: "center" }}>
              This doubt thread doesn&apos;t exist or isn&apos;t yours.
            </p>
          ) : !thread ? (
            <div style={{ marginTop: 40 }}>
              {[70, 100, 85].map((w, i) => (
                <div key={i} style={{ height: 12, width: `${w}%`, borderRadius: 6, marginBottom: 10, background: "var(--bg-surface-2)" }} />
              ))}
            </div>
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
