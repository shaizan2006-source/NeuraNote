// src/components/Dashboard/AskAIHeroCard.jsx
// "The spark" — Sage entry tile at the center of the Constellation Grid (Stage 6).
// Typing a question opens the QuickChat drawer with it (behavior unchanged).
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useDrawer } from "@/context/DrawerContext";
import { LogoMark } from "@/components/brand/Logo";

export default function AskAIHeroCard({ activePdf = null }) {
  const [question, setQuestion] = useState("");
  const inputRef = useRef(null);
  const { startNewDrawerConversation } = useDrawer();

  function handleSend() {
    const q = question.trim();
    if (!q) return;
    startNewDrawerConversation();
    sessionStorage.setItem("drawer_initial_question", q);
    setQuestion("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, boxShadow: "var(--shadow-card), var(--accent-glow)" }}
      onClick={() => inputRef.current?.focus()}
      style={{
        height: "100%",
        minHeight: 0,
        borderRadius: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--accent-dim)",
        boxShadow: "var(--shadow-card), 0 0 24px var(--accent-glow-soft)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 20px",
        cursor: "text",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Ambient gold halo behind the mark */}
      <div style={{
        position: "absolute",
        top: "32%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 260,
        height: 260,
        borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        position: "relative",
        zIndex: 1,
      }}>
        <div>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            color: "var(--text-secondary)", textTransform: "uppercase",
          }}>✦ the spark</span>
          <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>Sage</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>
            {activePdf ? `Reading: ${activePdf.name}` : "Your notes that answer back"}
          </p>
        </div>
        <span style={{ color: "var(--text-primary)" }}>
          <LogoMark size={30} strokeWidth={1.5} />
        </span>
      </div>

      {/* Center content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "10px 16px",
        position: "relative",
        zIndex: 1,
        minHeight: 0,
      }}>
        <motion.div
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 15, marginBottom: 10, letterSpacing: 10, color: "var(--accent)" }}
        >
          ✦ ✧ ✦
        </motion.div>
        <p style={{
          margin: "0 0 6px",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
          lineHeight: 1.3,
        }}>
          Ask anything. Get instant answers.
        </p>
        <p style={{
          margin: 0,
          fontSize: 11,
          color: "var(--text-tertiary)",
          lineHeight: 1.5,
          maxWidth: 260,
        }}>
          From explanations to study guidance, Sage is here to help.
        </p>
      </div>

      {/* Input row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Sage anything…"
          style={{
            flex: 1,
            background: "var(--bg-inset)",
            border: "1px solid var(--border-strong)",
            borderRadius: 999,
            padding: "9px 14px",
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            transition: "border-color 200ms ease, box-shadow 200ms ease",
          }}
          onFocus={e => {
            e.target.style.borderColor = "color-mix(in srgb, var(--accent) 50%, transparent)";
            e.target.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent)";
          }}
          onBlur={e => {
            e.target.style.borderColor = "var(--border-strong)";
            e.target.style.boxShadow = "none";
          }}
        />
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          onClick={handleSend}
          aria-label="Ask Sage"
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "var(--accent-grad)",
            border: "none",
            color: "var(--bg-base)",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 12px var(--accent-glow-soft)",
          }}
        >
          ↑
        </motion.button>
      </div>
    </motion.div>
  );
}
