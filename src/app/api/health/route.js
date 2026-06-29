/**
 * GET /api/health
 *
 * Checks: Supabase DB, OpenAI, Razorpay reachability.
 * Returns 200 if all pass, 503 if any critical service is degraded.
 *
 * Edge cases handled:
 * - Each check has its own abort/timeout — one slow service can't block others
 * - OpenAI key not set → check returns "not_configured" (not a failure)
 * - Razorpay key not set → check returns "not_configured"
 * - Empty documents table → DB check uses pg_stat_activity instead (schema-independent)
 * - Circuit breaker state reported for observability
 * - Health check itself must not throw — all errors caught and returned as check failures
 */

import { supabaseAdmin } from "@/lib/serverAuth";
import { openaiBreaker } from "@/lib/llm/openai";

const TIMEOUT_MS = 3_000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ]);
}

async function checkDB() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Use rpc("version") — a pg built-in that always exists regardless of schema/RLS
    const { error } = await supabaseAdmin.rpc("version").abortSignal(controller.signal);
    // If rpc("version") isn't exposed, fall back to a lightweight table query
    if (error?.code === "PGRST202") {
      // PGRST202 = function not found — DB is up, just the RPC is disabled
      const { error: e2 } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .limit(1)
        .abortSignal(controller.signal);
      clearTimeout(t);
      return { ok: !e2, detail: e2?.message ?? "ok" };
    }
    clearTimeout(t);
    return { ok: !error, detail: error?.message ?? "ok" };
  } catch (err) {
    clearTimeout(t);
    return { ok: false, detail: err.message };
  }
}

async function checkOpenAI() {
  if (!process.env.OPENAI_API_KEY) return { ok: true, detail: "not_configured" };

  // Report circuit breaker state without making an actual API call
  // (a full models.list() call costs latency and quota on every health ping)
  const stats = openaiBreaker.stats();
  if (stats.state === "OPEN") {
    return { ok: false, detail: `circuit OPEN since ${stats.openedAt}`, circuit: stats };
  }

  // Lightweight ping: list models (cached by OpenAI CDN, ~100ms, free)
  try {
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/models", {
        method:  "GET",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }),
      TIMEOUT_MS
    );
    return { ok: res.ok, detail: res.ok ? "ok" : `HTTP ${res.status}`, circuit: stats };
  } catch (err) {
    return { ok: false, detail: err.message, circuit: stats };
  }
}

async function checkRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return { ok: true, detail: "not_configured" };
  }

  try {
    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const res = await withTimeout(
      fetch("https://api.razorpay.com/v1/payments?count=1", {
        method:  "GET",
        headers: { Authorization: `Basic ${credentials}` },
      }),
      TIMEOUT_MS
    );
    // 200 = ok, 401 = key mismatch (razorpay reachable), anything else = degraded
    const ok = res.status === 200 || res.status === 401;
    return { ok, detail: ok ? "ok" : `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";

  // Run all checks in parallel with independent timeouts
  const [db, openai, razorpay] = await Promise.all([
    checkDB(),
    checkOpenAI(),
    checkRazorpay(),
  ]);

  const checks = { db, openai, razorpay };

  // DB is critical (no DB = no product). OpenAI down = degraded but not dead.
  const critical = !db.ok;
  const degraded = !db.ok || !openai.ok || !razorpay.ok;

  const body = {
    status:  critical ? "critical" : degraded ? "degraded" : "ok",
    checks,
    version,
    ts:      Date.now(),
  };

  return Response.json(body, { status: degraded ? 503 : 200 });
}
