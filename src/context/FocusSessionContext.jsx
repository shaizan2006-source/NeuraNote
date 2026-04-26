'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FocusSessionContext = createContext(null);

/**
 * FocusSessionProvider manages:
 * - Session ID (unique per focus session)
 * - Chat history (persisted to sessionStorage)
 * - Session lifecycle (clear on exit)
 *
 * Chat persists across page refreshes but clears when focus session ends.
 */
export function FocusSessionProvider({ children, sessionId: providedSessionId }) {
  const [sessionId, setSessionId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Initialize session ID once on mount
  useEffect(() => {
    if (providedSessionId) {
      setSessionId(providedSessionId);
      setHydrated(true);
    }
  }, [providedSessionId]);

  // Get persisted chat for this session
  const getChatMessages = useCallback(() => {
    if (!sessionId) return [];
    try {
      const key = `focusChat_${sessionId}`;
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [sessionId]);

  // Save chat to sessionStorage
  const setChatMessages = useCallback((messages) => {
    if (!sessionId) return;
    try {
      const key = `focusChat_${sessionId}`;
      sessionStorage.setItem(key, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to persist chat:', err);
    }
  }, [sessionId]);

  // Clear session data on exit
  const clearSession = useCallback(() => {
    if (!sessionId) return;
    try {
      const key = `focusChat_${sessionId}`;
      sessionStorage.removeItem(key);
      setSessionId(null);
    } catch {}
  }, [sessionId]);

  return (
    <FocusSessionContext.Provider value={{
      sessionId,
      getChatMessages,
      setChatMessages,
      clearSession,
    }}>
      {children}
    </FocusSessionContext.Provider>
  );
}

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext);
  if (!ctx) throw new Error('useFocusSession must be inside FocusSessionProvider');
  return ctx;
}
