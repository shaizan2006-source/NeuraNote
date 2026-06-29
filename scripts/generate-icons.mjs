// Generates PWA icons as solid brand-color PNGs using only Node built-ins.
// Run once: node scripts/generate-icons.mjs
// Replace with proper artwork later.

import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/icons");
mkdirSync(OUT, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, "ascii");
  const lenB = Buffer.allocUnsafe(4);
  lenB.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeB, data]);
  const crcB = Buffer.allocUnsafe(4);
  crcB.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

// Draw a rounded-rect icon: bg fill + inner circle with brand color
function makePNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  // Each row: 1 filter byte + size*3 RGB bytes
  const raw = Buffer.allocUnsafe(size * (1 + size * 3));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;   // fills icon, slight inset for aesthetics
  const innerR = size * 0.25;   // central circle accent

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = y * (1 + size * 3) + 1 + x * 3;
      if (dist <= innerR) {
        // inner accent: white
        raw[i] = 255; raw[i + 1] = 255; raw[i + 2] = 255;
      } else if (dist <= outerR) {
        // main brand circle
        raw[i] = fgR; raw[i + 1] = fgG; raw[i + 2] = fgB;
      } else {
        // background
        raw[i] = bgR; raw[i + 1] = bgG; raw[i + 2] = bgB;
      }
    }
  }

  const idat = chunk("IDAT", deflateSync(raw));
  const ihdr = chunk("IHDR", ihdrData);
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([PNG_SIG, ihdr, idat, iend]);
}

// Brand: #8B5CF6 = 139,92,246  bg: #0A0A0A = 10,10,10
const BR = 139, BG = 92, BB = 246;
const BGDR = 10, BGDG = 10, BGDB = 10;
// Maskable bg: brand color (safe zone padding is implicit — content fills safe zone)
const MASK_BG_R = 109, MASK_BG_G = 40, MASK_BG_B = 217; // #6D28D9 (brand-dark)

const icons = [
  { name: "icon-72.png",           size: 72,  bgR: BGDR, bgG: BGDG, bgB: BGDB, fgR: BR, fgG: BG, fgB: BB },
  { name: "icon-96.png",           size: 96,  bgR: BGDR, bgG: BGDG, bgB: BGDB, fgR: BR, fgG: BG, fgB: BB },
  { name: "icon-128.png",          size: 128, bgR: BGDR, bgG: BGDG, bgB: BGDB, fgR: BR, fgG: BG, fgB: BB },
  { name: "icon-192.png",          size: 192, bgR: BGDR, bgG: BGDG, bgB: BGDB, fgR: BR, fgG: BG, fgB: BB },
  { name: "icon-512.png",          size: 512, bgR: BGDR, bgG: BGDG, bgB: BGDB, fgR: BR, fgG: BG, fgB: BB },
  { name: "icon-192-maskable.png", size: 192, bgR: MASK_BG_R, bgG: MASK_BG_G, bgB: MASK_BG_B, fgR: BR, fgG: BG, fgB: BB },
  { name: "icon-512-maskable.png", size: 512, bgR: MASK_BG_R, bgG: MASK_BG_G, bgB: MASK_BG_B, fgR: BR, fgG: BG, fgB: BB },
  { name: "apple-touch-icon.png",  size: 180, bgR: MASK_BG_R, bgG: MASK_BG_G, bgB: MASK_BG_B, fgR: BR, fgG: BG, fgB: BB },
];

for (const { name, size, bgR, bgG, bgB, fgR, fgG, fgB } of icons) {
  const png = makePNG(size, bgR, bgG, bgB, fgR, fgG, fgB);
  writeFileSync(join(OUT, name), png);
  console.log(`  ✓ ${name} (${size}×${size})`);
}

console.log(`\nIcons written to public/icons/\nReplace with proper artwork when available.`);
