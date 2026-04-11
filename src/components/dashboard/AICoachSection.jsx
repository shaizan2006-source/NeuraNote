"use client";

import { useDashboard } from "@/context/DashboardContext";

export default function AICoachSection() {
  const { messages, input, setInput, sendMessage } = useDashboard();

  return (
    <div id="section-coach" className="section-card" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>AI Study Coach</span>
      </div>

      <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.role === "user" ? "right" : "left" }}>
            <span style={{
              background: msg.role === "user" ? "var(--blue-dark)" : "var(--surface-raised)",
              padding: "8px 12px", borderRadius: 8, display: "inline-block",
              color: "var(--text-primary)", fontSize: 13, lineHeight: 1.5,
            }}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask your AI coach..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: "var(--surface-card)", border: "1px solid var(--border-default)",
            color: "var(--text-primary)", outline: "none", fontSize: 13,
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            background: "var(--blue-dark)", color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
