// src/components/AIDust/useIdleDetection.ts

'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIdleDetectionOptions {
  timeout?: number;
  enabled?: boolean;
  onIdleStart?: () => void;
  onIdleEnd?: () => void;
}

export function useIdleDetection({
  timeout = 5000,
  enabled = true,
  onIdleStart,
  onIdleEnd,
}: UseIdleDetectionOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setIsIdle(false);
      isIdleRef.current = false;
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (isIdleRef.current) {
        isIdleRef.current = false;
        setIsIdle(false);
        onIdleEnd?.();
      }

      timerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        setIsIdle(true);
        onIdleStart?.();
      }, timeout);
    };

    const events = [
      'mousemove', 'keydown', 'scroll',
      'click', 'touchstart', 'touchmove',
    ] as const;

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [timeout, enabled, onIdleStart, onIdleEnd]);

  return isIdle;
}
