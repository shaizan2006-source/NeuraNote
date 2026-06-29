/**
 * Structured JSON logger for server-side API routes.
 *
 * Every log line is a JSON object on stdout — Vercel/Sentry parse this
 * automatically. Fields included:
 *   level, ts, message, ...context
 *
 * Edge cases handled:
 * - Circular references in context → replaced with "[Circular]"
 * - Non-serialisable values (BigInt, Function) → converted to strings
 * - PII fields auto-stripped from context (email, phone, ip)
 * - Errors → serialised with message + stack
 * - Usage in edge runtime → no Node-only APIs used
 */

const PII_KEYS = new Set(["email", "phone", "ip", "ip_address", "billing_email", "full_name"]);
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const MIN_LEVEL = process.env.LOG_LEVEL
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // Strip PII keys
    if (PII_KEYS.has(key)) return "[redacted]";

    // Circular reference guard
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }

    // Serialise Error instances
    if (value instanceof Error) {
      return { error: value.message, stack: value.stack?.split("\n").slice(0, 5).join(" | ") };
    }

    // BigInt / Function → string
    if (typeof value === "bigint")   return value.toString();
    if (typeof value === "function") return "[Function]";

    return value;
  });
}

function write(level, message, context = {}) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    level,
    ts:      new Date().toISOString(),
    message: String(message),
    ...context,
  };

  const line = safeStringify(entry);

  if (level === "ERROR") {
    process.stderr?.write?.(line + "\n") ?? console.error(line);
  } else {
    process.stdout?.write?.(line + "\n") ?? console.log(line);
  }
}

export const logger = {
  debug: (msg, ctx)  => write("DEBUG", msg, ctx),
  info:  (msg, ctx)  => write("INFO",  msg, ctx),
  warn:  (msg, ctx)  => write("WARN",  msg, ctx),
  error: (msg, ctx)  => write("ERROR", msg, ctx),
};

/**
 * Build a request-scoped child logger that pre-populates route + request_id.
 * Usage:
 *   const log = requestLogger(req, "api/ask");
 *   log.info("cache hit", { cache_key: key });
 */
export function requestLogger(req, route) {
  const requestId = req?.headers?.get?.("x-vercel-id")
    ?? req?.headers?.get?.("x-request-id")
    ?? Math.random().toString(36).slice(2, 9);

  const base = { route, request_id: requestId };
  const t0 = Date.now();

  return {
    debug: (msg, ctx) => write("DEBUG", msg, { ...base, ...ctx }),
    info:  (msg, ctx) => write("INFO",  msg, { ...base, ...ctx }),
    warn:  (msg, ctx) => write("WARN",  msg, { ...base, ...ctx }),
    error: (msg, ctx) => write("ERROR", msg, { ...base, ...ctx }),
    /** Call at end of request to log duration */
    done:  (status, ctx) => write("INFO", "request complete", { ...base, status, duration_ms: Date.now() - t0, ...ctx }),
  };
}

export default logger;
