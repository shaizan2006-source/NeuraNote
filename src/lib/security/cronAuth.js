/**
 * Timing-safe CRON_SECRET validation shared by all cron routes.
 *
 * Why: JavaScript's `!==` operator is NOT constant-time. An attacker who can
 * measure response latency can extract the secret one character at a time.
 * `crypto.timingSafeEqual` always takes the same time regardless of content,
 * eliminating the timing side-channel.
 *
 * Usage in any cron route:
 *   import { cronSecretValid } from "@/lib/security/cronAuth";
 *   if (!cronSecretValid(req)) return new Response(null, { status: 401 });
 */
import { timingSafeEqual } from "node:crypto";

export function cronSecretValid(req) {
  const provided = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";

  // Both empty → reject (misconfiguration, not a match)
  if (!provided || !expected) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  // timingSafeEqual requires equal-length buffers; length mismatch → not equal
  if (a.byteLength !== b.byteLength) return false;

  return timingSafeEqual(a, b);
}
