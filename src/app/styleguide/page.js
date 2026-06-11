"use client";

/**
 * /styleguide — Stage 0 verification harness surface.
 * Renders every active design token + core component previews on the app canvas.
 * RULES: token-driven only — var(--*) references and rgba() alphas, NO raw hex
 * (this page must pass scripts/grep-gate.mjs). Token lists below are updated
 * alongside src/styles/variables.css at each stage (Stage 1 swaps in Obsidian & Aurum).
 */

import { useEffect, useState } from "react";

const COLOR_GROUPS = [
  {
    title: "Background — obsidian elevation ladder",
    tokens: ["--bg-inset", "--bg-base", "--bg-elevated", "--bg-surface", "--bg-surface-2", "--bg-surface-3"],
  },
  {
    title: "Text — platinum",
    tokens: ["--text-primary", "--text-secondary", "--text-tertiary", "--text-disabled"],
  },
  {
    title: "Border",
    tokens: ["--border-hairline", "--border-strong"],
  },
  {
    title: "Accent — champagne gold (sparing)",
    tokens: ["--accent", "--accent-bright", "--accent-dim", "--ai-signal"],
  },
  {
    title: "Semantic (state only)",
    tokens: ["--success", "--warning", "--error", "--info"],
  },
  {
    title: "Legacy aliases (must resolve to canonical values)",
    tokens: ["--color-brand", "--color-ai-signal", "--bg-surface-alt", "--color-border"],
  },
];

const GOLD_CANDIDATES = [
  { token: "--accent", label: "ADJUSTED — ACTIVE" },
  { token: "--accent-candidate-spec", label: "Spec §7.1 original" },
];

const TYPE_SCALE = [
  { px: 12, weight: 400, label: "caption" },
  { px: 13, weight: 400, label: "small" },
  { px: 14, weight: 400, label: "body" },
  { px: 16, weight: 500, label: "label" },
  { px: 20, weight: 600, label: "title" },
  { px: 24, weight: 700, label: "heading" },
  { px: 32, weight: 700, label: "display" },
  { px: 44, weight: 700, label: "hero" },
];

