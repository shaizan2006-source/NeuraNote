// IST (Asia/Kolkata, UTC+05:30) date helpers.
// India does not observe DST, so the offset is always fixed.
//
// WHY: Vercel cron runs in UTC. Every server-side "today" / "yesterday"
// must be in IST, not UTC — otherwise briefings and streak evaluations
// are off by a day for users who study after 18:30 UTC (midnight IST).

const IST_TZ = "Asia/Kolkata";

// Formatter instances are cheap to reuse across calls.
const isoDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Returns the IST calendar date for a given UTC instant as "YYYY-MM-DD".
 * Falls back to ISO UTC slice if Intl is unavailable (edge environments).
 *
 * @param {Date|number} [at=Date.now()] — UTC instant to convert
 * @returns {string} e.g. "2025-10-15"
 */
export function dateIST(at = Date.now()) {
  const d = at instanceof Date ? at : new Date(at);
  try {
    // en-CA produces YYYY-MM-DD which is already ISO-like and safe to use as-is
    return isoDateFmt.format(d);
  } catch {
    // Intl unavailable — apply fixed +5:30 offset manually
    const offsetMs = 5.5 * 60 * 60 * 1000;
    return new Date(d.getTime() + offsetMs).toISOString().slice(0, 10);
  }
}

/**
 * Returns today's IST date as "YYYY-MM-DD".
 */
export function todayIST() {
  return dateIST(Date.now());
}

/**
 * Returns yesterday's IST date as "YYYY-MM-DD".
 * Safe against month/year rollovers.
 */
export function yesterdayIST() {
  // Subtract 24 h from current UTC — this always gives the previous IST
  // calendar day (India has no DST, so 24 h ago in IST is always yesterday).
  return dateIST(Date.now() - 24 * 60 * 60 * 1000);
}

/**
 * Returns the IST date N full days before the given instant.
 *
 * @param {number} n — days to subtract (must be >= 0)
 * @param {Date|number} [at=Date.now()]
 * @returns {string} "YYYY-MM-DD"
 */
export function daysAgoIST(n, at = Date.now()) {
  if (n < 0) throw new RangeError(`daysAgoIST: n must be >= 0, got ${n}`);
  const base = at instanceof Date ? at.getTime() : at;
  return dateIST(base - n * 24 * 60 * 60 * 1000);
}

/**
 * Formats a UTC ISO timestamp for display in IST using Indian conventions.
 * Returns strings like "15 Oct 2025" or "2:00 PM" depending on format.
 *
 * @param {string|Date} ts — UTC timestamp
 * @param {"date"|"time"|"datetime"|"relative"} [fmt="date"]
 * @returns {string}
 */
export function formatIST(ts, fmt = "date") {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  if (isNaN(d)) return "—";

  switch (fmt) {
    case "date":
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TZ,
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);

    case "time":
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);

    case "datetime":
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: IST_TZ,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);

    case "relative": {
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60)  return "just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
      return formatIST(ts, "date");
    }

    default:
      return String(d);
  }
}

/**
 * Formats a number using Indian locale (1,00,000 not 100,000).
 * @param {number} n
 * @returns {string}
 */
export function formatIN(n) {
  if (typeof n !== "number" || isNaN(n)) return "—";
  return n.toLocaleString("en-IN");
}

/**
 * Formats a rupee amount using Indian conventions.
 * ₹199 not ₹199.00; ₹1,00,000 not ₹100,000.
 *
 * @param {number} paise — amount in paise (100 paise = ₹1)
 * @returns {string} e.g. "₹199" or "₹1,499"
 */
export function formatINR(paise) {
  if (typeof paise !== "number" || isNaN(paise)) return "—";
  const rupees = paise / 100;
  const formatted = rupees.toLocaleString("en-IN", {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}
