// src/components/dashboard/AskAIHeroCard.jsx
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useDrawer } from "@/context/DrawerContext";

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
      whileHover={{ scale: 1.01, y: -2 }}
      onClick={() => inputRef.current?.focus()}
      style={{
        height: "100%",
        borderRadius: 20,
        background: "linear-gradient(160deg, #1a0533 0%, #2d1060 45%, #1a0533 100%)",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 8px 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        cursor: "text",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Ambient glow blob */}
      <div style={{
        position: "absolute",
        top: "35%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 280,
        height: 280,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Arc decoration */}
      <div style={{
        position: "absolute",
        top: 60,
        right: -20,
        width: 180,
        height: 180,
        borderRadius: "50%",
        border: "1px solid rgba(139,92,246,0.15)",
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
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>Ask AI</p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6d6d80" }}>Your AI study assistant</p>
        </div>
        <div style={{ display: "flex", gap: 6, opacity: 0.55 }}>
          <span style={{ fontSize: 14, color: "#a78bfa" }}>✦</span>
          <span style={{ fontSize: 10, color: "#a78bfa", alignSelf: "flex-end", marginBottom: 2 }}>✧</span>
          <span style={{ fontSize: 16, color: "#a78bfa" }}>✦</span>
        </div>
      </div>

      {/* Center content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "8px",
        position: "relative",
        zIndex: 1,
      }}>
        <motion.div
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: 18, marginBottom: 12, letterSpacing: 10, color: "#a78bfa" }}
        >
          ✦ ✧ ✦
        </motion.div>
        <p style={{
          margin: "0 0 8px",
          fontSize: 15,
          fontWeight: 700,
          color: "#f4f4f5",
          lineHeight: 1.3,
        }}>
          Ask anything. Get instant answers.
        </p>
        <p style={{
          margin: 0,
          fontSize: 11,
          color: "#6d6d80",
          lineHeight: 1.5,
          maxWidth: 260,
        }}>
          From explanations to study guidance, I&apos;m here to help.
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
          placeholder="Ask anything..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 13,
            color: "#e4e4e7",
            outline: "none",
            transition: "border-color 200ms ease, box-shadow 200ms ease",
          }}
          onFocus={e => {
            e.target.style.borderColor = "rgba(139,92,246,0.65)";
            e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
          }}
          onBlur={e => {
            e.target.style.borderColor = "rgba(139,92,246,0.25)";
            e.target.style.boxShadow = "none";
          }}
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.93 }}
          onClick={handleSend}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
            border: "none",
            color: "#fff",
            fontSize: 17,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
          }}
        >
          ↑
        </motion.button>
      </div>
    </motion.div>
  );
}
