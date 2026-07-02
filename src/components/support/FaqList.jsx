// src/components/support/FaqList.jsx
"use client";
import { useEffect, useState } from "react";

function Chevron({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease-out", flexShrink: 0 }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function FaqList() {
  const [items,  setItems]  = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetch("/api/support/faq")
      .then(r => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Loading…</p>;
  }
  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(item => {
        const open = openId === item.id;
        return (
          <div key={item.id} style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", borderRadius: 10, overflow: "hidden" }}>
            <button
              onClick={() => setOpenId(open ? null : item.id)}
              aria-expanded={open}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontFamily: "inherit",
              }}
            >
              {item.question}
              <span style={{ color: "var(--text-tertiary)" }}><Chevron open={open} /></span>
            </button>
            <div style={{
              maxHeight: open ? 400 : 0, overflow: "hidden",
              transition: "max-height 0.2s ease-out",
            }}>
              <p style={{ margin: 0, padding: "0 16px 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
