// src/components/ui/Buttons.jsx
"use client";

// ── Primary Button (glassmorphism) ────────────────────────────────
export function PrimaryButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        position:       "relative",
        overflow:       "hidden",
        background:     "linear-gradient(135deg, #8B5CF6, #6D28D9)",
        color:          "#fff",
        padding:        "9px 18px",
        borderRadius:   8,
        fontSize:       11,
        fontWeight:     600,
        border:         "none",
        cursor:         "pointer",
        transition:     "transform 200ms ease-out",
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
      onMouseUp={e => e.currentTarget.style.transform = "translateY(-1px)"}
    >
      {/* Glass overlay */}
      <span style={{
        position:       "absolute",
        inset:          0,
        background:     "rgba(255,255,255,0.15)",
        backdropFilter: "blur(20px)",
        border:         "1px solid rgba(255,255,255,0.2)",
        borderRadius:   8,
        pointerEvents:  "none",
      }} />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </button>
  );
}

// ── Secondary Button (ghost) ──────────────────────────────────────
export function SecondaryButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        background:   "transparent",
        color:        "#a1a1aa",
        border:       "1px solid rgba(255,255,255,0.12)",
        padding:      "8px 16px",
        borderRadius: 8,
        fontSize:     11,
        fontWeight:   600,
        cursor:       "pointer",
        transition:   "all 200ms ease-out",
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)";
        e.currentTarget.style.color = "#c4b5fd";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = "#a1a1aa";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onMouseDown={e => e.currentTarget.style.opacity = "0.7"}
      onMouseUp={e => e.currentTarget.style.opacity = "1"}
    >
      {children}
    </button>
  );
}

// ── Compact Button (inline pill) ─────────────────────────────────
export function CompactButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={onClick}
      {...props}
      style={{
        background:   "transparent",
        color:        "#a1a1aa",
        border:       "1px solid rgba(255,255,255,0.10)",
        padding:      "4px 10px",
        borderRadius: 6,
        fontSize:     10,
        fontWeight:   600,
        cursor:       "pointer",
        transition:   "all 100ms ease-in",
        display:      "flex",
        alignItems:   "center",
        gap:          4,
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
        e.currentTarget.style.color = "#e4e4e7";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
        e.currentTarget.style.color = "#a1a1aa";
      }}
      onMouseDown={e => e.currentTarget.style.opacity = "0.7"}
      onMouseUp={e => e.currentTarget.style.opacity = "1"}
    >
      {children}
    </button>
  );
}
