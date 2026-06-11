/**
 * grep-gate.mjs — Stage 0 verification harness (REDESIGN_MASTER_PROMPT.md §9).
 *
 * Fails if a component INTRODUCES a raw hex color outside the allowed files.
 * The legacy UI is full of inline hex, so the gate is baseline-aware:
 * `scripts/grep-gate.baseline.json` records per-file hex counts; the gate fails
 * only when a file's count INCREASES or a file not in the baseline contains hex.
 * Counts going DOWN is progress — the gate reports it and (in normal mode) passes.
 *
 * Usage:
 *   node scripts/grep-gate.mjs                    # check vs baseline (CI-style gate)
 *   node scripts/grep-gate.mjs --update-baseline  # regenerate baseline (end of approved stage only)
 *   node scripts/grep-gate.mjs --strict           # ignore baseline, list every raw hex (Stage 9)
 *
 * Scope: src/** with extensions .js .jsx .ts .tsx .css
 * Always-allowed (token/asset files): see ALLOWED below.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const BASELINE_PATH = path.join(__dirname, "grep-gate.baseline.json");

const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".css"]);

// Paths (relative, forward-slash) that may contain raw hex.
const ALLOWED = [
  "styles/variables.css", // the token file — the ONE place hex lives
  "components/brand/", // logo SVG system (Stage 2)
];

// Non-UI source dirs excluded from the gate entirely.
const EXCLUDED = [
  "graphify-out/", // generated knowledge-graph artifacts
  "next-app/", // stray scaffolded app (excluded from root tsconfig too)
  "ui-ux-pro-max-skill/", // vendored skill source (excluded from root tsconfig too)
  ".agents/",
  ".claude/",
];

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function isAllowed(rel) {
  return ALLOWED.some((a) => rel.startsWith(a) || rel === a);
}

function isExcluded(rel) {
  return EXCLUDED.some((e) => rel.startsWith(e));
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

function scan() {
  const counts = {}; // rel path -> { count, samples: [{line, match}] }
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    if (isExcluded(rel) || isAllowed(rel)) continue;
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");
    let count = 0;
    const samples = [];
    lines.forEach((line, i) => {
      const matches = line.match(HEX_RE);
      if (matches) {
        count += matches.length;
        if (samples.length < 3) samples.push({ line: i + 1, match: matches.join(" ") });
      }
    });
    if (count > 0) counts[rel] = { count, samples };
  }
  return counts;
}

function main() {
  const args = process.argv.slice(2);
  const update = args.includes("--update-baseline");
  const strict = args.includes("--strict");

  const current = scan();
  const files = Object.keys(current).sort();
  const total = files.reduce((s, f) => s + current[f].count, 0);

  if (strict) {
    console.log(`STRICT MODE — every raw hex outside allowed files (${ALLOWED.join(", ")}):\n`);
    for (const f of files) {
      console.log(`  ${f} — ${current[f].count}`);
      current[f].samples.forEach((s) => console.log(`      L${s.line}: ${s.match}`));
    }
    console.log(`\n${files.length} files, ${total} raw hex total.`);
    process.exit(total > 0 ? 1 : 0);
  }

  if (update) {
    const baseline = Object.fromEntries(files.map((f) => [f, current[f].count]));
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({ note: "Per-file raw-hex counts in src/ (legacy debt). Gate fails on increases/new files. Regenerate ONLY at the end of an approved stage.", files: baseline }, null, 2) + "\n");
    console.log(`✓ Baseline written: ${files.length} files, ${total} raw hex recorded.`);
    process.exit(0);
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error("✗ No baseline found. Run: node scripts/grep-gate.mjs --update-baseline");
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).files;

  const violations = [];
  for (const f of files) {
    const base = baseline[f];
    if (base === undefined) {
      violations.push({ file: f, why: `NEW file with ${current[f].count} raw hex`, samples: current[f].samples });
    } else if (current[f].count > base) {
      violations.push({ file: f, why: `raw hex count ${base} → ${current[f].count}`, samples: current[f].samples });
    }
  }

  const improved = Object.keys(baseline).filter(
    (f) => (current[f]?.count ?? 0) < baseline[f]
  );

  if (violations.length) {
    console.error("✗ GREP GATE FAILED — raw hex introduced (use tokens from src/styles/variables.css):\n");
    for (const v of violations) {
      console.error(`  ${v.file} — ${v.why}`);
      v.samples.forEach((s) => console.error(`      L${s.line}: ${s.match}`));
    }
    process.exit(1);
  }

  console.log(`✓ Grep gate green. ${files.length} files carry legacy hex (${total} total) — none introduced.`);
  if (improved.length) {
    console.log(`  ↓ ${improved.length} file(s) improved vs baseline — consider --update-baseline after stage approval:`);
    improved.forEach((f) => console.log(`      ${f}: ${baseline[f]} → ${current[f]?.count ?? 0}`));
  }
  process.exit(0);
}

main();
