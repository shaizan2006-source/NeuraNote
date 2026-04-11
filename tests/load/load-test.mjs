/**
 * Load Test — Ask My Notes
 * Uses Node.js built-in http/https — no external deps required.
 *
 * Tests key endpoints under concurrent load and reports:
 *   - Success rate
 *   - Average / min / max response time
 *   - Requests per second
 *
 * Usage:
 *   node tests/load/load-test.mjs
 *   node tests/load/load-test.mjs --host http://localhost:3000
 *   node tests/load/load-test.mjs --concurrency 20 --requests 100
 */

import http from "node:http";
import https from "node:https";
import { parseArgs } from "node:util";

// ── CLI args ──────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    host:        { type: "string",  default: "http://localhost:3000" },
    concurrency: { type: "string",  default: "10" },
    requests:    { type: "string",  default: "50" },
  },
  strict: false,
});

const BASE       = args.host;
const CONCURRENCY = parseInt(args.concurrency, 10);
const TOTAL       = parseInt(args.requests, 10);

// ── HTTP request helper ───────────────────────────────────────────
function request(url, options = {}) {
  return new Promise((resolve) => {
    const start   = Date.now();
    const mod     = url.startsWith("https") ? https : http;
    const urlObj  = new URL(url);
    const reqOpts = {
      hostname: urlObj.hostname,
      port:     urlObj.port || (url.startsWith("https") ? 443 : 80),
      path:     urlObj.pathname + urlObj.search,
      method:   options.method || "GET",
      headers:  options.headers || {},
    };

    const req = mod.request(reqOpts, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        resolve({
          status:  res.statusCode,
          ms:      Date.now() - start,
          ok:      res.statusCode < 500,
        });
      });
    });

    req.on("error", () => {
      resolve({ status: 0, ms: Date.now() - start, ok: false });
    });

    req.setTimeout(10_000, () => {
      req.destroy();
      resolve({ status: 0, ms: 10_000, ok: false, timedOut: true });
    });

    if (options.body) {
      req.setHeader("Content-Type", "application/json");
      req.write(options.body);
    }
    req.end();
  });
}

// ── Run N requests with C concurrency ────────────────────────────
async function runSuite(name, fn, count, concurrency) {
  const results = [];
  let   done    = 0;

  async function worker() {
    while (done < count) {
      done++;
      results.push(await fn());
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, count) }, worker);
  const t0 = Date.now();
  await Promise.all(workers);
  const elapsed = Date.now() - t0;

  const ok      = results.filter((r) => r.ok).length;
  const times   = results.map((r) => r.ms).sort((a, b) => a - b);
  const avg     = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const p95idx  = Math.floor(times.length * 0.95);

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋 ${name}`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Requests   : ${count} (concurrency: ${concurrency})`);
  console.log(`  Success    : ${ok}/${count}  (${Math.round(ok / count * 100)}%)`);
  console.log(`  Avg latency: ${avg} ms`);
  console.log(`  Min latency: ${times[0]} ms`);
  console.log(`  Max latency: ${times[times.length - 1]} ms`);
  console.log(`  p95 latency: ${times[p95idx] ?? times[times.length - 1]} ms`);
  console.log(`  Throughput : ${Math.round(count / (elapsed / 1000))} req/s`);

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    const statuses = [...new Set(failed.map((r) => r.status))];
    console.log(`  Failed HTTP: ${statuses.join(", ")}`);
  }

  return { ok, total: count, avg };
}

// ── Test suites ───────────────────────────────────────────────────
const suites = [
  {
    name: "GET /  (home page)",
    fn:   () => request(`${BASE}/`),
  },
  {
    name: "GET /pricing  (pricing page)",
    fn:   () => request(`${BASE}/pricing`),
  },
  {
    name: "GET /login  (login page)",
    fn:   () => request(`${BASE}/login`),
  },
  {
    name: "GET /signup  (signup page)",
    fn:   () => request(`${BASE}/signup`),
  },
  {
    name: "GET /robots.txt  (SEO)",
    fn:   () => request(`${BASE}/robots.txt`),
  },
  {
    name: "GET /sitemap.xml  (SEO)",
    fn:   () => request(`${BASE}/sitemap.xml`),
  },
  {
    name: "POST /api/ask — no auth (expects 400 or 403, not 500)",
    fn:   () => request(`${BASE}/api/ask`, {
      method: "POST",
      body:   JSON.stringify({ question: "" }),
    }),
  },
  {
    name: "POST /api/payments/create-order — no auth (expects 401, not 500)",
    fn:   () => request(`${BASE}/api/payments/create-order`, {
      method: "POST",
      body:   JSON.stringify({ plan: "student" }),
    }),
  },
];

// ── Main ──────────────────────────────────────────────────────────
console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║            Ask My Notes — Load Test Runner              ║");
console.log("╚══════════════════════════════════════════════════════════╝");
console.log(`\nTarget  : ${BASE}`);
console.log(`Requests: ${TOTAL} per suite  |  Concurrency: ${CONCURRENCY}`);

const summary = [];

for (const suite of suites) {
  const r = await runSuite(suite.name, suite.fn, TOTAL, CONCURRENCY);
  summary.push({ name: suite.name, ...r });
}

// ── Summary table ─────────────────────────────────────────────────
console.log(`\n${"═".repeat(60)}`);
console.log("SUMMARY");
console.log(`${"═".repeat(60)}`);

let allPassed = true;
for (const s of summary) {
  const rate   = Math.round(s.ok / s.total * 100);
  const icon   = rate === 100 ? "✅" : rate >= 90 ? "⚠️ " : "❌";
  if (rate < 90) allPassed = false;
  console.log(`${icon}  ${String(rate + "%").padStart(4)}  ${s.avg}ms avg  │ ${s.name}`);
}

console.log(`\n${allPassed ? "✅ All suites passed (≥90% success rate)" : "❌ Some suites need attention"}`);
console.log("Load test complete.\n");

process.exit(allPassed ? 0 : 1);
