'use client';
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { useFocusSessionChat } from '@/lib/useFocusSessionChat';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import QuickChatVortex from '../QuickChat/QuickChatVortex';

const CHAT_CSS = `
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
.fic-messages pre  { overflow-x: auto; max-width: 100%; white-space: pre; }
.fic-messages code { white-space: pre-wrap; word-break: break-word; }
.fic-messages pre code { white-space: pre; word-break: normal; }
.fic-answer-body {
  transition: max-height 0.3s ease;
  overflow: hidden;
}
.fic-answer-body.compressed {
  max-height: 140px;
}
.fic-answer-body.expanded {
  max-height: 3000px;
}
.fic-fade {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 48px;
  background: linear-gradient(to bottom, transparent, #0f0f12);
  pointer-events: none;
  border-radius: 0 0 6px 6px;
}
`;

function BlinkingCursor() {
  return (
    <span style={{
      display: 'inline-block', width: 2, height: '1em',
      background: '#22D3EE', marginLeft: 2, verticalAlign: 'text-bottom',
      animation: 'blink 1s step-end infinite',
    }} />
  );
}


function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
      <div style={{
        background: 'rgba(139,92,246,0.12)', color: '#c4b5fd',
        borderRadius: 8, padding: '7px 10px', maxWidth: '85%',
        fontSize: TYPOGRAPHY.sizes.caption, lineHeight: 1.55, wordBreak: 'break-word',
        overflowWrap: 'anywhere', whiteSpace: 'pre-wrap',
      }}>{text}</div>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5V1H5M7 1H11V5M11 7V11H7M5 11H1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 1V4H1M8 1V4H11M11 8H8V11M4 11V8H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AIBubble({ messageId, text, isStreaming = false, isExpanded, onToggle, panelBg }) {
  const isDone = !isStreaming && !!text;
  const showToggle = isDone;

  return (
    <div style={{
      borderLeft: '2px solid rgba(34,211,238,0.35)',
      borderRadius: '0 8px 8px 0',
      background: 'rgba(34,211,238,0.03)',
      minWidth: 0,
      position: 'relative',
    }}>
      {/* Expand/Compress button — top-right, only after response is complete */}
      {showToggle && (
        <button
          onClick={() => onToggle(messageId)}
          title={isExpanded ? 'Compress' : 'Expand'}
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            color: '#52525b',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20,
            transition: 'color 0.15s, background 0.15s',
            flexShrink: 0,
            zIndex: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#22D3EE';
            e.currentTarget.style.background = 'rgba(34,211,238,0.08)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#52525b';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
        >
          {isExpanded ? <CompressIcon /> : <ExpandIcon />}
        </button>
      )}

      {/* Content */}
      <div
        className={`fic-answer-body ${isDone ? (isExpanded ? 'expanded' : 'compressed') : 'expanded'}`}
        style={{
          padding: '7px 30px 7px 10px',
          fontSize: TYPOGRAPHY.sizes.caption, color: '#a1a1aa', lineHeight: 1.6,
          minHeight: 24,
          overflowX: 'hidden', wordBreak: 'break-word',
          overflowWrap: 'anywhere', whiteSpace: 'pre-wrap',
        }}
      >
        {!text && isStreaming
          ? <QuickChatVortex />
          : <>{text}{isStreaming && <BlinkingCursor />}</>
        }
      </div>

      {/* Fade overlay — only when compressed and content might overflow */}
      {isDone && !isExpanded && (
        <div className="fic-fade" style={{ background: `linear-gradient(to bottom, transparent, ${panelBg})` }} />
      )}
    </div>
  );
}

