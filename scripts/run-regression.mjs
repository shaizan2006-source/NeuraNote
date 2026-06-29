#!/usr/bin/env node
/**
 * run-regression.mjs — Phase 2 regression runner.
 *
 * Runs the staging QA harnesses in sequence and aggregates pass/fail, exiting
 * non-zero if ANY check fails or a harness crashes (so CI catches regressions in
 * the money path, scoring, FSRS scheduling, and DB concurrency).
 *
 * Prereqs (same as the individual harnesses):
 *   - A deployed + seeded staging app (see docs/qa/STAGING_SETUP.md).
 *   - Env: APP (staging base URL; default http://localhost:3000),
 *     STAGING_SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY,
 *     RAZORPAY_KEY_ID / _KEY_SECRET / _WEBHOOK_SECRET (test mode).
 *
 * Usage:  node scripts/run-regression.mjs        (or: npm run test:regression)
 */
import { spawnSync } from "node:child_process";

const HARNESSES = [
  "tests/staging/phase1-money.mjs",   // create-order / verify / webhook / idempotency
  "tests/staging/phase1-core.mjs",    // trial-expiry (F-005) + mock-test scoring (TV-7)
  "tests/staging/phase1-fsrs.mjs",    // FSRS interval correctness (TV-6)
  "tests/staging/phase1-lighter.mjs", // streak math + photo-doubt limits + brain-map/briefings
  "tests/staging/phase3-db.mjs",      // double-submit idempotency + streak race + pool burst
];

// Fail fast with a clear message if the env isn't wired (avoids a wall of confusing failures).
for (const k of ["STAGING_SUPABASE_URL", "STAGING_SUPABASE_ANON_KEY", "STAGING_SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[k]) { console.error(`[regression] missing env ${k} — see docs/qa/REGRESSION.md`); process.exit(2); }
}

let totalPass = 0, totalFail = 0, hardErrors = 0;
const rows = [];
for (const h of HARNESSES) {
  console.log(`\n──────── ${h} ────────`);
  const r = spawnSync("node", [h], { encoding: "utf8", env: process.env });
  const out = (r.stdout || "") + (r.stderr || "");
  process.stdout.write(out);
  const m = out.match(/===\s*(\d+)\s*pass,\s*(\d+)\s*fail\s*===/);
  if (!m) { hardErrors++; rows.push(`✗ ${h}: NO RESULT (harness crashed, exit ${r.status})`); continue; }
  const pass = +m[1], fail = +m[2];
  totalPass += pass; totalFail += fail;
  rows.push(`${fail === 0 && r.status === 0 ? "✓" : "✗"} ${h}: ${pass} pass, ${fail} fail`);
}

console.log("\n════════════ REGRESSION SUMMARY ════════════");
rows.forEach((r) => console.log("  " + r));
console.log(`  TOTAL: ${totalPass} pass, ${totalFail} fail, ${hardErrors} harness crash(es)`);
console.log("═════════════════════════════════════════════");
process.exit(totalFail > 0 || hardErrors > 0 ? 1 : 0);
