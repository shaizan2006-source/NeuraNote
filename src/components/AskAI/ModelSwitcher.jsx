// src/components/AskAI/ModelSwitcher.jsx
"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const MODELS = [
  {
    id:    "gpt-4o-mini",
    label: "Smart",
    tag:   "gpt-4o mini",
    desc:  "Fast · efficient",
    icon:  "⚡",
    color: "#22D3EE",
    bg:    "rgba(34,211,238,0.1)",
    border:"rgba(34,211,238,0.25)",
  },
  {
    id:    "gpt-4o",
    label: "Smarter",
    tag:   "gpt-4o",
    desc:  "More capable",
    icon:  "✦",
    color: "#a78bfa",
    bg:    "rgba(139,92,246,0.1)",
    border:"rgba(139,92,246,0.25)",
  },
];

export default function ModelSwitcher({ selectedModel, onSelect }) {
  const [open, setOpen]     = useState(false);
  const [pos,  setPos]      = useState({ bottom: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef  = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const openDropdown = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      bottom: window.innerHeight - rect.top + 6,
      right:  window.innerWidth  - rect.right,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onMouse = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        triggerRef.current  && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = dropdownRef.current?.querySelectorAll("[data-model-item]");
        if (!items?.length) return;
        const arr = Array.from(items);
        const focused = arr.indexOf(document.activeElement);
        const next = e.key === "ArrowDown"
          ? (focused + 1) % arr.length
          : (focused - 1 + arr.length) % arr.length;
        arr[next].focus();
      }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown",   onKey);
    };
  }, [open]);

  const current = MODELS.find(m => m.id === selectedModel) ?? MODELS[0];

  const dropdown = (
    <motion.div
      ref={dropdownRef}
      role="listbox"
      aria-label="Select AI model"
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1,    y: 0 }}
      exit={{    opacity: 0, scale: 0.95, y: 4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{
        position:             "fixed",
        bottom:               pos.bottom,
        right:                pos.right,
        zIndex:               9999,
        background:           "rgba(15, 15, 18, 0.97)",
        border:               "1px solid rgba(255,255,255,0.09)",
        borderRadius:         12,
        padding:              5,
        minWidth:             200,
        boxShadow:            "0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {MODELS.map(m => {
        const active = selectedModel === m.id;
        return (
          <button
            key={m.id}
            data-model-item
            role="option"
            aria-selected={active}
            onClick={() => { onSelect(m.id); setOpen(false); triggerRef.current?.focus(); }}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          10,
              width:        "100%",
              padding:      "8px 10px",
              background:   active ? "rgba(255,255,255,0.05)" : "transparent",
              border:       "none",
              borderRadius: 8,
              cursor:       "pointer",
              textAlign:    "left",
              outline:      "none",
              transition:   "background 0.12s",
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? "rgba(255,255,255,0.05)" : "transparent"; }}
            onFocus={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onBlur={e =>  { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0, color: m.color }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display:    "flex",
                alignItems: "center",
                gap:        6,
                fontSize:   13,
                fontWeight: 500,
                color:      active ? m.color : "#e4e4e7",
              }}>
                {m.label}
                <span style={{
                  fontSize:   9,
                  color:      active ? m.color : "#52525b",
                  background: active ? m.bg : "rgba(255,255,255,0.04)",
                  padding:    "1px 5px",
                  borderRadius: 4,
                  fontWeight:   500,
                  letterSpacing: "0.02em",
                  border:     active ? `1px solid ${m.border}` : "1px solid rgba(255,255,255,0.07)",
                  whiteSpace: "nowrap",
                }}>
                  {m.tag}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#52525b", marginTop: 1, lineHeight: 1.35 }}>
                {m.desc}
              </div>
            </div>
            {active && (
              <span style={{ fontSize: 12, color: m.color, flexShrink: 0 }}>✓</span>
            )}
          </button>
        );
      })}
    </motion.div>
  );

  return (
    <>
      <motion.button
        ref={triggerRef}
        whileTap={{ scale: 0.92 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Model: ${current.label}. Click to switch`}
        onClick={() => open ? setOpen(false) : openDropdown()}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          4,
          padding:      "4px 8px 4px 6px",
          background:   "rgba(255,255,255,0.05)",
          border:       "1px solid rgba(255,255,255,0.08)",
          borderRadius: 9999,
          cursor:       "pointer",
          fontSize:     12,
          color:        "#a1a1aa",
          fontWeight:   500,
          lineHeight:   1,
          whiteSpace:   "nowrap",
          userSelect:   "none",
          outline:      "none",
          transition:   "background 0.15s, border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
          e.currentTarget.style.color = "#e4e4e7";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "#a1a1aa";
        }}
        title="Switch model"
      >
        <span style={{ fontSize: 10, lineHeight: 1, color: current.color }}>{current.icon}</span>
        <span>{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.16 }}
          style={{ fontSize: 8, lineHeight: 1, opacity: 0.5, marginLeft: 1 }}
        >▾</motion.span>
      </motion.button>

      {mounted && (
        <AnimatePresence>
          {open && createPortal(dropdown, document.body)}
        </AnimatePresence>
      )}
    </>
  );
}