export default function FocusInlineChat({
  userId,
  documentId,
  documentName,
  initialInput,
  onClose,
  isMobile = false,
}) {
  const { messages, input, setInput, loading, sendMessage, hydrated } = useFocusSessionChat({ userId, documentId });
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const appliedInitialRef = useRef('');

  // expandedIds: Set of message IDs that are currently expanded
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const prevMsgCountRef = useRef(0);

  // ── Auto-compression: when messages length changes, auto-manage expansion ──
  useEffect(() => {
    const prev = prevMsgCountRef.current;
    const curr = messages.length;
    prevMsgCountRef.current = curr;

    if (curr <= prev) return; // message deleted or same — skip

    // Find the last completed assistant message
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return;

    setExpandedIds(prevSet => {
      const next = new Set(prevSet);

      // Compress all other assistant messages
      messages.forEach(m => {
        if (m.role === 'assistant' && m.id !== lastAssistant.id) {
          next.delete(m.id);
        }
      });

      // Expand the latest assistant message
      next.add(lastAssistant.id);
      return next;
    });
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expand completion: when a streaming message finishes, ensure it stays expanded ──
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && !lastMsg.streaming && lastMsg.content) {
      setExpandedIds(prev => {
        if (prev.has(lastMsg.id)) return prev;
        const next = new Set(prev);
        next.add(lastMsg.id);
        return next;
      });
    }
  }, [messages]);

  const toggleExpand = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Pre-fill input when initialInput arrives (once per unique value)
  useEffect(() => {
    if (initialInput && initialInput !== appliedInitialRef.current) {
      appliedInitialRef.current = initialInput;
      setInput(initialInput);
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 80);
    }
  }, [initialInput, setInput]);

  // Auto-resize textarea
  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const h = el.scrollHeight;
    el.style.height = Math.min(h, 120) + 'px';
    el.style.overflowY = h > 120 ? 'auto' : 'hidden';
  };
  useLayoutEffect(() => { resizeInput(); }, [input]);

  // Auto-scroll messages container (NOT window) on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const panelStyle = {
    height: '100vh',
    width: isMobile ? '100%' : 'clamp(320px, 40vw, 600px)',
    background: isMobile
      ? `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`
      : '#0f0f12',
    borderLeft: isMobile ? 'none' : `1px solid ${COLORS.border.light}`,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    fontFamily: TYPOGRAPHY.fontFamily,
  };

  return (
    <>
      <style>{CHAT_CSS}</style>
      <div style={panelStyle}>
        {/* Header */}
        <div style={{
          padding: `${SPACING.md} ${SPACING.lg}`,
          borderBottom: `1px solid ${COLORS.border.light}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'rgba(34,211,238,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 14 }}>✦</span>
            <span style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: 600, color: '#f4f4f5', whiteSpace: 'nowrap' }}>
              Ask AI
            </span>
            {documentName && (
              <span style={{
                fontSize: TYPOGRAPHY.sizes.small, color: '#22D3EE',
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.2)',
                borderRadius: RADIUS.sm, padding: `${SPACING.xs} ${SPACING.sm}`,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={documentName}
              >{documentName}</span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close AI assistant"
            style={{
              background: 'transparent', border: 'none',
              color: '#52525b', cursor: 'pointer', fontSize: 16,
              padding: `${SPACING.sm}`, borderRadius: RADIUS.sm,
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
            onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
          >✕</button>
        </div>

        {/* Messages */}
        {hydrated && (
          <div
            ref={messagesContainerRef}
            className="fic-messages"
            style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden',
              padding: `${SPACING.lg}`, display: 'flex', flexDirection: 'column', gap: 10,
              minWidth: 0, minHeight: 0,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <div style={{ fontSize: 28, marginBottom: SPACING.md }}>✦</div>
                <p style={{ color: '#3f3f46', fontSize: TYPOGRAPHY.sizes.caption, lineHeight: 1.6 }}>
                  Ask anything about your<br />current task or material
                </p>
              </div>
            )}
            {messages.map((m) => (
              m.role === 'user'
                ? <UserBubble key={m.id} text={m.content} />
                : (
                  <AIBubble
                    key={m.id}
                    messageId={m.id}
                    text={m.content}
                    isStreaming={!!m.streaming}
                    isExpanded={expandedIds.has(m.id)}
                    onToggle={toggleExpand}
                    panelBg={isMobile ? COLORS.bg.dark : '#0f0f12'}
                  />
                )
            ))}
            <div style={{ flexShrink: 0, height: 1 }} />
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: `${SPACING.lg}`,
          borderTop: `1px solid ${COLORS.border.light}`,
          display: 'flex', flexDirection: 'column', gap: SPACING.md,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: SPACING.md, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); resizeInput(); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Ask about this task… (Shift+Enter for new line)"
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.08)`,
                borderRadius: RADIUS.sm, padding: `${SPACING.md} ${SPACING.lg}`,
                fontSize: TYPOGRAPHY.sizes.caption, color: '#e4e4e7',
                outline: 'none', resize: 'none',
                overflowY: 'hidden', lineHeight: 1.5,
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.3)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              style={{
                width: 36, height: 36, flexShrink: 0,
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                border: 'none', borderRadius: RADIUS.sm,
                color: '#fff', fontSize: TYPOGRAPHY.sizes.label,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: loading || !input.trim() ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >↑</button>
          </div>
          <p style={{ margin: 0, fontSize: TYPOGRAPHY.sizes.small, color: '#3f3f46', textAlign: 'right' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
