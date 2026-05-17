"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Anchored particle ring for milestone moments.
 * Imperative API: ref.emit({ x, y, label? })
 *
 *  - 24 small purple+cyan particles in a ring, 700ms fade.
 *  - Throttled to 1 emission per 30s to avoid noise.
 *  - Skipped under prefers-reduced-motion.
 *  - Fixed-position overlay so it doesn't affect layout.
 */
const PARTICLE_COUNT = 24;
const COLORS = ["#8B5CF6", "#22D3EE", "#A78BFA"];
const THROTTLE_MS = 30_000;

const Celebration = forwardRef(function Celebration(_props, ref) {
  const [bursts, setBursts] = useState([]); // [{ id, x, y, label }]
  const lastEmitRef = useRef(0);

  const emit = useCallback((opts = {}) => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const now = Date.now();
    if (now - lastEmitRef.current < THROTTLE_MS) return;
    lastEmitRef.current = now;

    const { x = window.innerWidth / 2, y = window.innerHeight / 2, label } = opts;
    const id = now + Math.random();
    setBursts((b) => [...b, { id, x, y, label }]);
    setTimeout(() => setBursts((b) => b.filter((p) => p.id !== id)), 1100);
  }, []);

  useImperativeHandle(ref, () => ({ emit }), [emit]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", left: b.x, top: b.y }}
          >
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
              const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
              const dist  = 60 + (i % 3) * 12;
              const dx    = Math.cos(angle) * dist;
              const dy    = Math.sin(angle) * dist;
              const color = COLORS[i % COLORS.length];
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: dx, y: dy, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: "absolute",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 12px ${color}`,
                  }}
                />
              );
            })}
            {b.label && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.9 }}
                animate={{ opacity: [0, 1, 1, 0], y: -28, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  transform: "translate(-50%, -50%)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#f4f4f5",
                  letterSpacing: 0.4,
                  textShadow: "0 0 12px rgba(139,92,246,0.6)",
                  whiteSpace: "nowrap",
                }}
              >
                {b.label}
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

export default Celebration;
