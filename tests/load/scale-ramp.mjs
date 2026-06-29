/**
 * scale-ramp.mjs — Phase 4 ramped load test (STAGING ONLY).
 *
 * Goes beyond the smoke-level load-test.mjs: ramps concurrency across levels and
 * exercises authenticated DB-read paths (with a real staging token) to find the
 * knee where latency spikes or errors appear. Reports p50/p95/p99 per level.
 *
 * Cost guard: it does NOT flood /api/ask (each request hits real OpenAI). The AI
 * path gets a tiny fixed burst only, to sample latency — never the ramp.
 *
 * Prereqs: APP (staging base URL, default http://localhost:3000),
 *   STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY. Uses persona pro@staging…
 *
 * Usage:  APP=http://localhost:3000 node tests/load/scale-ramp.mjs
 */
import http from "node:http";
import https from "node:https";

const APP = process.env.APP || "http://localhost:3000";
const SB = process.env.STAGING_SUPABASE_URL;
const ANON = process.env.STAGING_SUPABASE_ANON_KEY;
const LEVELS = [10, 25, 50, 100];   // concurrency steps
const PER_LEVEL = 120;              // requests per suite per level
const AI_BURST = 3;                 // /api/ask sample size (cost guard)

if (!SB || !ANON) { console.error("[scale-ramp] missing STAGING_SUPABASE_URL/_ANON_KEY"); process.exit(2); }

function req(url, opts = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const mod = url.startsWith("https") ? https : http;
    const u = new URL(url);
    const r = mod.request(
      { hostname: u.hostname, port: u.port || (url.startsWith("https") ? 443 : 80), path: u.pathname + u.search, method: opts.method || "GET", headers: opts.headers || {} },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, ms: Date.now() - start, ok: res.statusCode < 500 })); }
    );
    r.on("error", () => resolve({ status: 0, ms: Date.now() - start, ok: false }));
    r.setTimeout(15_000, () => { r.destroy(); resolve({ status: 0, ms: 15_000, ok: false, timedOut: true }); });
    if (opts.body) { r.setHeader("Content-Type", "application/json"); r.write(opts.body); }
    r.end();
  });
}

async function token() {
  const r = await new Promise((resolve) => {
    const u = new URL(`${SB}/auth/v1/token?grant_type=password`);
    const body = JSON.stringify({ email: "pro@staging.askmynotes.test", password: "StagingPass!23" });
    const rq = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" } },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve(b)); });
    rq.on("error", () => resolve("{}")); rq.write(body); rq.end();
  });
  return JSON.parse(r).access_token;
}

function pct(arr, p) { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }

async function ramp(name, fn, concurrency, count) {
  const out = [];
  let done = 0;
  const worker = async () => { while (done < count) { done++; out.push(await fn()); } };
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker));
  const elapsed = Date.now() - t0;
  const ms = out.map((r) => r.ms);
  const ok = out.filter((r) => r.ok).length;
  const fails = out.filter((r) => !r.ok);
  const statuses = [...new Set(fails.map((r) => r.status))];
  return {
    name, concurrency, ok, count, rate: Math.round((ok / count) * 100),
    p50: pct(ms, 0.5), p95: pct(ms, 0.95), p99: pct(ms, 0.99), max: Math.max(...ms),
    rps: Math.round(count / (elapsed / 1000)), failStatuses: statuses,
  };
}

const t = await token();
if (!t) { console.error("[scale-ramp] could not obtain staging token — is staging seeded?"); process.exit(2); }
const auth = { Authorization: `Bearer ${t}` };

const SUITES = [
  { name: "GET /                 (static)", fn: () => req(`${APP}/`) },
  { name: "GET /pricing          (static)", fn: () => req(`${APP}/pricing`) },
  { name: "GET /api/streak       (authed DB read)", fn: () => req(`${APP}/api/streak`, { headers: auth }) },
  { name: "GET /api/progress/summary (authed DB read)", fn: () => req(`${APP}/api/progress/summary`, { headers: auth }) },
  { name: "GET /api/documents    (authed DB list)", fn: () => req(`${APP}/api/documents`, { headers: auth }) },
];

console.log(`\nPhase 4 ramped load — target ${APP}\nLevels: ${LEVELS.join(", ")} | ${PER_LEVEL} req/suite/level\n`);
const rows = [];
for (const s of SUITES) {
  console.log(`\n=== ${s.name} ===`);
  console.log("  conc |  ok% |  p50 |  p95 |  p99 |  max | req/s | fails");
  for (const c of LEVELS) {
    const r = await ramp(s.name, s.fn, c, PER_LEVEL);
    rows.push(r);
    console.log(`  ${String(c).padStart(4)} | ${String(r.rate).padStart(3)}% | ${String(r.p50).padStart(4)} | ${String(r.p95).padStart(4)} | ${String(r.p99).padStart(4)} | ${String(r.max).padStart(4)} | ${String(r.rps).padStart(5)} | ${r.failStatuses.join(",") || "-"}`);
  }
}

// AI path: tiny burst only (cost guard) — sample latency, do not ramp.
// SKIP_AI=1 to skip entirely (e.g. dev mode where the AI route's WIP deps are absent).
let aiResults = [];
if (process.env.SKIP_AI) {
  console.log(`\n=== POST /api/ask  (SKIPPED — SKIP_AI set) ===`);
} else {
  console.log(`\n=== POST /api/ask  (AI path — ${AI_BURST}-req sample, NOT ramped) ===`);
  for (let i = 0; i < AI_BURST; i++) {
    aiResults.push(await req(`${APP}/api/ask`, { method: "POST", headers: auth, body: JSON.stringify({ question: "Define Newton's second law in one line." }) }));
  }
  console.log(`  statuses: ${aiResults.map((r) => r.status).join(", ")} | latency ms: ${aiResults.map((r) => r.ms).join(", ")}`);
}

// Knee detection: flag suites whose p95 grows super-linearly with concurrency, or any non-100% level.
console.log(`\n════ SCALE SUMMARY ════`);
let concerns = 0;
for (const s of SUITES) {
  const levels = rows.filter((r) => r.name === s.name);
  const lowest = levels[0], highest = levels[levels.length - 1];
  const degraded = levels.some((l) => l.rate < 99);
  const p95Growth = highest.p95 / Math.max(1, lowest.p95);
  const concurrencyGrowth = highest.concurrency / lowest.concurrency;
  const superlinear = p95Growth > concurrencyGrowth * 1.5;
  if (degraded || superlinear) {
    concerns++;
    console.log(`  ⚠️  ${s.name}: ${degraded ? `errors at scale (min ${Math.min(...levels.map((l) => l.rate))}% ok)` : ""}${superlinear ? ` p95 grew ${p95Growth.toFixed(1)}× for ${concurrencyGrowth}× concurrency (super-linear → bottleneck)` : ""}`);
  } else {
    console.log(`  ✓  ${s.name}: stable (p95 ${lowest.p95}→${highest.p95}ms across ${lowest.concurrency}→${highest.concurrency} conc)`);
  }
}
console.log(`\n=== ${rows.filter((r) => r.rate >= 99).length} pass, ${rows.filter((r) => r.rate < 99).length} fail === (${concerns} scale concern(s))`);
process.exit(concerns > 0 || aiResults.some((r) => !r.ok) ? 1 : 0);
