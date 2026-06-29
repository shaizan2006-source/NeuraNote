import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const GRACE_DAYS = 7; // days before hard deletion executes

/**
 * POST /api/user/delete
 * Schedule account deletion with a 7-day grace period.
 * Requires body: { confirm: "delete my account" }
 *
 * Edge cases handled:
 * - Already scheduled → returns existing date (idempotent)
 * - Missing/wrong confirmation string → 400
 * - DB failure → 500 (user NOT signed out, stays logged in)
 */
export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Require explicit typed confirmation to prevent accidental/CSRF deletion
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Reject non-object payloads (e.g. raw strings, numbers, null)
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  if (body?.confirm !== "delete my account") {
    return NextResponse.json({
      error: 'Confirmation required. Send { "confirm": "delete my account" }',
    }, { status: 400 });
  }

  // Check if already scheduled — idempotent (don't reset the clock)
  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("scheduled_deletion_at")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[user/delete] fetch error:", fetchErr.message);
    return NextResponse.json({ error: "Failed to read profile" }, { status: 500 });
  }

  // No profile row means the user has no study data — safe to still schedule,
  // but upsert guard needed (update affects 0 rows otherwise).
  if (!profile && !fetchErr) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  if (profile?.scheduled_deletion_at) {
    // Already scheduled — idempotent. Return existing date, don't reset clock.
    // Edge case: scheduled_deletion_at already passed (grace expired, cron hasn't run yet)
    const isPastGrace = new Date(profile.scheduled_deletion_at) <= new Date();
    return NextResponse.json({
      scheduled:       true,
      deletion_date:   profile.scheduled_deletion_at,
      already_pending: true,
      grace_expired:   isPastGrace,
      message:         isPastGrace
        ? "Your account is past the grace period and will be deleted shortly."
        : "Account deletion already scheduled. Email support to cancel.",
    });
  }

  const deletionDate = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({
      scheduled_deletion_at: deletionDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[user/delete] schedule error:", updateErr.message);
    return NextResponse.json({ error: "Failed to schedule deletion" }, { status: 500 });
  }

  // Revoke the session only after DB write succeeds. Non-fatal if it fails.
  const token = (req.headers.get("authorization") || "").slice(7);
  if (token) {
    const { error: signOutErr } = await supabaseAdmin.auth.admin.signOut(token).catch((e) => ({ error: e }));
    if (signOutErr) console.warn("[user/delete] signOut failed (non-fatal):", signOutErr.message);
  }

  return NextResponse.json({
    scheduled:     true,
    deletion_date: deletionDate,
    grace_days:    GRACE_DAYS,
    message:       `Account scheduled for permanent deletion on ${new Date(deletionDate).toDateString()}. Email support@askmynotes.in to cancel within ${GRACE_DAYS} days.`,
  });
}

/**
 * PATCH /api/user/delete
 * Cancel a pending deletion during the grace period.
 *
 * Edge cases handled:
 * - No deletion scheduled → 400 (nothing to cancel)
 * - Grace period already expired → 400 (too late, deletion already ran)
 * - DB failure → 500
 */
export async function PATCH(req) {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("scheduled_deletion_at")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: "Failed to read profile" }, { status: 500 });
  }

  if (!profile?.scheduled_deletion_at) {
    return NextResponse.json({
      error: "No deletion is scheduled for this account.",
    }, { status: 400 });
  }

  // Too late — grace period passed (cron may have already run)
  if (new Date(profile.scheduled_deletion_at) <= new Date()) {
    return NextResponse.json({
      error: "Grace period has expired. Contact support@askmynotes.in immediately.",
    }, { status: 400 });
  }

  const { error: cancelErr } = await supabaseAdmin
    .from("profiles")
    .update({ scheduled_deletion_at: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (cancelErr) {
    return NextResponse.json({ error: "Failed to cancel deletion" }, { status: 500 });
  }

  return NextResponse.json({
    cancelled: true,
    message:   "Account deletion cancelled. Your data is safe.",
  });
}

// DELETE verb is intentionally not exported. Using PATCH for cancellation
// avoids the ambiguity of DELETE /api/user/delete meaning two opposite things.
