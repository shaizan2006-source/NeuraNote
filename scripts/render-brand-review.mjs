/**
 * render-brand-review.mjs — review harness for the two open founder items:
 *   1. Logo art sign-off (§10) — mark at every real size, surfaces, favicon-in-tab, mono vs spark.
 *   2. Constellation line intensity — current vs +medium vs +bold, side by side.
 * Output (2x retina): __screens__/brand-review/{logo-board,constellation-intensity}.png
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "brand-review");

const T = `
  --bg-base:#08080A; --bg-elevated:#0E0E11; --bg-surface:#131317; --bg-surface-2:#1A1A1F; --bg-inset:#050506;
  --border-hairline:rgba(255,255,255,0.06); --border-strong:rgba(255,255,255,0.12);
  --text-primary:#F5F5F4; --text-secondary:#A1A1A6; --text-tertiary:#6B6B70;
  --accent:#D4AF6E; --accent-bright:#EACF96; --accent-dim:#9A7E44;
`;

// EXACT geometry from src/components/brand/Logo.jsx MARK
const mark = (size, { stroke = "var(--text-primary)", spark = "var(--accent)", sw = size <= 20 ? 2 : 1.6 } = {}) => `
<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">
  <path d="M8 26V8a2 2 0 0 1 2-2h9l5 5v9" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 6v5h5" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 26l4-7.5 4 7.5" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="16" cy="13.75" r="1.7" fill="${spark}"/>
</svg>`;

const CSS = `
  *{box-sizing:border-box;margin:0}
  body{background:var(--bg-base);color:var(--text-primary);font:13px/1.5 -apple-system,"Segoe UI",sans-serif;padding:32px}
  h2{font-size:18px;font-weight:600;letter-spacing:-0.01em;margin-bottom:4px}
  .note{color:var(--text-tertiary);font-size:11px;margin-bottom:22px}
  .row{display:flex;align-items:flex-end;gap:28px;flex-wrap:wrap;margin-bottom:30px}
  .cell{display:flex;flex-direction:column;align-items:center;gap:8px}
  .lbl{font-family:ui-monospace,monospace;font-size:10px;color:var(--text-tertiary)}
  .sec{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-secondary);margin:10px 0 14px;border-bottom:1px solid var(--border-hairline);padding-bottom:6px}
  .surf{width:120px;height:96px;border-radius:14px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-hairline)}
  .word{display:inline-flex;align-items:center;gap:10px}
  .word span{font-weight:600;letter-spacing:-0.01em}
  .tab{display:inline-flex;align-items:center;gap:8px;background:var(--bg-surface-2);border:1px solid var(--border-strong);border-radius:8px 8px 0 0;padding:8px 14px;max-width:220px}
  .tab .ttl{font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .fav{width:18px;height:18px;border-radius:5px;background:var(--bg-base);display:flex;align-items:center;justify-content:center;flex-shrink:0}
`;

const LOGO_BOARD = `
  <h2>Ask My Notes — logo art review</h2>
  <div class="note">Exact production geometry (src/components/brand/Logo.jsx). §10 founder sign-off.</div>

  <div class="sec">Legibility ladder — favicon 16 · sidebar 28 · hero sizes</div>
  <div class="row">
    ${[16, 24, 28, 40, 64, 96, 140].map((s) => `<div class="cell"><span style="color:var(--text-primary)">${mark(s)}</span><span class="lbl">${s}px</span></div>`).join("")}
  </div>

  <div class="sec">Wordmark lockup (Geist, -0.01em)</div>
  <div class="row">
    <div class="cell"><span class="word" style="color:var(--text-primary)">${mark(20)}<span style="font-size:13px">Ask My Notes</span></span><span class="lbl">sm</span></div>
    <div class="cell"><span class="word" style="color:var(--text-primary)">${mark(28)}<span style="font-size:16px">Ask My Notes</span></span><span class="lbl">md</span></div>
    <div class="cell"><span class="word" style="color:var(--text-primary)">${mark(40)}<span style="font-size:22px">Ask My Notes</span></span><span class="lbl">lg</span></div>
  </div>

  <div class="sec">On surfaces + inverted (contrast check)</div>
  <div class="row">
    <div class="cell"><div class="surf" style="background:var(--bg-base)"><span style="color:var(--text-primary)">${mark(48)}</span></div><span class="lbl">--bg-base</span></div>
    <div class="cell"><div class="surf" style="background:var(--bg-surface)"><span style="color:var(--text-primary)">${mark(48)}</span></div><span class="lbl">--bg-surface</span></div>
    <div class="cell"><div class="surf" style="background:var(--bg-elevated)"><span style="color:var(--text-primary)">${mark(48)}</span></div><span class="lbl">--bg-elevated</span></div>
    <div class="cell"><div class="surf" style="background:var(--text-primary)">${mark(48, { stroke: "#08080A" })}</div><span class="lbl">inverted (platinum)</span></div>
    <div class="cell"><div class="surf" style="background:var(--accent-grad,linear-gradient(135deg,#EACF96,#D4AF6E))"><span style="color:#08080A">${mark(48, { stroke: "#08080A", spark: "#08080A" })}</span></div><span class="lbl">on gold</span></div>
  </div>

  <div class="sec">Favicon in a browser tab · mono vs gold spark</div>
  <div class="row">
    <div class="cell"><div class="tab"><span class="fav">${mark(13, { sw: 2 })}</span><span class="ttl">Sage — Ask My Notes</span></div><span class="lbl">tab @16</span></div>
    <div class="cell"><span style="color:var(--text-primary)">${mark(64, { spark: "var(--text-primary)" })}</span><span class="lbl">mono (no spark)</span></div>
    <div class="cell"><span style="color:var(--text-primary)">${mark(64)}</span><span class="lbl">gold spark</span></div>
    <div class="cell"><span style="color:var(--text-secondary)">${mark(64, { stroke: "var(--text-secondary)" })}</span><span class="lbl">disabled/ghost</span></div>
  </div>
`;

function constellationPanel(label, op, sw) {
  // Mini 3-tile cluster with the underlay lines at a given intensity
  const nodes = { sage: [50, 22], focus: [16, 62], brain: [84, 62] };
  const links = [["focus", "sage"], ["sage", "brain"], ["focus", "brain"]];
  const tiles = [
    { n: "sage", w: 150, h: 60, t: "Sage", d: "the spark", accent: true },
    { n: "focus", w: 120, h: 54, t: "Focus", d: "25:00" },
    { n: "brain", w: 120, h: 54, t: "Brain Map", d: "37 concepts" },
  ];
  const W = 380, H = 220;
  return `
  <div class="cell">
    <div style="position:relative;width:${W}px;height:${H}px;background:var(--bg-base);border:1px solid var(--border-hairline);border-radius:14px;overflow:hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">
        ${links.map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="var(--accent)" stroke-opacity="${op}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/>`).join("")}
        ${Object.values(nodes).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 0 ? 0.5 : 0.36}" fill="var(--accent-bright)"/>`).join("")}
      </svg>
      ${tiles.map((t) => {
        const [cx, cy] = nodes[t.n];
        return `<div style="position:absolute;left:${cx}%;top:${cy}%;transform:translate(-50%,-50%);width:${t.w}px;height:${t.h}px;background:var(--bg-surface);border:1px solid ${t.accent ? "var(--accent-dim)" : "var(--border-hairline)"};border-radius:12px;padding:10px 12px;box-shadow:0 8px 24px rgba(0,0,0,0.45)${t.accent ? ",0 0 18px rgba(212,175,110,0.10)" : ""}">
          <div style="font-size:12px;font-weight:600;color:var(--text-primary)">${t.t}</div>
          <div style="font-size:10px;color:var(--text-tertiary);margin-top:2px">${t.d}</div>
        </div>`;
      }).join("")}
    </div>
    <span class="lbl">${label}</span>
  </div>`;
}

const CONSTELLATION = `
  <h2>Constellation line intensity</h2>
  <div class="note">Current ships the "subtle" level (the proposal you approved). Pick how present the gold links should read on a real monitor.</div>
  <div class="row" style="align-items:flex-start">
    ${constellationPanel("A · subtle (current) — op 0.22–0.34, 1px", 0.3, 1)}
    ${constellationPanel("B · medium — op ~0.5, 1px", 0.5, 1)}
    ${constellationPanel("C · bold — op ~0.7, 1.25px", 0.7, 1.25)}
  </div>
`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  await page.setViewportSize({ width: 1080, height: 720 });
  await page.setContent(`<!doctype html><html><head><style>:root{${T}} ${CSS}</style></head><body>${LOGO_BOARD}</body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "logo-board.png"), fullPage: true });
  console.log("  ✓ logo-board.png");

  await page.setViewportSize({ width: 1280, height: 420 });
  await page.setContent(`<!doctype html><html><head><style>:root{${T}} ${CSS}</style></head><body>${CONSTELLATION}</body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "constellation-intensity.png"), fullPage: true });
  console.log("  ✓ constellation-intensity.png");

  await browser.close();
  console.log("✅ brand review rendered");
}
main().catch((e) => { console.error(e); process.exit(1); });