const SPACE_SCALE = [4, 8, 12, 16, 20, 24, 32, 48, 64];
const RADIUS_SCALE = [
  { r: 8, label: "inputs / chips" },
  { r: 12, label: "cards" },
  { r: 16, label: "modals / hero" },
  { r: 999, label: "pills / avatars" },
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--bg-base)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-geist-sans), sans-serif",
    padding: "48px 24px 96px",
  },
  shell: { maxWidth: 1080, margin: "0 auto" },
  h1: { fontSize: 32, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 },
  sub: { color: "var(--color-text-secondary)", fontSize: 14, marginTop: 8 },
  section: { marginTop: 48 },
  h2: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    margin: "0 0 16px",
    paddingBottom: 8,
    borderBottom: "1px solid var(--color-border)",
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--color-text-secondary)",
    margin: "20px 0 8px",
  },
  swatchRow: { display: "flex", flexWrap: "wrap", gap: 12 },
  swatchCard: {
    width: 168,
    background: "var(--bg-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    overflow: "hidden",
  },
  swatchMeta: { padding: "8px 10px", fontSize: 12 },
  mono: { fontFamily: "var(--font-geist-mono), monospace" },
  card: {
    background: "var(--bg-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 12,
    padding: 20,
  },
  input: {
    width: "100%",
    maxWidth: 360,
    background: "var(--bg-surface-alt)",
    border: "1px solid var(--color-border-strong)",
    borderRadius: 8,
    color: "var(--color-text-primary)",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    display: "block",
  },
  btnBase: {
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

function Swatch({ name, value }) {
  return (
    <div style={styles.swatchCard}>
      <div style={{ height: 56, background: `var(${name})`, borderBottom: "1px solid var(--color-border)" }} />
      <div style={styles.swatchMeta}>
        <div style={{ ...styles.mono, fontWeight: 500 }}>{name}</div>
        <div style={{ ...styles.mono, color: "var(--color-text-secondary)", marginTop: 2 }}>
          {value || "…"}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.h2}>{title}</h2>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const [computed, setComputed] = useState({});
  const [themeClass, setThemeClass] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const all = {};
    COLOR_GROUPS.forEach((g) =>
      g.tokens.forEach((t) => {
        all[t] = cs.getPropertyValue(t).trim();
      })
    );
    GOLD_CANDIDATES.forEach(({ token }) => {
      all[token] = cs.getPropertyValue(token).trim();
    });
    setComputed(all);
    setThemeClass(
      [...root.classList].find((c) => c.startsWith("theme-")) || "(no theme class)"
    );
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <h1 style={styles.h1}>Ask My Notes — Styleguide</h1>
        <p style={styles.sub}>
          Obsidian &amp; Aurum (Stage 1). Active theme:{" "}
          <span style={styles.mono}>{themeClass || "…"}</span> · tokens from{" "}
          <span style={styles.mono}>src/styles/variables.css</span>
        </p>

        <Section title="Gold decision — founder sign-off (§10)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {GOLD_CANDIDATES.map(({ token, label }) => (
              <div key={token} style={{ ...styles.card, width: 300 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, background: `var(${token})` }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ ...styles.mono, fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                      {token} = {computed[token] || "…"}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  <button style={{ ...styles.btnBase, background: `var(${token})`, color: "var(--bg-base)" }}>
                    CTA
                  </button>
                  <span style={{ fontSize: 13, color: `var(${token})`, fontWeight: 600 }}>Accent text 13px</span>
                  <span
                    style={{
                      width: 28, height: 28, borderRadius: 8, display: "inline-block",
                      border: "1px solid var(--border-strong)",
                      boxShadow: `0 0 0 2px var(${token})`,
                    }}
                    title="focus ring"
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12, maxWidth: 640, lineHeight: 1.5 }}>
            Adjusted ramp is active: hue 40°→38° (warmer, no olive cast), lightness +6% for presence at
            hairline/focus-ring sizes. To revert to the spec hue, swap the three accent values in{" "}
            <span style={styles.mono}>variables.css</span>.
          </p>
        </Section>

        <Section title="Color tokens">
          {COLOR_GROUPS.map((g) => (
            <div key={g.title}>
              <div style={styles.groupTitle}>{g.title}</div>
              <div style={styles.swatchRow}>
                {g.tokens.map((t) => (
                  <Swatch key={t} name={t} value={computed[t]} />
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Typography — Geist Sans / Geist Mono">
          {TYPE_SCALE.map((t) => (
            <div
              key={t.px}
              style={{
                fontSize: t.px,
                fontWeight: t.weight,
                lineHeight: t.px >= 24 ? 1.15 : 1.5,
                letterSpacing: t.px >= 24 ? "-0.01em" : 0,
                margin: "10px 0",
              }}
            >
              {t.px}px / {t.weight} — {t.label}: Your notes that answer back.
            </div>
          ))}
          <div style={{ ...styles.mono, fontSize: 14, color: "var(--color-text-secondary)", marginTop: 12 }}>
            mono 14px — scores, timers, code: 00:25:00 · 87% mastery
          </div>
        </Section>

        <Section title="Spacing scale">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            {SPACE_SCALE.map((s) => (
              <div key={s} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 24,
                    height: s,
                    background: "var(--color-brand)",
                    borderRadius: 4,
                    opacity: 0.85,
                  }}
                />
                <div style={{ ...styles.mono, fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  {s}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radius">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {RADIUS_SCALE.map((r) => (
              <div key={r.r} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 88,
                    height: 64,
                    background: "var(--bg-surface-alt)",
                    border: "1px solid var(--color-border-strong)",
                    borderRadius: r.r,
                  }}
                />
                <div style={{ ...styles.mono, fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  {r.r === 999 ? "999 (pill)" : r.r} — {r.label}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Elevation / shadow">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            <div
              style={{
                ...styles.card,
                width: 220,
                boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Soft dark elevation</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                inset hairline + 8/32 black
              </div>
            </div>
            <div
              style={{
                ...styles.card,
                width: 220,
                boxShadow: "0 0 24px rgba(200,164,93,0.18)",
                border: "1px solid var(--color-border-strong)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>Accent glow</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
                primary CTA hover / AI hero only
              </div>
            </div>
          </div>
        </Section>

        <Section title="Core components (previews — canonical builds land in Stage 1/2)">
          <div style={styles.groupTitle}>Buttons</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              style={{
                ...styles.btnBase,
                background: "var(--accent-grad)",
                color: "var(--bg-base)",
                boxShadow: "var(--accent-glow)",
              }}
            >
              Primary action
            </button>
            <button
              style={{
                ...styles.btnBase,
                background: "transparent",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border-strong)",
              }}
            >
              Secondary
            </button>
            <button
              style={{
                ...styles.btnBase,
                background: "transparent",
                color: "var(--color-text-secondary)",
              }}
            >
              Ghost
            </button>
            <button
              style={{
                ...styles.btnBase,
                background: "var(--bg-surface-alt)",
                color: "var(--color-text-secondary)",
                cursor: "not-allowed",
                opacity: 0.6,
              }}
              disabled
            >
              Disabled
            </button>
          </div>

          <div style={styles.groupTitle}>Card</div>
          <div style={{ ...styles.card, maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Card title</div>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "8px 0 0", lineHeight: 1.5 }}>
              Surface + hairline border. Body copy stays on the secondary text token for hierarchy.
            </p>
          </div>

          <div style={styles.groupTitle}>Input / textarea</div>
          <input style={styles.input} placeholder="Ask anything from your notes…" />
          <textarea
            style={{ ...styles.input, marginTop: 12, minHeight: 72, resize: "vertical" }}
            placeholder="Longer answer…"
          />

          <div style={styles.groupTitle}>Pills / chips / badges</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span
              style={{
                fontSize: 12,
                padding: "4px 12px",
                borderRadius: 999,
                border: "1px solid var(--color-border-strong)",
                color: "var(--color-text-secondary)",
              }}
            >
              Operating Systems
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: 999,
                background: "var(--bg-surface-alt)",
                color: "var(--color-text-primary)",
              }}
            >
              Page 12
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                color: "var(--color-success)",
                border: "1px solid var(--color-border)",
                background: "var(--bg-surface)",
              }}
            >
              High confidence
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: 6,
                color: "var(--color-warning)",
                border: "1px solid var(--color-border)",
                background: "var(--bg-surface)",
              }}
            >
              Weak topic
            </span>
          </div>

          <div style={styles.groupTitle}>Skeleton</div>
          <div style={{ maxWidth: 420 }}>
            {[100, 84, 62].map((w) => (
              <div
                key={w}
                style={{
                  height: 12,
                  width: `${w}%`,
                  borderRadius: 6,
                  background: "var(--bg-surface-alt-2)",
                  margin: "8px 0",
                  animation: "styleguide-pulse 1.6s ease-in-out infinite",
                }}
              />
            ))}
          </div>

          <div style={styles.groupTitle}>Empty state</div>
          <div style={{ ...styles.card, maxWidth: 420, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 24 }}>✦</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>No documents yet</div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "6px 0 16px" }}>
              Upload your first PDF and Sage will read it for you.
            </p>
            <button
              style={{
                ...styles.btnBase,
                background: "var(--accent-grad)",
                color: "var(--bg-base)",
              }}
            >
              Upload notes
            </button>
          </div>
        </Section>

        <Section title="Motion contract">
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5, maxWidth: 640 }}>
            Durations 120–280ms · ease-out enters, ease-in exits · hover scale ≤ 1.01 · no bouncy
            springs on study surfaces · all non-essential motion disabled under{" "}
            <span style={styles.mono}>prefers-reduced-motion</span>.
          </p>
        </Section>
      </div>

      <style>{`
        @keyframes styleguide-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          main [style*="styleguide-pulse"] { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
