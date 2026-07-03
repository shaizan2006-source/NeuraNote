import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Root proxy — API auth + rate-limit gate (Next.js 16+ uses proxy.js instead of middleware.ts)
 *
 * 1. Auth gate: rejects requests to private /api/* routes that carry no Bearer token,
 *    without a network round-trip to Supabase. The actual JWT verification happens
 *    inside each route via verifyAuth(req) — this is a fast first line of defence.
 * 2. F-040 rate limiting: the app had no throttle anywhere, so a single token or IP
 *    could flood the expensive AI/render endpoints. Webhooks and cron are exempt
 *    (trusted/retrying machine callers — Razorpay, Vercel Cron). See rateLimit.js
 *    for the per-instance caveat and the Vercel KV / Upstash upgrade path.
 *
 * WHITELIST — routes that are intentionally public (no Bearer required, still rate-limited):
 *   /api/health              — health check
 *   /api/waitlist            — pre-auth signup
 *   /api/payments/webhook    — Razorpay HMAC-signed webhook (also rate-limit exempt)
 *   /api/webhooks/*          — external webhooks (WhatsApp etc.)
 *   /api/cron/*              — Vercel cron jobs, protected by CRON_SECRET (also rate-limit exempt)
 *   /api/pyqs/*              — public PYQ pages and search
 *   /api/exam                — public exam metadata
 *   /api/syllabus            — public syllabus content
 *   /api/ai/focus-tip        — static tips, no user data
 *   /auth/*                  — Supabase Auth callback routes
 */

const PUBLIC_PREFIXES = [
  "/api/health",
  "/api/waitlist",
  "/api/payments/webhook",
  "/api/webhooks/",
  "/api/cron/",
  "/api/pyqs/",
  "/api/exam",
  "/api/syllabus",
  "/api/ai/focus-tip",
  "/api/generate-document",
  "/auth/",
];

const PUBLIC_EXACT = new Set([
  "/api/health",
  "/api/waitlist",
  "/api/exam",
  "/api/syllabus",
]);

function isPublic(pathname) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

// Rate-limit exemptions — trusted/retrying machine callers (Razorpay, Vercel Cron).
const RATE_LIMIT_EXEMPT = [/^\/api\/payments\/webhook/, /^\/api\/cron\//];
const EXPENSIVE = [
  /^\/api\/ask(\/|$)/,
  /^\/api\/ask-ai/,
  /^\/api\/quick-chat/,
  /^\/api\/process-pdf/,
  /^\/api\/generate-/,
  /^\/api\/voice\//,
  /^\/api\/photo-doubt/,
  /^\/api\/artifacts\//,
];

function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Only gate /api/* routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (!isPublic(pathname)) {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  if (!RATE_LIMIT_EXEMPT.some((re) => re.test(pathname))) {
    const expensive = EXPENSIVE.some((re) => re.test(pathname));
    // Expensive endpoints: key by the bearer token when present (per-account — survives IP
    // rotation), else by IP. Cheap endpoints: per-IP. The token tail buckets a caller without
    // verifying the JWT here (a forged token just gets its own bucket).
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const key = expensive && token ? `u:${token.slice(-32)}` : `ip:${clientIp(request)}`;
    const { limit, windowMs } = expensive
      ? { limit: 20, windowMs: 60_000 }   // 20 expensive calls / minute / caller
      : { limit: 120, windowMs: 60_000 }; // 120 other API calls / minute / IP

    const r = rateLimit(`${expensive ? "x" : "g"}:${key}`, limit, windowMs);
    if (!r.allowed) {
      return NextResponse.json(
        { error: "Too many requests — please slow down." },
        { status: 429, headers: { "Retry-After": String(r.retryAfter) } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
