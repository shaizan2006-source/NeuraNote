// src/components/AskAI/ModeSwitcher.jsx
"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

const MODES = [
  {
    id:    "answering",
    label: "Answering",
    icon:  "⚡",
    desc:  "Direct answers with full detail",
    color: "#a78bfa",
    bg:    "rgba(139,92,246,0.12)",
    border:"rgba(139,92,246,0.3)",
  },
  {
    id:    "coach",
    label: "Coach",
    icon:  "🎯",
    desc:  "Guided learning with questions",
    color: "#fbbf24",
    bg:    "rgba(251,191,36,0.12)",
    border:"rgba(251,191,36,0.3)",
  },
];

export default function ModeSwitcher() {
  const { chatMode, setChatMode } = useDashboard();
  const [open, setOpen]           = useState(false);
  const ref                       = useRef(null);
  const openRef                   = useRef(false);

  // Keep ref in sync so event handlers can read current open state
  useEffect(() => { openRef.current = open; }, [open]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && openRef.current) { setOpen(false); e.stopPropagation(); }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // [] intentional — setOpen and openRef are stable references

  const current = MODES.find(m => m.id === chatMode) ?? MODES[0];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Pill trigger */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Chat mode: ${current.label}. Click to switch`}
        onClick={() => setOpen(o => !o)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          5,
          padding:      "4px 9px 4px 7px",
          background:   current.bg,
          border:       `1px solid ${current.border}`,
          borderRadius: 9999,
          cursor:       "pointer",
          fontSize:     12,
          color:        current.color,
          fontWeight:   500,
          lineHeight:   1,
          whiteSpace:   "nowrap",
          transition:   "background 0.18s, border-color 0.18s, color 0.18s",
          userSelect:   "none",
        }}
        title="Switch mode"
      >
        <span style={{ fontSize: 11, lineHeight: 1 }}>{current.icon}</span>
        <span>{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ fontSize: 9, lineHeight: 1, marginTop: 1, opacity: 0.7 }}
        >
          ▾
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y:  6, scale: 0.96 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            style={{
              position:       "absolute",
              bottom:         "calc(100% + 8px)",
              left:           0,
              background:     "rgba(18, 18, 20, 0.97)",
              border:         "1px solid rgba(255,255,255,0.09)",
              borderRadius:   12,
              padding:        5,
              zIndex:         200,
              minWidth:       200,
              maxWidth:       "calc(100vw - 32px)",
              boxShadow:      "0 8px 30px rgba(0,0,0,0.5)",
              backdropFilter: "blur(14px)",
            }}
          >
            {MODES.map(m => {
              const active = chatMode === m.id;
              return (
                <motion.button
                  key={m.id}
                  whileHover={{ background: "rgba(255,255,255,0.05)" }}
                  onClick={() => { setChatMode(m.id); setOpen(false); }}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          10,
                    width:        "100%",
                    padding:      "8px 10px",
                    background:   active ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0)",
                    border:       "none",
                    borderRadius: 8,
                    cursor:       "pointer",
                    textAlign:    "left",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          6,
                      fontSize:     13,
                      fontWeight:   500,
                      color:        active ? m.color : "var(--text-primary, #e4e4e7)",
                      marginBottom: 2,
                    }}>
                      {m.label}
                      {active && (
                        <span style={{
                          fontSize:     10,
                          color:        m.color,
                          background:   m.bg,
                          padding:      "1px 5px",
                          borderRadius: 4,
                          fontWeight:   600,
                        }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize:   11,
                      color:      "var(--text-muted, #71717a)",
                      lineHeight: 1.35,
                    }}>
                      {m.desc}
                    </div>
                  </div>
                  {active && (
                    <span style={{ fontSize: 11, color: m.color }}>✓</span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
