/**
 * Generic exponential-backoff retry utility.
 *
 * Edge cases handled:
 * - Non-retryable errors (4xx except 429) → throw immediately, no retry
 * - jitter added to backoff → prevents thundering-herd when many requests fail together
 * - maxDelay cap → prevents absurdly long waits on high attempt counts
 * - AbortSignal support → cancel pending retries (e.g. client disconnected)
 * - synchronous throw vs rejected promise → both treated identically
 * - zero maxRetries → single attempt, no retry (behaviour matches maxRetries=0)
 */

const DEFAULT_BASE_MS  = 500;
const DEFAULT_MAX_MS   = 30_000;
const DEFAULT_RETRIES  = 3;

/**
 * Determine whether an error is worth retrying.
 * Conservative: only retry on explicitly transient signals.
 */
export function isRetryable(err) {
  // Network-level transients
  if (/timeout|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE|ECONNREFUSED/i.test(err?.message ?? "")) return true;

  const status = err?.status ?? err?.response?.status ?? err?.statusCode;
  if (!status) return false;

  if (status === 429) return true;          // rate limit — always retry
  if (status >= 500 && status < 600) return true; // server errors
  return false;                             // 4xx client errors: don't retry
}

/**
 * Compute delay with full-jitter exponential backoff.
 * delay = random(0, min(maxDelay, baseMs * 2^attempt))
 */
function backoffMs(attempt, baseMs, maxDelay) {
  const cap = Math.min(maxDelay, baseMs * Math.pow(2, attempt));
  return Math.floor(Math.random() * cap);
}

/**
 * Retry `fn` up to `maxRetries` times on retryable errors.
 *
 * @param {() => Promise<T>}   fn
 * @param {object}             [opts]
 * @param {number}             [opts.maxRetries=3]
 * @param {number}             [opts.baseMs=500]         — base backoff in ms
 * @param {number}             [opts.maxDelayMs=30000]   — backoff cap in ms
 * @param {(err,attempt)=>bool}[opts.retryIf]            — override retry predicate
 * @param {AbortSignal}        [opts.signal]             — cancel outstanding retries
 * @param {string}             [opts.label=""]           — label for error messages
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const {
    maxRetries  = DEFAULT_RETRIES,
    baseMs      = DEFAULT_BASE_MS,
    maxDelayMs  = DEFAULT_MAX_MS,
    retryIf     = isRetryable,
    signal      = null,
    label       = "",
  } = opts;

  if (maxRetries < 0) throw new RangeError("withRetry: maxRetries must be >= 0");

  let lastErr;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new RetryAbortedError(`${label} retries aborted by signal`);
    }

    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const shouldRetry = attempt < maxRetries && retryIf(err);
      if (!shouldRetry) break;

      const delay = backoffMs(attempt, baseMs, maxDelayMs);
      await sleep(delay, signal);
    }
  }

  // Preserve original error stack; annotate with retry context
  const tag = label ? ` [${label}]` : "";
  const msg = `${lastErr?.message ?? String(lastErr)}${tag} (failed after ${maxRetries + 1} attempt(s))`;
  const wrapped = new RetryExhaustedError(msg, { cause: lastErr });
  throw wrapped;
}

export class RetryExhaustedError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "RetryExhaustedError";
  }
}

export class RetryAbortedError extends Error {
  constructor(message) {
    super(message);
    this.name = "RetryAbortedError";
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (ms <= 0) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new RetryAbortedError("Sleep aborted"));
    }, { once: true });
  });
}
