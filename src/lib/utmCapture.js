/**
 * UTM capture and persistence.
 * Call captureUtm() on every page load — it reads URL params and
 * stores them in sessionStorage so they survive redirects (e.g. OAuth).
 * Call getStoredUtm() when creating a profile to retrieve the values.
 */

const STORAGE_KEY = "amn_utm";
const UTM_PARAMS  = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/**
 * Read UTM params from the current URL and persist them to sessionStorage.
 * Only overwrites if new params are present (first-touch attribution).
 */
export function captureUtm() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  const captured = {};
  for (const key of UTM_PARAMS) {
    const val = params.get(key);
    if (val) captured[key] = val.slice(0, 200);
  }

  if (Object.keys(captured).length === 0) return;

  // First-touch: only store if nothing is already stored
  const existing = getStoredUtm();
  if (existing.utm_source) return;

  captured.referrer_url = document.referrer?.slice(0, 500) || null;
  captured.landing_page = window.location.pathname;
  captured.captured_at  = new Date().toISOString();

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
  } catch {
    // sessionStorage unavailable (private browsing edge cases)
  }
}

/**
 * Retrieve stored UTM params. Returns empty object if nothing stored.
 */
export function getStoredUtm() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Clear stored UTM after they've been persisted to the DB.
 */
export function clearStoredUtm() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Map stored UTM to the profile column names used in the DB.
 */
export function utmToProfileFields(utm) {
  return {
    referral_source: utm.utm_source   ?? null,
    utm_medium:      utm.utm_medium   ?? null,
    utm_campaign:    utm.utm_campaign ?? null,
    referrer_url:    utm.referrer_url ?? null,
  };
}
