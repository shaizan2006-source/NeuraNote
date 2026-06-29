import { NextResponse } from "next/server";

/**
 * Root proxy — API auth gate (Next.js 16+ uses proxy.js instead of middleware.ts)
 *
 * Enforces that a Bearer token is present on every private /api/* route.
 * The actual JWT verification happens inside each route via verifyAuth(req).
 * This proxy is a fast first line of defence: rejects requests that carry
 * no token without making a network round-trip to Supabase.
 *
 * WHITELIST — routes that are intentionally public (no Bearer required):
 *   /api/health              — health check
 *   /api/waitlist            — pre-auth signup
 *   /api/payments/webhook    — Razorpay HMAC-signed webhook
 *   /api/webhooks/*          — external webhooks (WhatsApp etc.)
 *   /api/cron/*              — Vercel cron jobs (protected by CRON_SECRET)
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

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Only gate /api/* routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
  ],
};
