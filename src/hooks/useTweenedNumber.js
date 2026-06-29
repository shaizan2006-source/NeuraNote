"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform } from "framer-motion";

/**
 * Smoothly tween a number from its previous value to the new one.
 * On first render, anchors at `value` (no animation).
 * On every subsequent render where `value` changes, animates from the
 * previous value (NOT from 0) over `duration` seconds.
 *
 * Returns a MotionValue<string|number>. Render with <motion.span>{display}</motion.span>.
 *
 * Honors prefers-reduced-motion: snaps to the new value instantly when set.
 */
export function useTweenedNumber(value, opts = {}) {
  const {
    duration = 0.9,
    format = (v) => Math.round(v).toLocaleString("en-IN"),
  } = opts;

  const mv = useMotionValue(typeof value === "number" ? value : 0);
  const display = useTransform(mv, format);
  const prevValue = useRef(typeof value === "number" ? value : 0);

  useEffect(() => {
    if (typeof value !== "number" || Number.isNaN(value)) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      mv.set(value);
      prevValue.current = value;
      return;
    }

    const ctrl = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    prevValue.current = value;
    return () => ctrl.stop();
  }, [value, duration, mv]);

  return display;
}
