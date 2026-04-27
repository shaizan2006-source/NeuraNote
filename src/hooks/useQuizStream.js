'use client';
import { useState, useRef, useCallback } from 'react';

// First 3 questions reveal fast to maximize perceived responsiveness
const REVEAL_DELAY_MS = (index) => (index < 3 ? 350 : 800);

function makePlaceholder(i) {
  return { id: `ph-${i}`, _status: 'loading', text: '', marks: 0, hints: [], sourceSnippet: '', documentReference: '' };
}

export function useQuizStream() {
  const [questions, setQuestions] = useState([]);
  const [status, setStatus] = useState('idle');
  // status: 'idle' | 'fetching' | 'revealing' | 'complete' | 'error'

  const timerRef = useRef(null);
  const revealIndexRef = useRef(0);

  const _clear = () => clearTimeout(timerRef.current);

  // Call immediately when user selects PDF — renders placeholders instantly
  const initStream = useCallback((count) => {
    _clear();
    revealIndexRef.current = 0;
    setStatus('fetching');
    setQuestions(Array.from({ length: count }, (_, i) => makePlaceholder(i)));
  }, []);

  // Call when API returns — progressively replaces placeholders with real questions
  const revealStream = useCallback((fetchedQuestions) => {
    _clear();
    revealIndexRef.current = 0;
    setStatus('revealing');
    setQuestions(Array.from({ length: fetchedQuestions.length }, (_, i) => makePlaceholder(i)));

    const revealNext = () => {
      const idx = revealIndexRef.current;
      if (idx >= fetchedQuestions.length) {
        setStatus('complete');
        return;
      }
      setQuestions((prev) => {
        const next = [...prev];
        next[idx] = { ...fetchedQuestions[idx], _status: 'ready' };
        return next;
      });
      revealIndexRef.current = idx + 1;
      timerRef.current = setTimeout(revealNext, REVEAL_DELAY_MS(idx));
    };

    revealNext();
  }, []);

  // Call on fetch failure — marks all remaining slots as error
  const failStream = useCallback(() => {
    _clear();
    setStatus('error');
    setQuestions((prev) => prev.map((q) => ({ ...q, _status: 'error' })));
  }, []);

  // Call when resuming from saved session — all questions are already ready
  const restoreStream = useCallback((savedQuestions) => {
    _clear();
    setStatus('complete');
    setQuestions(savedQuestions.map((q) => ({ ...q, _status: q._status ?? 'ready' })));
  }, []);

  // Call on unmount to cancel pending reveal timers
  const cleanup = useCallback(() => {
    _clear();
    revealIndexRef.current = 0;
  }, []);

  return {
    questions,
    streamStatus: status,
    readyCount: questions.filter((q) => q._status === 'ready').length,
    initStream,
    revealStream,
    failStream,
    restoreStream,
    cleanup,
  };
}
