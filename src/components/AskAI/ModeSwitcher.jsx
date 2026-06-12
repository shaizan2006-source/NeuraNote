// src/components/AskAI/ModeSwitcher.jsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";

const MODES = [
  {
    id:     "answering",
    label:  "Answering",
    icon:   "⚡",
    desc:   "Direct, detailed answers",
    color:  "var(--ai-signal)",
    bg:     "color-mix(in srgb, var(--ai-signal) 10%, transparent)",
    border: "color-mix(in srgb, var(--ai-signal) 28%, transparent)",
  },
  {
    id:     "coach",
    label:  "Coach Mode",
    icon:   "🎯",
    desc:   "Guided questions to deepen learning",
    color:  "var(--warning)",
    bg:     "color-mix(in srgb, var(--warning) 10%, transparent)",
    border: "color-mix(in srgb, var(--warning) 28%, transparent)",
  },
];

export default function ModeSwitcher() {
  const { chatMode, setChatMode } = useDashboard();
  const [open,    setOpen]    = useState(false);
  const [pos,     setPos]     = useState({ bottom: 0, right: 0 });
  const [mounted, setMounted] = useState(false);

  const triggerRef  = useRef(null);
  const dropdownRef = useRef(null);

  // Gate portal to client only (Next.js SSR safety)
  useEffect(() => { setMounted(true); }, []);

  // Calculate position anchored to the trigger's top-right corner
  const computePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      // "bottom" in fixed CSS = distance from viewport bottom
      // We want the dropdown's bottom edge just above the trigger's top edge
      bottom: window.innerHeight - rect.top + 6,
      // Right-align the dropdown with the trigger's right edge
      right:  window.innerWidth  - rect.right,
    };
  }, []);

  const openDropdown = useCallback(() => {
    const newPos = computePos();
    if (!newPos) return;
    setPos(newPos);
    setOpen(true);
  }, [computePos]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    if (open) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [open, openDropdown, closeDropdown]);

  // Close on outside click or Escape; arrow-key navigation inside dropdown
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e) => {
      const clickedTrigger  = triggerRef.current?.contains(e.target);
      const clickedDropdown = dropdownRef.current?.contains(e.target);
      if (!clickedTrigger && !clickedDropdown) closeDropdown();
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeDropdown();
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          dropdownRef.current?.querySelectorAll("[data-mode-item]") ?? []
        );
        if (!items.length) return;
        const idx  = items.indexOf(document.activeElement);
        const next = e.key === "ArrowDown"
          ? (idx + 1) % items.length
          : (idx - 1 + items.length) % items.length;
        items[next].focus();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown",   onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown",   onKeyDown);
    };
  }, [open, closeDropdown]);

  const current = MODES.find(m => m.id === chatMode) ?? MODES[0];
  const isCoach = chatMode === "coach";

  // ── Dropdown (rendered via portal so overflow:hidden on the pill never clips it)
  // AnimatePresence MUST be inside the portal — wrapping a portal object from outside
  // prevents Framer Motion from running entrance/exit animations on the motion.div.
  const portalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mode-dropdown"
          ref={dropdownRef}
          role="listbox"
          aria-label="Select chat mode"
          initial={{ opacity: 0, scale: 0.95, y: 6 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{    opacity: 0, scale: 0.95, y: 6 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          style={{
            position:             "fixed",
            bottom:               pos.bottom,
            right:                pos.right,
            zIndex:               9999,
            minWidth:             220,
            background:           "var(--bg-elevated)",
            border:               "1px solid var(--border-hairline)",
            borderRadius:         12,
            padding:              5,
            boxShadow:            "var(--shadow-card)",
            backdropFilter:       "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            transformOrigin:      "bottom right",
          }}
        >
          {MODES.map((m) => {
            const active = chatMode === m.id;
            return (
              <DropdownItem
                key={m.id}
                mode={m}
                active={active}
                onSelect={() => {
                  setChatMode(m.id);
                  closeDropdown();
                  triggerRef.current?.focus();
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* ── Trigger pill ── */}
      <motion.button
        ref={triggerRef}
        whileTap={{ scale: 0.92 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Mode: ${current.label}. Click to switch`}
        onClick={toggleDropdown}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow =
            "0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          5,
          padding:      "5px 9px 5px 7px",
          background:   isCoach
            ? "color-mix(in srgb, var(--warning) 10%, transparent)"
            : "color-mix(in srgb, var(--ai-signal) 10%, transparent)",
          border:       `1px solid ${isCoach
            ? "color-mix(in srgb, var(--warning) 28%, transparent)"
            : "color-mix(in srgb, var(--ai-signal) 28%, transparent)"}`,
          borderRadius: 9999,
          cursor:       "pointer",
          fontSize:     12,
          fontWeight:   500,
          color:        isCoach ? "var(--warning)" : "var(--ai-signal)",
          lineHeight:   1,
          whiteSpace:   "nowrap",
          userSelect:   "none",
          outline:      "none",
          transition:   "background 0.15s, border-color 0.15s, color 0.15s",
        }}
        title="Switch mode"
      >
        <span style={{ fontSize: 11 }}>{current.icon}</span>
        <span>{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ fontSize: 9, opacity: 0.55, marginLeft: 1 }}
        >
          ▾
        </motion.span>
      </motion.button>

      {/* ── Portal — mounts after hydration ── */}
      {mounted && createPortal(portalContent, document.body)}
    </>
  );
}

// ── Extracted to avoid inline object allocation on every render ──────────────
function DropdownItem({ mode, active, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-mode-item
      role="option"
      aria-selected={active}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        width:        "100%",
        padding:      "9px 11px",
        background:   active
          ? mode.bg
          : hovered
            ? "var(--bg-surface-2)"
            : "transparent",
        border:       `1px solid ${active ? mode.border : "transparent"}`,
        borderRadius: 8,
        cursor:       "pointer",
        textAlign:    "left",
        outline:      "none",
        transition:   "background 0.12s, border-color 0.12s",
      }}
    >
      <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{mode.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        6,
          fontSize:   13,
          fontWeight: active ? 600 : 500,
          color:      active ? mode.color : "var(--text-primary)",
          marginBottom: 2,
        }}>
          {mode.label}
          {active && (
            <span style={{
              fontSize:     9,
              color:        mode.color,
              background:   mode.bg,
              padding:      "1px 6px",
              borderRadius: 4,
              fontWeight:   700,
              letterSpacing: "0.04em",
            }}>
              ACTIVE
            </span>
          )}
        </div>
        <div style={{
          fontSize:   11,
          color:      "var(--text-tertiary)",
          lineHeight: 1.35,
        }}>
          {mode.desc}
        </div>
      </div>

      {active && (
        <span style={{ fontSize: 13, color: mode.color, flexShrink: 0 }}>✓</span>
      )}
    </button>
  );
}
