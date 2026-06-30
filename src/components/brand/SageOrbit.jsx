"use client";

/**
 * SageOrbit — the empty-Sage hero. Our logo (SageMark) given a continuous 3D
 * Framer-Motion float, sitting at the centre of a tilted constellation that
 * revolves around it (Saturn-ring style). Replaces the old glowing bulb.
 *
 * framer-motion only, tokens only. All motion is disabled under
 * prefers-reduced-motion (renders a still constellation + still logo).
 */

import { motion, useReducedMotion } from "framer-motion";
import SageMark from "./SageMark";

// One entry per orbit ring: radius (px), star count, seconds/rev, direction, star px.
const ORBITS = [
  { r: 80,  count: 3, dur: 24, dir: 1,  star: 3.5 },
  { r: 108, count: 4, dur: 34, dir: -1, star: 2.5 },
  { r: 138, count: 2, dur: 48, dir: 1,  star: 4   },
];

export default function SageOrbit({ box = 300, logo = 120 }) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      style={{
        position:       "relative",
        width:          box,
        height:         box,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        perspective:    900,
      }}
    >
      {/* soft anchor glow behind the whole system */}
      <div style={{
        position:      "absolute",
        inset:         "18%",
        borderRadius:  "50%",
        background:    "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Tilted orbital plane — gives the rings their 3D, foreshortened ellipse */}
      <motion.div
        style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}
        initial={{ rotateX: 64 }}
        animate={reduced ? { rotateX: 64 } : { rotateX: [62, 66, 62] }}
        transition={reduced ? undefined : { duration: 20, repeat: Infinity, ease: "easeInOut" }}
      >
        {ORBITS.map((o, oi) => (
          <motion.div
            key={oi}
            style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}
            animate={reduced ? undefined : { rotate: 360 * o.dir }}
            transition={reduced ? undefined : { duration: o.dur, repeat: Infinity, ease: "linear" }}
          >
            {/* faint orbit path */}
            <div style={{
              position:     "absolute",
              left:         "50%",
              top:          "50%",
              width:        o.r * 2,
              height:       o.r * 2,
              marginLeft:   -o.r,
              marginTop:    -o.r,
              borderRadius: "50%",
              border:       "1px solid color-mix(in srgb, var(--accent) 9%, transparent)",
            }} />

            {/* stars riding this ring */}
            {Array.from({ length: o.count }).map((_, si) => {
              const angle = (si / o.count) * 2 * Math.PI;
              const x = Math.cos(angle) * o.r;
              const y = Math.sin(angle) * o.r;
              const gold = si % 2 === 0;
              return (
                <span
                  key={si}
                  style={{
                    position:     "absolute",
                    left:         "50%",
                    top:          "50%",
                    width:        o.star,
                    height:       o.star,
                    marginLeft:   -o.star / 2,
                    marginTop:    -o.star / 2,
                    transform:    `translate(${x}px, ${y}px)`,
                    borderRadius: "50%",
                    background:   gold ? "var(--accent)" : "var(--text-primary)",
                    boxShadow:    `0 0 ${o.star * 2.5}px color-mix(in srgb, var(--accent) ${gold ? 75 : 45}%, transparent)`,
                  }}
                />
              );
            })}
          </motion.div>
        ))}
      </motion.div>

      {/* Centre logo — floats in 3D above the orbital plane, always facing the viewer */}
      <motion.div
        style={{ position: "relative", zIndex: 2 }}
        animate={reduced ? undefined : { rotateY: [-10, 10, -10], rotateX: [4, -4, 4], y: [0, -6, 0] }}
        transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <SageMark size={logo} />
      </motion.div>
    </div>
  );
}
