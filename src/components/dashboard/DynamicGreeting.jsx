"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GREETINGS = [
  "Low-key fact: Asking is the fastest way to understand.",
  "Not saying you're confused… but this is the place to fix it.",
  "Early signs of understanding detected. Continue with a question.",
  "Respectfully, clarity starts when you type something.",
  "Minimal effort required: one question.",
  "System status: Ready. Awaiting intellectual input.",
  "Observation: Clarity improves immediately after a question is asked.",
  "Analysis pending. Missing input: your doubt.",
  "Academic fact: Most confusion disappears once expressed clearly.",
  "Statistically, this is where things start making sense.",
  "Execution paused. Missing variable: your doubt.",
  "Data suggests you're one question away from clarity.",
  "Understanding is one input away.",
  "Minimal input. Maximum clarity.",
];

export default function DynamicGreeting({ isEmptyChat }) {
  const [current, setCurrent] = useState(GREETINGS[0]);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    // Randomize on client only to avoid SSR hydration mismatch
    setCurrent(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

    const interval = setInterval(() => {
      let next;
      do {
        next = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      } while (next === currentRef.current);
      setCurrent(next);
    }, 12500);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isEmptyChat && (
        <motion.div
          key="greeting-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
          transition={{ duration: 0.5 }}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            textAlign: "center",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {/* Pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "1.5px solid var(--accent, #6366f1)",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--accent, #6366f1)",
                opacity: 0.15,
              }}
            />
          </motion.div>

          {/* Rotating greeting text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 600,
                lineHeight: 1.55,
                maxWidth: 380,
                background: "linear-gradient(135deg, var(--text-primary, #f1f5f9) 0%, var(--text-secondary, #94a3b8) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {current}
            </motion.p>
          </AnimatePresence>

          {/* Subtle sub-hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              margin: "14px 0 0",
              fontSize: 12.5,
              color: "var(--text-muted, #64748b)",
              letterSpacing: "0.04em",
              fontWeight: 400,
            }}
          >
            Type below to begin
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
