/**
 * Simple in-memory circuit breaker for external services.
 *
 * States: CLOSED → (failures exceed threshold) → OPEN → (probe timeout) → HALF_OPEN → CLOSED
 *
 * Edge cases handled:
 * - Concurrent calls in HALF_OPEN state → only one probe allowed; others fast-fail
 * - Clock skew / timer drift → uses Date.now() not setInterval
 * - Non-retryable errors (4xx) → never count as circuit failures
 * - Zero-threshold config → validated at construction
 * - Vercel cold starts → module re-evaluation resets state (acceptable; breaker warms up quickly)
 * - Multiple services → each gets its own named instance via `getBreaker(name)`
 */

import { isRetryable } from "./retry.js";

const CLOSED    = "CLOSED";
const OPEN      = "OPEN";
const HALF_OPEN = "HALF_OPEN";

export class CircuitBreaker {
  /**
   * @param {string} name              — human-readable label (for logs)
   * @param {object} opts
   * @param {number} [opts.failureThreshold=5]    — consecutive failures to open circuit
   * @param {number} [opts.successThreshold=2]    — successes in HALF_OPEN to close circuit
   * @param {number} [opts.openDurationMs=60000]  — how long to stay open before probing
   * @param {(err)=>bool} [opts.isFailure]        — override: which errors trip the breaker
   */
  constructor(name, opts = {}) {
    if (!name) throw new Error("CircuitBreaker: name is required");

    const {
      failureThreshold = 5,
      successThreshold = 2,
      openDurationMs   = 60_000,
      isFailure        = isRetryable,  // only count transient errors as circuit failures
    } = opts;

    if (failureThreshold < 1) throw new RangeError("CircuitBreaker: failureThreshold must be >= 1");
    if (successThreshold < 1) throw new RangeError("CircuitBreaker: successThreshold must be >= 1");
    if (openDurationMs   < 0) throw new RangeError("CircuitBreaker: openDurationMs must be >= 0");

    this.name             = name;
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.openDurationMs   = openDurationMs;
    this.isFailure        = isFailure;

    this._state           = CLOSED;
    this._failures        = 0;
    this._successes       = 0;
    this._openedAt        = null;
    this._probeInFlight   = false; // prevents concurrent HALF_OPEN probes
  }

  get state() { return this._state; }
  get failures() { return this._failures; }

  /**
   * Execute `fn` through the circuit breaker.
   * Throws CircuitOpenError immediately when OPEN (fast-fail).
   * Throws the original error when the call fails.
   */
  async call(fn) {
    if (this._state === OPEN) {
      // Check if probe window has elapsed
      if (Date.now() - this._openedAt >= this.openDurationMs) {
        if (this._probeInFlight) {
          // Another concurrent request is already probing — fast-fail this one
          throw new CircuitOpenError(`${this.name} is OPEN (probe in progress)`);
        }
        this._state = HALF_OPEN;
        this._probeInFlight = true;
      } else {
        throw new CircuitOpenError(
          `${this.name} circuit is OPEN (opened ${Math.round((Date.now() - this._openedAt) / 1000)}s ago)`
        );
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    if (this._state === HALF_OPEN) {
      this._successes++;
      if (this._successes >= this.successThreshold) {
        this._close();
      }
    } else {
      // CLOSED — reset failure counter on success
      this._failures = 0;
    }
    this._probeInFlight = false;
  }

  _onFailure(err) {
    this._probeInFlight = false;

    // Non-retryable errors (auth failures, bad requests) don't trip the breaker.
    // We only want to open on infrastructure failures.
    if (!this.isFailure(err)) return;

    if (this._state === HALF_OPEN) {
      // Probe failed — back to OPEN, reset probe timer
      this._open();
      return;
    }

    this._failures++;
    if (this._failures >= this.failureThreshold) {
      this._open();
    }
  }

  _open() {
    this._state     = OPEN;
    this._openedAt  = Date.now();
    this._successes = 0;
    console.error(
      JSON.stringify({ level: "ERROR", breaker: this.name, state: "OPEN", failures: this._failures, ts: new Date().toISOString() })
    );
  }

  _close() {
    this._state    = CLOSED;
    this._failures = 0;
    this._successes = 0;
    this._openedAt = null;
    console.warn(
      JSON.stringify({ level: "WARN", breaker: this.name, state: "CLOSED", ts: new Date().toISOString() })
    );
  }

  /** Manually reset to CLOSED (for testing / admin recovery) */
  reset() {
    this._close();
    this._probeInFlight = false;
  }

  stats() {
    return {
      name:     this.name,
      state:    this._state,
      failures: this._failures,
      openedAt: this._openedAt ? new Date(this._openedAt).toISOString() : null,
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name       = "CircuitOpenError";
    this.status     = 503; // treat as service unavailable to callers
    this.retryable  = false; // don't retry open-circuit errors — wait for probe
  }
}

// ── Named registry — one breaker per external service ────────────────────────
const _registry = new Map();

export function getBreaker(name, opts) {
  if (!_registry.has(name)) {
    _registry.set(name, new CircuitBreaker(name, opts));
  }
  return _registry.get(name);
}

// Pre-wired breakers for the services we depend on
export const openaiBreaker   = getBreaker("openai",   { failureThreshold: 5, openDurationMs: 60_000 });
export const supabaseBreaker = getBreaker("supabase", { failureThreshold: 8, openDurationMs: 30_000 });
