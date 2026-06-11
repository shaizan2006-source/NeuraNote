/**
 * generate-brand-icons.mjs — Stage 2 (REDESIGN_MASTER_PROMPT.md §8).
 *
 * Renders the Ask My Notes mark (same geometry as src/components/brand/Logo.jsx)
 * via Playwright chromium and writes:
 *   public/icons/icon-{72,96,128,192,512}.png         (full-bleed #08080A, mark ~62%)
 *   public/icons/icon-{192,512}-maskable.png          (mark ~52% — maskable safe zone)
 *   public/icons/apple-touch-icon.png                 (180px full-bleed)
 *   src/app/favicon.ico                               (32px PNG wrapped in ICO)
 *
 * No new deps: @playwright/test is already a devDependency.
 * Run: node scripts/generate-brand-icons.mjs
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ICONS_DIR = path.join(ROOT, "public", "icons");

// Obsidian & Aurum values (raster output — can't reference CSS vars here).
// Keep in sync with src/styles/variables.css.
const BG = "#08080A";
const STROKE = "#F5F5F4";
const SPARK = "#D4AF6E";

// Same geometry as src/components/brand/Logo.jsx (MARK).
function markSvg(sizePx, strokeWidth) {
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 26V8a2 2 0 0 1 2-2h9l5 5v9" stroke="${STROKE}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19 6v5h5" stroke="${STROKE}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 26l4-7.5 4 7.5" stroke="${STROKE}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="16" cy="13.75" r="1.7" fill="${SPARK}"/>
  </svg>`;
}

const TARGETS = [
  { file: "icon-72.png", size: 72, markRatio: 0.62 },
  { file: "icon-96.png", size: 96, markRatio: 0.62 },
  { file: "icon-128.png", size: 128, markRatio: 0.62 },
  { file: "icon-192.png", size: 192, markRatio: 0.62 },
  { file: "icon-512.png", size: 512, markRatio: 0.62 },
  { file: "icon-192-maskable.png", size: 192, markRatio: 0.52 },
  { file: "icon-512-maskable.png", size: 512, markRatio: 0.52 },
  { file: "apple-touch-icon.png", size: 180, markRatio: 0.62 },
];

// Wrap a single PNG buffer in an ICO container (PNG-in-ICO, valid since Vista).
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // offset: 6 + 16
  return Buffer.concat([header, entry, png]);
}

async function render(page, size, markRatio, { rounded = false } = {}) {
  const markPx = Math.round(size * markRatio);
  // Stroke: keep visually consistent — thicker for small rasters
  const strokeWidth = size <= 96 ? 2 : 1.8;
  const radius = rounded ? `border-radius:${Math.round(size * 0.25)}px;` : "";
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div id="icon" style="width:${size}px;height:${size}px;background:${BG};${radius}display:flex;align-items:center;justify-content:center;">
      ${markSvg(markPx, strokeWidth)}
    </div>
  </body></html>`);
  // omitBackground + (for favicon) rounded corners → guaranteed RGBA PNG,
  // which Next's ICO decoder requires.
  return page.locator("#icon").screenshot({ type: "png", omitBackground: true });
}

async function main() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const t of TARGETS) {
    const buf = await render(page, t.size, t.markRatio);
    fs.writeFileSync(path.join(ICONS_DIR, t.file), buf);
    console.log(`  ✓ public/icons/${t.file} (${t.size}px)`);
  }

  // Favicon: 32px, slightly larger mark for legibility at tab size
  const fav = await render(page, 32, 0.8, { rounded: true });
  fs.writeFileSync(path.join(ROOT, "src", "app", "favicon.ico"), pngToIco(fav, 32));
  console.log("  ✓ src/app/favicon.ico (32px PNG-in-ICO)");

  await browser.close();
  console.log("\n✅ Brand icons generated.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
