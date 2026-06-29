'use client';
import { useState, useRef, useEffect } from 'react';
import { parseSseStream } from '@/lib/sseParser';
import { clientFetch } from '@/lib/clientFetch';

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
      const res = await clientFetch('/api/quick-chat', {
        method: 'POST',
        body: JSON.stringify({
          question:        q,
          document_id:     documentId || null,
          conversation_id: conversationId,
        }),
      });

      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({})) ?? {};
        throw new Error(err.error || 'Request failed');
      }

      let accumulated = '';

      for await (const event of parseSseStream(res)) {
        if (event.type === 'token') {
          accumulated += event.text;
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
            return msgs;
          });
        } else if (event.type === 'conv' && event.conversation_id) {
          setConversationId(event.conversation_id);
        }
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
