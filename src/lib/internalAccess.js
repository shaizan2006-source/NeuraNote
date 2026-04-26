/**
 * internalAccess — Developer / Internal Staff Override System
 *
 * Grants permanent unrestricted access to designated internal developer
 * accounts for testing purposes. All other users are completely unaffected.
 *
 * DESIGN:
 *   - Role stored in Supabase `app_metadata.role` (server-side only, writable
 *     only via service-role API — users cannot self-assign this).
 *   - Role value: "internal_dev"
 *   - No extra DB query: the `user` object returned by `supabase.auth.getUser(token)`
 *     already contains `app_metadata`, so checks are zero-cost.
 *   - All privilege checks stay server-side; nothing leaks to client.
 *
 * ADDING NEW INTERNAL ACCOUNTS:
 *   Run `node scripts/setup-dev-accounts.mjs --email=new@example.com`
 *   to create and mark any additional internal tester accounts. The code
 *   here never needs to change — role assignment lives in the database.
 *
 * PRODUCTION SAFETY:
 *   In production, internal_dev accounts still work (intentional — they need
 *   to test prod). Set DISABLE_INTERNAL_DEV_OVERRIDE=true in your production
 *   env to fully disable overrides if you ever need a hard lock.
 */

/** @returns {boolean} true if the user has internal developer override access. */
export function isInternalDev(user) {
  if (!user) return false;

  // Hard-kill switch for production environments (set in env to disable).
  if (process.env.DISABLE_INTERNAL_DEV_OVERRIDE === "true") return false;

  return user.app_metadata?.role === "internal_dev";
}

/**
 * Pre-built bypass response for `canUploadPDF` / `canAskQuestion` style checks.
 * Callers can spread this directly: `if (isInternalDev(user)) return DEV_ALLOWED;`
 */
export const DEV_ALLOWED = Object.freeze({ allowed: true, _devOverride: true });

/**
 * Pre-built bypass plan string (highest-tier equivalent for all limit checks).
 * Use in `getUserPlan` returns or anywhere plan tier is needed.
 */
export const DEV_PLAN = "school";
