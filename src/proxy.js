import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// Auth is enforced client-side in DashboardContext (redirects to /login if no session).
// This proxy handles the /login redirect param for page routes, AND (F-040) adds best-effort
// rate limiting on /api/*: the app had no throttle anywhere, so a single token or IP could
// flood the expensive AI/render endpoints. Webhooks and cron are exempt (trusted/retrying
// machine callers — Razorpay, Vercel Cron). See rateLimit.js for the per-instance caveat and
// the Vercel KV / Upstash upgrade path.

const EXEMPT = [/^\/api\/payments\/webhook/, /^\/api\/cron\//];
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
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/") && !EXEMPT.some((re) => re.test(path))) {
    const expensive = EXPENSIVE.some((re) => re.test(path));
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
  matcher: ["/dashboard/:path*", "/chat/:path*", "/api/:path*"],
};
