/**
 * In-memory sliding-window rate limiter (F-040).
 *
 * STOPGAP: state lives in a per-instance Map, so on serverless/edge it is per-instance —
 * it reliably stops a single client hammering one instance, but a burst fanned across many
 * instances is only softly limited. For distributed correctness, swap the Map for Vercel KV
 * or Upstash Redis behind this same `rateLimit(key, limit, windowMs)` signature (no new
 * dependency is needed until you make that call).
 *
 * Edge-safe: uses only Map + Date.now() (no Node APIs), so it works inside middleware.
 */
const buckets = new Map(); // key -> number[] of request timestamps (ms)

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) || []).filter((ts) => ts > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { allowed: false, retryAfter };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic GC so the Map can't grow unbounded on a long-lived warm instance.
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v[v.length - 1] <= cutoff) buckets.delete(k);
    }
  }

  return { allowed: true, remaining: limit - hits.length };
}
