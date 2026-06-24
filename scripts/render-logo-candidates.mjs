/**
 * render-logo-candidates.mjs — logo fix review (addresses the critique panel's
 * "stick figure" finding). Renders CURRENT vs two corrected candidates at the
 * sizes that matter + a 16px figure-read zoom. Output: __screens__/brand-review/logo-candidates.png
 */
import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "__screens__", "brand-review");

const T = `--bg-base:#08080A;--bg-surface:#131317;--text-primary:#F5F5F4;--text-secondary:#A1A1A6;--text-tertiary:#6B6B70;--accent:#D4AF6E;--accent-bright:#EACF96;`;

// Shared page + dog-ear (the part all 3 lenses praised — unchanged)
const PAGE = `<path d="M8 26V8a2 2 0 0 1 2-2h9l5 5v9" stroke="var(--text-primary)" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M19 6v5h5" stroke="var(--text-primary)" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"/>`;

const CANDIDATES = {
  current: {
    name: "CURRENT",
    desc: "wide peak + floating dot → reads as stick figure at small sizes",
    peak: `<path d="M12 26l4-7.5 4 7.5" stroke="var(--text-primary)" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"/>`,
    spark: `<circle cx="16" cy="13.75" r="1.7" fill="var(--accent)"/>`,
  },
  fused: {
    name: "A · FUSED SPARK",
    desc: "narrower peak, gold spark fused at the apex = one rising spark off the page",
    peak: `<path d="M13 25.5 L16 19 L19 25.5" stroke="var(--text-primary)" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"/>`,
    spark: `<circle cx="16" cy="16.1" r="1.7" fill="var(--accent)"/>`,
  },
  arrow: {
    name: "B · RISING ARROW",
    desc: "stemmed upward caret (clear 'answer rising', not legs) + gold spark tip",
    peak: `<path d="M16 26 V18.5" stroke="var(--text-primary)" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12.8 21.5 L16 18 L19.2 21.5" stroke="var(--text-primary)" stroke-width="SW" stroke-linecap="round" stroke-linejoin="round"/>`,
    spark: `<circle cx="16" cy="14.4" r="1.7" fill="var(--accent)"/>`,
  },
};

const mk = (c, size) => {
  const sw = size <= 20 ? 2 : 1.6;
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none">${(PAGE + c.peak + c.spark).replace(/SW/g, sw)}</svg>`;
};

const CSS = `*{box-sizing:border-box;margin:0}body{background:var(--bg-base);color:var(--text-primary);font:13px/1.5 -apple-system,"Segoe UI",sans-serif;padding:32px}
  h2{font-size:18px;font-weight:600;margin-bottom:18px}
  table{border-collapse:collapse;width:100%}
  th,td{text-align:center;padding:16px 10px;border-bottom:1px solid rgba(255,255,255,0.06)}
  th{font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-secondary)}
  .nm{font-size:12px;font-weight:700;color:var(--text-primary);text-align:left}
  .ds{font-size:10px;color:var(--text-tertiary);text-align:left;max-width:230px}
  .lbl{font-family:ui-monospace,monospace;font-size:10px;color:var(--text-tertiary)}
  .zoom{display:flex;gap:30px;margin-top:26px;align-items:center}
  .zoomcell{display:flex;flex-direction:column;align-items:center;gap:8px}
  .chip{width:96px;height:96px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;display:flex;align-items:center;justify-content:center;image-rendering:pixelated}
`;

const rows = Object.values(CANDIDATES).map((c) => `
  <tr>
    <td class="nm">${c.name}<div class="ds">${c.desc}</div></td>
    <td><div style="color:var(--text-primary)">${mk(c, 16)}</div><div class="lbl">16</div></td>
    <td><div style="color:var(--text-primary)">${mk(c, 28)}</div><div class="lbl">28</div></td>
    <td><div style="color:var(--text-primary)">${mk(c, 64)}</div><div class="lbl">64</div></td>
    <td><div style="color:var(--text-primary)">${mk(c, 110)}</div><div class="lbl">110</div></td>
  </tr>`).join("");

// 16px figure-read zoom: render at 16 then scale up 5x with pixelation to show what the eye gets at favicon size
const zoom = Object.values(CANDIDATES).map((c) => `
  <div class="zoomcell">
    <div class="chip"><div style="color:var(--text-primary);transform:scale(5);transform-origin:center">${mk(c, 16)}</div></div>
    <div class="lbl">${c.name.split(" ")[0]} @16 (5x)</div>
  </div>`).join("");

const HTML = `<h2>Logo fix — current vs corrected candidates (resolving the "stick figure" reading)</h2>
  <table><thead><tr><th></th><th>16px favicon</th><th>28px sidebar</th><th>64px</th><th>110px hero</th></tr></thead><tbody>${rows}</tbody></table>
  <h2 style="margin-top:32px">16px figure-read test (favicon size, 5× magnified)</h2>
  <div class="zoom">${zoom}</div>`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.setContent(`<!doctype html><html><head><style>:root{${T}} ${CSS}</style></head><body>${HTML}</body></html>`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, "logo-candidates.png"), fullPage: true });
  await browser.close();
  console.log("  ✓ logo-candidates.png");
}
main().catch((e) => { console.error(e); process.exit(1); });
