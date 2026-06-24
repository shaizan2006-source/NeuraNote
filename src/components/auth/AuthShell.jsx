"use client";

/**
 * AuthShell — shared Grok-style split layout + token styles for all auth pages
 * (login / signup / forgot-password / reset-password). Redesign Stage 7.
 *
 * Left: brand/ambient panel (Logo + tagline + static constellation, obsidian).
 * Right: form panel (page-specific content as children).
 * Mobile (<860px): brand panel collapses to a slim logo header above the form.
 *
 * Presentation only — pages keep all their own auth logic/handlers/state.
 * Token-driven; gold focus rings injected via scoped CSS (no per-input edits).
 */

import Logo, { LogoMark } from "@/components/brand/Logo";
import GoogleIcon from "@/components/brand/GoogleIcon";

export { GoogleIcon };

function ConstellationAmbient() {
  // Static, decorative, reduced-motion-safe. Faint gold links + a ghosted mark.
  const nodes = [[18, 22], [38, 14], [62, 26], [82, 18], [30, 52], [70, 58], [50, 78]];
  const links = [[0, 1], [1, 2], [2, 3], [0, 4], [2, 5], [4, 6], [5, 6]];
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: "30%", left: "40%", width: 460, height: 460,
        transform: "translate(-50%,-50%)", borderRadius: "50%",
        background: "radial-gradient(circle, var(--accent-glow-soft) 0%, transparent 70%)",
      }} />
      <div style={{ position: "absolute", right: "-6%", bottom: "-8%", color: "var(--text-primary)", opacity: 0.04 }}>
        <LogoMark size={420} strokeWidth={0.8} />
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {links.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
            stroke="var(--accent)" strokeOpacity={0.28} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 1 ? 0.5 : 0.34} fill="var(--accent-bright)" />
        ))}
      </svg>
    </div>
  );
}

export function AuthSplitLayout({ children }) {
  return (
    <div className="auth-split">
      <div className="auth-brand">
        <ConstellationAmbient />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Logo size="md" withWordmark />
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 380 }}>
          <h2 className="auth-brand-tag" style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.15, margin: 0, color: "var(--text-primary)" }}>
            Your notes that<br />answer back.
          </h2>
          <p className="auth-brand-sub" style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", maxWidth: 340 }}>
            The AI study companion for serious students. Upload your notes, ask Sage, and master more in less time.
          </p>
        </div>
        <p className="auth-brand-foot" style={{ position: "relative", zIndex: 1, margin: 0, fontSize: 11, color: "var(--text-tertiary)", letterSpacing: "0.04em" }}>
          Obsidian &amp; Aurum · Ask My Notes
        </p>
      </div>

      <div className="auth-form auth-panel">
        <div className="auth-form-inner">{children}</div>
      </div>

      <style>{`
        .auth-split { display: flex; min-height: 100vh; min-height: 100dvh; background: var(--bg-base);
          color: var(--text-primary); font-family: var(--font-geist-sans), -apple-system, sans-serif; }
        .auth-brand { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column;
          justify-content: space-between; padding: 48px; border-right: 1px solid var(--border-hairline); min-height: 100vh; }
        .auth-form { width: 540px; max-width: 46%; display: flex; align-items: center; justify-content: center;
          padding: 48px 40px; background: var(--bg-base); }
        .auth-form-inner { width: 100%; max-width: 380px; }
        @media (max-width: 860px) {
          .auth-split { flex-direction: column; }
          .auth-brand { flex: none; min-height: 0; padding: 28px 24px 18px;
            border-right: none; border-bottom: 1px solid var(--border-hairline); justify-content: flex-start; }
          .auth-brand-tag, .auth-brand-sub, .auth-brand-foot { display: none; }
          .auth-form { width: 100%; max-width: 100%; padding: 28px 20px 56px; align-items: flex-start; }
        }
        /* Gold focus rings, scoped to the form panel — no per-input edits */
        .auth-panel input:focus {
          border-color: color-mix(in srgb, var(--accent) 55%, transparent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent) !important;
          outline: none;
        }
        .auth-panel button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .auth-panel input::placeholder { color: var(--text-tertiary); }
      `}</style>
    </div>
  );
}

// Shared token styles — replaces the per-page `styles` object.
export const authStyles = {
  title:    { color: "var(--text-primary)", fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 6px" },
  subtitle: { color: "var(--text-secondary)", fontSize: 14, margin: 0, lineHeight: 1.5 },
  googleBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)", borderRadius: 10,
    padding: "12px 16px", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer",
    transition: "background 0.18s, border-color 0.18s",
  },
  fieldWrap: { marginBottom: 16 },
  label: { display: "block", color: "var(--text-secondary)", fontSize: 13, fontWeight: 500, marginBottom: 6 },
  input: {
    width: "100%", background: "var(--bg-inset)", border: "1px solid var(--border-strong)", borderRadius: 8,
    padding: "11px 14px", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.18s, box-shadow 0.18s", marginBottom: 0,
  },
  passWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent",
    border: "none", cursor: "pointer", padding: 4, lineHeight: 0, color: "var(--text-tertiary)",
    display: "flex", alignItems: "center",
  },
  forgotLink: { color: "var(--accent)", fontSize: 12, textDecoration: "none", fontWeight: 500 },
  fieldErr: { color: "var(--error)", fontSize: 12, margin: "4px 0 0" },
  rulesBox: { background: "var(--bg-inset)", border: "1px solid var(--border-hairline)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 },
  errorBox: {
    background: "color-mix(in srgb, var(--error) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
    borderRadius: 8, padding: "10px 14px", color: "var(--error)", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center",
  },
  successBox: {
    background: "color-mix(in srgb, var(--success) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
    borderRadius: 8, padding: "10px 14px", color: "var(--success)", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center",
  },
  primaryBtn: {
    width: "100%", background: "var(--accent-grad)", color: "var(--bg-base)", border: "none", borderRadius: 10,
    padding: "13px", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", transition: "opacity 0.18s, box-shadow 0.18s", marginTop: 4, boxShadow: "0 2px 12px var(--accent-glow-soft)",
  },
  switchText: { textAlign: "center", color: "var(--text-tertiary)", fontSize: 14, marginTop: 20 },
  link: { color: "var(--accent)", fontWeight: 600, textDecoration: "none" },
};

export function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
      <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>or</span>
      <div style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
    </div>
  );
}

export function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14,
      border: "2px solid color-mix(in srgb, var(--bg-base) 35%, transparent)", borderTopColor: "var(--bg-base)",
      borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle",
    }} />
  );
}

export function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3" />
      <path d="M6.6 6.6A13.3 13.3 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

