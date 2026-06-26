"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns { style, isPulsing } where style flashes a 1.2s purple→cyan box-shadow
 * each time `key` changes. `key` should be a value that flips when the data
 * underlying the component updates (e.g. `data.streak + ":" + data.lastActiveDate`).
 *
 * Skips the first render so cards don't pulse on initial mount.
 * Honors prefers-reduced-motion (returns no shadow).
 */
export function useChangePulse(key, opts = {}) {
  const { duration = 1200 } = opts;
  const firstRender = useRef(true);
  const prevKey = useRef(key);
  const [pulsing, setPulsing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      prevKey.current = key;
      return;
    }
    if (prevKey.current === key) return;
    prevKey.current = key;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    setPulsing(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPulsing(false), duration);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [key, duration]);

  const style = pulsing
    ? {
        boxShadow:
          "0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent), 0 0 28px 4px var(--accent-glow-soft)",
        transition: `box-shadow ${duration}ms ease-out`,
      }
    : { boxShadow: "none", transition: `box-shadow ${duration}ms ease-out` };

  return { style, isPulsing: pulsing };
}
