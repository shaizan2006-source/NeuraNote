"use client";
import { useEffect, useState, useRef } from "react";

export function useIdleDetection({ softIdleMs = 90_000, hardIdleMs = 300_000 } = {}) {
  const [softIdle, setSoftIdle] = useState(false);
  const [hardIdle, setHardIdle] = useState(false);
  const softTimer = useRef(null);
  const hardTimer = useRef(null);

  function reset() {
    setSoftIdle(false);
    setHardIdle(false);
    clearTimeout(softTimer.current);
    clearTimeout(hardTimer.current);
    softTimer.current = setTimeout(() => setSoftIdle(true), softIdleMs);
    hardTimer.current = setTimeout(() => setHardIdle(true), hardIdleMs);
  }

  useEffect(() => {
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(softTimer.current);
      clearTimeout(hardTimer.current);
    };
  }, []);

  function dismiss() {
    setSoftIdle(false);
    setHardIdle(false);
    reset();
  }

  return { softIdle, hardIdle, dismiss };
}
