"use client";

/**
 * SageMark — the animated 2D hero mark for a new Sage chat (master prompt §8).
 *
 * Idle "breathing" (scale 1↔1.02) + gold-spark shimmer + cursor-parallax tilt
 * (±6° max). framer-motion only, no WebGL. Breathing/tilt disabled under
 * prefers-reduced-motion; tilt also disabled on touch (coarse pointer).
 */

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { MARK } from "./Logo";

const MAX_TILT = 6; // degrees

export default function SageMark({ size = 140 }) {
  const reducedMotion = useReducedMotion();
  const [tiltEnabled, setTiltEnabled] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 120, damping: 18 });
  const springY = useSpring(rotateY, { stiffness: 120, damping: 18 });

  useEffect(() => {
    if (reducedMotion) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;
    setTiltEnabled(true);

    const onMove = (e) => {
      // Normalized viewport position → ±MAX_TILT, centered on screen middle
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      rotateY.set(nx * 2 * MAX_TILT);
      rotateX.set(-ny * 2 * MAX_TILT);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      rotateX.set(0);
      rotateY.set(0);
    };
  }, [reducedMotion, rotateX, rotateY]);

  return (
    <div style={{ perspective: 600, display: "inline-block" }} aria-hidden="true">
      <motion.div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "var(--text-primary)",
          rotateX: tiltEnabled ? springX : 0,
          rotateY: tiltEnabled ? springY : 0,
        }}
        animate={reducedMotion ? undefined : { scale: [1, 1.02, 1] }}
        transition={reducedMotion ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Ambient gold halo — the only glow on the surface */}
        <div
          style={{
            position: "absolute",
            inset: "-18%",
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <svg width={size} height={size} viewBox={MARK.viewBox} fill="none" style={{ position: "relative" }}>
          <path d={MARK.page} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={MARK.fold} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={MARK.peak} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <motion.circle
            cx={MARK.spark.cx}
            cy={MARK.spark.cy}
            r={MARK.spark.r}
            fill="var(--accent)"
            animate={reducedMotion ? undefined : { opacity: [0.6, 1, 0.6] }}
            transition={reducedMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
