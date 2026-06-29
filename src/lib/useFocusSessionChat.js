'use client';

import { useState, useRef, useEffect } from 'react';
import { useFocusSession } from '@/context/FocusSessionContext';
import { parseSseStream } from '@/lib/sseParser';
import { clientFetch } from '@/lib/clientFetch';

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
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: accumulated, streaming: true };
            return msgs;
          });
        } else if (event.type === 'conv' && event.conversation_id) {
          setConversationId(event.conversation_id);
        }
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
