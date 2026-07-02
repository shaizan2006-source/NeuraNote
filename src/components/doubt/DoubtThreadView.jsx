// src/components/doubt/DoubtThreadView.jsx
"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clientFetch } from "@/lib/clientFetch";

function PencilIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SendIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

const mdComponents = {
  p:  props => <p style={{ margin: "0 0 10px", lineHeight: 1.7 }} {...props} />,
  li: props => <li style={{ margin: "0 0 4px", lineHeight: 1.6 }} {...props} />,
  code: props => <code style={{ background: "var(--bg-surface-2)", padding: "1px 5px", borderRadius: 4, fontSize: "0.9em" }} {...props} />,
};

/**
 * Editable AI-authored text block. Overlays the user's saved edit (working
 * copy) when one exists; the original content is never modified. Shows an
 * "edited by you" tag with one-click revert.
 */
function EditableAnswer({ targetType, targetKey, original, edit, onEditsChanged, compact }) {
  const [editing, setEditing]  = useState(false);
  const [draft,   setDraft]    = useState("");
  const [busy,    setBusy]     = useState(false);
  const shown = edit?.edited_content ?? original;

  async function save() {
    if (!draft.trim() || draft.trim() === shown) { setEditing(false); return; }
    setBusy(true);
    const res = await clientFetch("/api/doubt/edit", {
      method: "POST",
      body:   JSON.stringify({ target_type: targetType, target_key: targetKey, edited_content: draft.trim() }),
    });
    setBusy(false);
    setEditing(false);
    if (res?.ok) onEditsChanged?.({ target_type: targetType, target_key: targetKey, edited_content: draft.trim() });
  }

  async function revert() {
    setBusy(true);
    const res = await clientFetch("/api/doubt/edit", {
      method: "DELETE",
      body:   JSON.stringify({ target_type: targetType, target_key: targetKey }),
    });
    setBusy(false);
    if (res?.ok) onEditsChanged?.({ target_type: targetType, target_key: targetKey, edited_content: null });
  }

  if (editing) {
    return (
      <div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9,
            background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)",
            color: "var(--text-primary)", fontSize: 13, lineHeight: 1.7, outline: "none",
            resize: "vertical", fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={save} disabled={busy}
            style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} disabled={busy}
            style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: compact ? 13 : 14, color: "var(--text-secondary)" }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{shown}</ReactMarkdown>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
        {edit?.edited_content && (
          <>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontStyle: "italic" }}>edited by you</span>
            <button onClick={revert} disabled={busy}
              style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>
              revert to original
            </button>
          </>
        )}
        <button
          onClick={() => { setDraft(shown); setEditing(true); }}
          aria-label="Edit this answer (your copy only)"
          title="Edit this answer — your copy only, the original is kept"
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
            color: "var(--text-tertiary)", fontSize: 11, cursor: "pointer", padding: 0, fontFamily: "inherit",
          }}
        >
          <PencilIcon /> edit
        </button>
      </div>
    </div>
  );
}

/**
 * Shared doubt-thread renderer — used by the sidebar and the full page.
 * Props:
 *   thread        {id, parent_key, original_question, original_answer, suggested_doubts}
 *   messages      [{id, role, content}]  (settled thread messages)
 *   edits         [{target_type, target_key, edited_content}]
 *   streamingText string|null            (assistant reply currently streaming)
 *   sending       bool
 *   error         string|null
 *   onSend        (content) => void
 *   onEditsChanged(edit) => void         (edit upserted or reverted)
 *   compact       bool                   (sidebar sizing)
 */
export default function DoubtThreadView({
  thread, messages, edits, streamingText, sending, error, onSend, onEditsChanged, compact = false,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamingText]);

  if (!thread) return null;

  const editFor = (type, key) =>
    edits.find(e => e.target_type === type && e.target_key === key) ?? null;

  function submit(text) {
    const q = (text ?? input).trim();
    if (!q || sending) return;
    setInput("");
    onSend(q);
  }

  const showSuggestions = messages.length === 0 && !streamingText &&
    Array.isArray(thread.suggested_doubts) && thread.suggested_doubts.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: compact ? "14px 16px" : "20px 0", minHeight: 0 }}>
        {/* Original question — visible context, not re-submitted */}
        <div style={{
          padding: "10px 14px", borderRadius: 10, marginBottom: 12,
          background: "var(--bg-surface-2)", borderLeft: "2px solid var(--border-strong)",
        }}>
          <p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            You asked
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {thread.original_question}
          </p>
        </div>

        {/* Original answer — editable working copy */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Sage answered
          </p>
          <EditableAnswer
            targetType="main_answer"
            targetKey={thread.parent_key}
            original={thread.original_answer}
            edit={editFor("main_answer", thread.parent_key)}
            onEditsChanged={onEditsChanged}
            compact={compact}
          />
        </div>

        {/* Suggested doubt cards — until the first doubt is asked */}
        {showSuggestions && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {thread.suggested_doubts.map((d, i) => (
              <button
                key={i}
                onClick={() => submit(d.prompt)}
                disabled={sending}
                style={{
                  textAlign: "left", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)",
                  color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5, fontFamily: "inherit",
                  transition: "border-color 0.15s, transform 0.15s ease-out",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-hairline)"; e.currentTarget.style.transform = "none"; }}
              >
                <span style={{ color: "var(--text-primary)", fontWeight: 600, display: "block", marginBottom: 2 }}>{d.label}</span>
                {d.prompt}
              </button>
            ))}
          </div>
        )}

        {/* Thread messages */}
        {messages.map(m => (
          m.role === "user" ? (
            <div key={m.id} style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
              <div style={{
                maxWidth: "85%", padding: "8px 14px", borderRadius: 14,
                background: "var(--bg-surface-2)", color: "var(--text-primary)",
                fontSize: 13, lineHeight: 1.6,
              }}>
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} style={{ margin: "10px 0" }}>
              <EditableAnswer
                targetType="doubt_message"
                targetKey={m.id}
                original={m.content}
                edit={editFor("doubt_message", m.id)}
                onEditsChanged={onEditsChanged}
                compact={compact}
              />
            </div>
          )
        ))}

        {/* Streaming reply */}
        {streamingText !== null && streamingText !== undefined && (
          <div style={{ margin: "10px 0", fontSize: compact ? 13 : 14, color: "var(--text-secondary)" }}>
            {streamingText === ""
              ? <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Thinking…</span>
              : <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{streamingText}</ReactMarkdown>}
          </div>
        )}

        {error && <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--error)" }}>{error}</p>}
        <div ref={bottomRef} style={{ height: 0 }} />
      </div>

      {/* Input */}
      <div style={{ padding: compact ? "10px 16px 14px" : "10px 0 0", flexShrink: 0, borderTop: "1px solid var(--border-hairline)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)",
          borderRadius: 12, padding: "4px 6px 4px 14px", marginTop: compact ? 0 : 10,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Ask your doubt"
            disabled={sending}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--text-primary)", fontSize: 13, padding: "8px 0", fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => submit()}
            disabled={sending || !input.trim()}
            aria-label="Send doubt"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 9, border: "none", cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              background: input.trim() && !sending ? "var(--accent-grad)" : "var(--bg-inset)",
              color: input.trim() && !sending ? "var(--bg-base)" : "var(--text-tertiary)",
              transition: "background 0.15s",
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
