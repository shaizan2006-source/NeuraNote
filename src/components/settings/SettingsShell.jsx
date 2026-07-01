// src/components/settings/SettingsShell.jsx
"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const NAV = [
  { key: "account",       label: "Your Account",    Icon: IconUser },
  { key: "plan",          label: "Your Plan",        Icon: IconPlan },
  { key: "notifications", label: "Notifications",    Icon: IconBell },
  { key: "support",       label: "Support",          Icon: IconHelp },
  { key: "privacy",       label: "Privacy & Data",   Icon: IconShield },
];

export default function SettingsShell({ active, onNav, onSignOut, children }) {
  const router = useRouter();
  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .st-rail  { width: 100% !important; height: auto !important; flex-direction: row !important;
                      border-right: none !important; border-bottom: 1px solid var(--border-hairline) !important;
                      overflow-x: auto; padding: 8px 12px !important; gap: 4px !important; }
          .st-rail .st-sign-out { display: none !important; }
          .st-nav-label { display: none !important; }
          .st-nav-item  { padding: 8px !important; border-radius: 10px !important; min-width: 40px;
                          justify-content: center !important; }
          .st-content   { padding: 20px 16px !important; }
          .st-mobile-so { display: flex !important; }
        }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)", color: "var(--text-primary)", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 24px", height: 52, borderBottom: "1px solid var(--border-hairline)", flexShrink: 0, background: "var(--bg-surface)" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            ← Dashboard
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Settings</span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Nav rail */}
          <div className="st-rail" style={{ width: 220, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border-hairline)", display: "flex", flexDirection: "column", padding: "16px 10px", gap: 2, overflowY: "auto" }}>
            {NAV.map(({ key, label, Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  className="st-nav-item"
                  onClick={() => onNav(key)}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            10,
                    height:         44,
                    padding:        "0 12px",
                    borderRadius:   10,
                    border:         "none",
                    cursor:         "pointer",
                    background:     isActive ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "transparent",
                    color:          isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize:       13,
                    fontWeight:     isActive ? 600 : 500,
                    textAlign:      "left",
                    width:          "100%",
                    borderLeft:     isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    transition:     "background 0.15s, color 0.15s",
                    fontFamily:     "inherit",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-surface-2)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon active={isActive} />
                  <span className="st-nav-label">{label}</span>
                </button>
              );
            })}

            {/* Sign out — desktop only (pinned bottom) */}
            <div className="st-sign-out" style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-hairline)" }}>
              <button
                onClick={onSignOut}
                style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "var(--text-tertiary)", fontSize: 13, fontWeight: 500, width: "100%", fontFamily: "inherit", transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "color-mix(in srgb, var(--error) 8%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
              >
                <IconSignOut />
                <span className="st-nav-label">Sign out</span>
              </button>
            </div>
          </div>

          {/* Content pane */}
          <div className="st-content" style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            {/* Mobile sign-out (hidden on desktop via CSS) */}
            <button
              className="st-mobile-so"
              onClick={onSignOut}
              style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 20, background: "none", border: "none", color: "var(--error)", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              Sign out
            </button>
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Section card helpers (exported for use in section components) ──────────
export function SettingsCard({ children, danger = false, style = {} }) {
  return (
    <div style={{
      background:   "var(--bg-surface)",
      border:       danger
        ? "1px solid color-mix(in srgb, var(--error) 25%, transparent)"
        : "1px solid var(--border-hairline)",
      borderRadius: 16,
      padding:      24,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function SettingsGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

export function SettingsInput({ label, value, onChange, readOnly = false, placeholder = "" }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px",
          borderRadius: 9, background: readOnly ? "var(--bg-inset)" : "var(--bg-surface-2)",
          border: "1px solid var(--border-hairline)", color: readOnly ? "var(--text-tertiary)" : "var(--text-primary)",
          fontSize: 14, outline: "none", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

export function GoldButton({ children, onClick, disabled = false, outline = false, danger = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      "10px 22px",
        borderRadius: 10,
        border:       outline || danger ? `1px solid ${danger ? "var(--error)" : "var(--border-strong)"}` : "none",
        background:   outline || danger ? "transparent" : "var(--accent-grad)",
        color:        outline ? "var(--text-secondary)" : danger ? "var(--error)" : "var(--bg-base)",
        fontWeight:   600,
        fontSize:     14,
        cursor:       disabled ? "not-allowed" : "pointer",
        opacity:      disabled ? 0.5 : 1,
        fontFamily:   "inherit",
        transition:   "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── Inline SVG icons ───────────────────────────────────────────────────────
function NavIcon({ d, active }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}
function IconUser({ active })     { return <NavIcon active={active} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />; }
function IconPlan({ active })     { return <NavIcon active={active} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />; }
function IconBell({ active })     { return <NavIcon active={active} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />; }
function IconHelp({ active })     { return <NavIcon active={active} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />; }
function IconShield({ active })   { return <NavIcon active={active} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />; }
function IconSignOut()            { return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>; }
