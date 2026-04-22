// src/utils/quizResilience.js

// ── CircuitBreaker ─────────────────────────────────────────────────────────
// Opens after `threshold` consecutive failures. Auto-resets after `resetMs`.
export class CircuitBreaker {
  constructor(threshold = 5, resetMs = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.resetMs = resetMs;
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetMs) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error('CIRCUIT_BREAKER_OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold || this.state === 'HALF_OPEN') {
        this.state = 'OPEN';
      }
      throw err;
    }
  }
}

// ── retryWithBackoff ───────────────────────────────────────────────────────
// Retries `fn` up to `maxRetries` times. Delays: 1s, 2s, 4s (exponential).
// Does NOT retry on 401/403 (auth errors).
export async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 1000, timeoutMs = 30000) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs)
        ),
      ]);
    } catch (err) {
      lastError = err;
      const status = err?.status ?? err?.statusCode ?? err?.response?.status;
      if (status === 401 || status === 403) throw err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ── makeSingleRequest ──────────────────────────────────────────────────────
// Prevents duplicate in-flight requests for the same key.
// Client-side only: deduplicates in-flight requests within a single browser session.
// Has no effect in serverless (each invocation gets an isolated module).
const _pending = new Map();
export async function makeSingleRequest(key, fn) {
  if (_pending.has(key)) return _pending.get(key);
  const promise = fn().finally(() => _pending.delete(key));
  _pending.set(key, promise);
  return promise;
}
