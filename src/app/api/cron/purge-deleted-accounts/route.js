import { supabaseAdmin } from "@/lib/serverAuth";
import { anonymizeUser } from "@/lib/privacy/anonymize";
import { cronSecretValid } from "@/lib/security/cronAuth";

export const maxDuration = 300;

export async function GET(req) {
  // cronSecretValid handles missing env var, empty inputs, and timing-safe comparison
  if (!cronSecretValid(req)) {
    return new Response(null, { status: 401 });
  }

  const now = new Date().toISOString();

  const { data: pending, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("id, scheduled_deletion_at")
    .lte("scheduled_deletion_at", now)
    .is("deleted_at", null)
    .limit(100);

  if (fetchErr) {
    console.error("[purge-deleted-accounts] fetch failed:", fetchErr.message);
    return Response.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  if (!pending?.length) {
    return Response.json({ ok: true, purged: 0, message: "No accounts pending deletion" });
  }

  const results = { purged: 0, failed: 0, errors: [] };

  for (const profile of pending) {
    // Wrap in try/catch — anonymizeUser should never throw, but guard anyway
    let result;
    try {
      result = await anonymizeUser(profile.id);
    } catch (err) {
      console.error(`[purge-deleted-accounts] unexpected throw for ${profile.id}:`, err.message);
      result = { anonymised: false, errors: [{ step: "unexpected_throw", error: err.message }] };
    }

    if (result.skipped) {
      // Already anonymised on a previous run — count as success
      results.purged++;
    } else if (result.anonymised) {
      results.purged++;
      console.log(`[purge-deleted-accounts] purged ${profile.id}`);
    } else {
      results.failed++;
      results.errors.push({ userId: profile.id, errors: result.errors });
      console.error(`[purge-deleted-accounts] partial failure for ${profile.id}:`, result.errors);
    }
  }

  return Response.json({
    ok:     true,
    purged: results.purged,
    failed: results.failed,
    errors: results.errors,
    ran_at: now,
  });
}
