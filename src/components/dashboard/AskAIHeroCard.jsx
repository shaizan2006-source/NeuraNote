// src/components/Dashboard/AskAIHeroCard.jsx
"use client";

import { useState, useRef } from "react";
import { useDrawer } from "@/context/DrawerContext";

// CSS keyframe injected once
const GLOW_CSS = `
@keyframes aiGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(34,211,238,0.06); }
  50%       { box-shadow: 0 0 16px rgba(34,211,238,0.12); }
}
`;

export default function AskAIHeroCard({ activePdf = null }) {
  const [question, setQuestion] = useState("");
  const inputRef = useRef(null);
  const { startNewDrawerConversation } = useDrawer();

  function handleSend() {
    const q = question.trim();
    if (!q) return;
    startNewDrawerConversation();
    // Pass initial question via sessionStorage so drawer can pick it up
    sessionStorage.setItem("drawer_initial_question", q);
    setQuestion("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      <style>{GLOW_CSS}</style>
      <div
        style={{
          background:   "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.04))",
          border:       "1px solid rgba(139,92,246,0.22)",
          borderLeft:   "2px solid rgba(34,211,238,0.35)",
          borderRadius: 12,
          padding:      16,
          display:      "flex",
          flexDirection:"column",
          gap:          12,
          boxShadow:    "inset 0 0 30px rgba(34,211,238,0.04)",
          height:       "100%",
          boxSizing:    "border-box",
          transition:   "transform 200ms ease-out",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        {/* Title row */}
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Ask AI</p>
          {activePdf ? (
            <p style={{ margin: "3px 0 0", fontSize: 9, color: "#22D3EE" }}>
              ◈ {activePdf.name}
            </p>
          ) : (
            <p style={{ margin: "3px 0 0", fontSize: 9, color: "#52525b" }}>
              No PDF connected
            </p>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Input + send button */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            style={{
              flex:         1,
              background:   "rgba(255,255,255,0.04)",
              border:       "1px solid rgba(34,211,238,0.2)",
              borderRadius: 6,
              padding:      "9px",
              fontSize:     9,
              color:        "#e4e4e7",
              outline:      "none",
              animation:    "aiGlow 3s ease-in-out infinite",
            }}
          />
          <button
            onClick={handleSend}
            style={{
              width:          24,
              height:         24,
              borderRadius:   6,
              background:     "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              border:         "none",
              color:          "#fff",
              fontSize:       12,
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}
          >↑</button>
        </div>
      </div>
    </>
  );
}
