'use client';
import { useState, useRef, useEffect } from 'react';

/**
 * Shared streaming chat hook used by both QuickChatDrawer and FocusInlineChat.
 * Owns messages, input, loading and conversationId state.
 * Streams token-by-token from /api/quick-chat.
 */
export function useChatMessages({ userId, documentId } = {}) {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const loadingRef = useRef(false);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  async function sendMessage(text) {
    const q = (text ?? input).trim();
    if (!q || loadingRef.current) return;
    setInput('');
    setLoading(true);

    setMessages(prev => [
      ...prev,
      { role: 'user',      content: q },
      { role: 'assistant', content: '', streaming: true },
    ]);

    try {
      const res = await fetch('/api/quick-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:        q,
          user_id:         userId,
          document_id:     documentId || null,
          conversation_id: conversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const sep     = raw.indexOf('\n__CONV__');
        const visible = sep !== -1 ? raw.slice(0, sep) : raw;
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: 'assistant', content: visible, streaming: true };
          return msgs;
        });
      }

      // Parse conversation id appended after stream
      const sep = raw.indexOf('\n__CONV__');
      if (sep !== -1) {
        try {
          const meta = JSON.parse(raw.slice(sep + 9));
          if (meta.conversation_id) setConversationId(meta.conversation_id);
        } catch {}
      }

      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false };
        return msgs;
      });
    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          streaming: false,
        };
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  }

  return { messages, setMessages, input, setInput, loading, conversationId, setConversationId, sendMessage };
}
