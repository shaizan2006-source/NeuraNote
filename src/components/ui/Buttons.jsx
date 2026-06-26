// src/components/ui/Buttons.jsx
"use client";

// ── Primary Button (glassmorphism) ────────────────────────────────
export function PrimaryButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={e => !props.disabled && onClick?.(e)}
      {...props}
      style={{
        position:       "relative",
        overflow:       "hidden",
        background:     "var(--accent-grad)",
        color:          "var(--bg-base)",
        padding:        "9px 18px",
        borderRadius:   8,
        fontSize:       11,
        fontWeight:     600,
        border:         "none",
        opacity:        props.disabled ? 0.5 : 1,
        cursor:         props.disabled ? "not-allowed" : "pointer",
        transition:     "transform 200ms ease-out",
        ...style,
      }}
      onMouseEnter={e => !props.disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={e => !props.disabled && (e.currentTarget.style.transform = "translateY(0)")}
      onMouseDown={e => !props.disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => !props.disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
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
      onClick={e => !props.disabled && onClick?.(e)}
      {...props}
      style={{
        background:   "transparent",
        color:        "var(--text-secondary)",
        border:       "1px solid var(--border-strong)",
        padding:      "8px 16px",
        borderRadius: 8,
        fontSize:     11,
        fontWeight:   600,
        opacity:      props.disabled ? 0.5 : 1,
        cursor:       props.disabled ? "not-allowed" : "pointer",
        transition:   "all 200ms ease-out",
        ...style,
      }}
      onMouseEnter={e => !props.disabled && (() => {
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 32%, transparent)";
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.transform = "translateY(-1px)";
      })()}
      onMouseLeave={e => !props.disabled && (() => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.transform = "translateY(0)";
      })()}
      onMouseDown={e => !props.disabled && (e.currentTarget.style.opacity = "0.7")}
      onMouseUp={e => !props.disabled && (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
}

// ── Compact Button (inline pill) ─────────────────────────────────
export function CompactButton({ children, onClick, style = {}, ...props }) {
  return (
    <button
      onClick={e => !props.disabled && onClick?.(e)}
      {...props}
      style={{
        background:   "transparent",
        color:        "var(--text-secondary)",
        border:       "1px solid var(--border-hairline)",
        padding:      "4px 10px",
        borderRadius: 6,
        fontSize:     10,
        fontWeight:   600,
        opacity:      props.disabled ? 0.5 : 1,
        cursor:       props.disabled ? "not-allowed" : "pointer",
        transition:   "all 100ms ease-in",
        display:      "flex",
        alignItems:   "center",
        gap:          4,
        ...style,
      }}
      onMouseEnter={e => !props.disabled && (() => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.color = "var(--text-primary)";
      })()}
      onMouseLeave={e => !props.disabled && (() => {
        e.currentTarget.style.borderColor = "var(--border-hairline)";
        e.currentTarget.style.color = "var(--text-secondary)";
      })()}
      onMouseDown={e => !props.disabled && (e.currentTarget.style.opacity = "0.7")}
      onMouseUp={e => !props.disabled && (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
}
