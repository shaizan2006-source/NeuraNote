'use client';

import { useState, useRef, useEffect } from 'react';
import { useFocusSession } from '@/context/FocusSessionContext';

/**
 * useFocusSessionChat: Chat hook with session persistence
 *
 * - Restores messages from sessionStorage on mount
 * - Prevents duplicate hydration
 * - Saves messages to sessionStorage after each send
 * - Same API as useChatMessages but with persistence
 */
export function useFocusSessionChat({ userId, documentId } = {}) {
  const { getChatMessages, setChatMessages } = useFocusSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const loadingRef = useRef(false);
  const hydratedRef = useRef(false);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Restore messages from sessionStorage on mount (once)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const stored = getChatMessages();
    if (stored && stored.length > 0) {
      setMessages(stored);
      // Extract conversation ID from stored messages if available
      const lastMessage = stored[stored.length - 1];
      if (lastMessage.conversationId) {
        setConversationId(lastMessage.conversationId);
      }
    }
    setHydrated(true);
  }, [getChatMessages]);

  async function sendMessage(text) {
    const q = (text ?? input).trim();
    if (!q || loadingRef.current) return;
    setInput('');
    setLoading(true);

    const newMessages = [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user', content: q, timestamp: Date.now() },
      { id: `assistant-${Date.now()}`, role: 'assistant', content: '', streaming: true, timestamp: Date.now() },
    ];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/quick-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          user_id: userId,
          document_id: documentId || null,
          conversation_id: conversationId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const sep = raw.indexOf('\n__CONV__');
        const visible = sep !== -1 ? raw.slice(0, sep) : raw;
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: visible, streaming: true };
          return msgs;
        });
      }

      // Parse conversation ID if provided
      const sep = raw.indexOf('\n__CONV__');
      if (sep !== -1) {
        try {
          const meta = JSON.parse(raw.slice(sep + 9));
          if (meta.conversation_id) setConversationId(meta.conversation_id);
        } catch {}
      }

      // Mark message as complete
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], streaming: false };
        return msgs;
      });
    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: 'Something went wrong. Please try again.',
          streaming: false,
        };
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  }

  // Persist messages after each update
  useEffect(() => {
    if (hydrated && messages.length > 0) {
      // Include conversationId in each message for recovery
      const messagesToSave = messages.map(m => ({
        ...m,
        conversationId: conversationId || undefined,
      }));
      setChatMessages(messagesToSave);
    }
  }, [messages, conversationId, hydrated, setChatMessages]);

  return { messages, setMessages, input, setInput, loading, conversationId, setConversationId, sendMessage, hydrated };
}
