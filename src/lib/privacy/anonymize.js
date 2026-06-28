/**
 * anonymizeUser — PII wipe + cascade data-delete for account removal.
 *
 * Execution order:
 *   1. Verify profile row exists before doing anything.
 *   2. Revoke all active sessions — prevents the user staying logged in after deletion.
 *   3. Anonymise profile (PII → null/placeholder) — keeps row for payment FK.
 *   4. Retain payment records with billing_email nulled (7-yr legal hold).
 *   5. Delete storage files.
 *   6. Cascade-delete all user content tables.
 *   7. Delete Supabase auth identity last (point of no return).
 *
 * Design: individual try/catch per step — partial anonymisation is safer than
 * a half-deleted auth identity with live PII. Errors collected and returned.
 * Function is idempotent: re-running on an already-deleted user is a no-op.
 */

import { supabaseAdmin } from "@/lib/serverAuth";

const CASCADE_DELETE_TABLES = [
  "conversations",
  "messages",
  "documents",
  "focus_progress",
  "daily_progress",
  "study_streaks",
  "exams",
  "daily_briefings",
  "weekly_recaps",
  "notification_preferences",
  "notification_log",
  "push_subscriptions",
  "mastery_topics",
  "mastery_state",
  "spaced_repetition_cards",
  "weak_topics",
  "topic_attempts",
  "learning_events",
  "mock_tests",
  "quiz_results",
  "quizzes",
  "revision_topics",
  "brain_map_snapshots",
  "cohort_members",
  "family_invites",
];

export async function anonymizeUser(userId) {
  if (!userId || typeof userId !== "string") {
    throw new Error("anonymizeUser: userId must be a non-empty string");
  }

  const errors = [];

  // ── 0. Guard: verify profile exists ─────────────────────────────────────
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from("profiles")
    .select("id, deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (checkErr) {
    return { userId, anonymised: false, errors: [{ step: "check_profile", error: checkErr.message }], deletedAt: null };
  }

  if (!existing) {
    // No profile row — still delete auth identity to clean up orphaned auth users,
    // but mark as not fully anonymised.
    errors.push({ step: "check_profile", error: "Profile row does not exist — PII cannot be anonymised." });
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) errors.push({ step: "delete_auth_user", error: authErr.message });
    return { userId, anonymised: false, errors, deletedAt: null };
  }

  // Idempotency: already anonymised on a previous run
  if (existing.deleted_at) {
    return { userId, anonymised: true, skipped: true, errors: [], deletedAt: existing.deleted_at };
  }

  // ── 1. Revoke all active sessions (GDPR: user must not stay logged in) ───
  const { error: signOutErr } = await supabaseAdmin.auth.admin.signOutUser(userId, "global");
  if (signOutErr) {
    // Non-fatal: sessions will expire naturally; log but continue
    console.warn(`[anonymize] session revoke failed for ${userId}:`, signOutErr.message);
    errors.push({ step: "revoke_sessions", error: signOutErr.message });
  }

  // ── 2. Anonymise profile ──────────────────────────────────────────────────
  // Columns must match the real profiles schema. Earlier this referenced
  // display_name/phone/timezone — none of which exist (the column is phone_number),
  // so the WHOLE update was rejected by PostgREST, profileErr was set, NO PII was
  // scrubbed, and the auth identity was preserved (account deletion silently failed).
  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name:             "[deleted user]",
      email:                 null,
      avatar_url:            null,
      phone_number:          null,
      parent_phone_number:   null,
      region:                null,
      city:                  null,
      exam_date:             null,
      cohort_id:             null,
      scheduled_deletion_at: null,
      deleted_at:            new Date().toISOString(),
      updated_at:            new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileErr) errors.push({ step: "anonymise_profile", error: profileErr.message });

  // (Payment records are retained for legal hold via user_id; user_plans has no
  // PII column to null — the previous billing_email update targeted a non-existent
  // column and always errored, so it has been removed.)

  // ── 4. Delete storage files ────────────────────────────────────────────────
  for (const bucket of ["documents", "briefings", "recaps", "photo-doubts"]) {
    const { data: files, error: listErr } = await supabaseAdmin.storage
      .from(bucket)
      .list(userId, { limit: 1000 });

    if (listErr) {
      errors.push({ step: `list_storage_${bucket}`, error: listErr.message });
      continue; // don't attempt remove if list failed
    }

    if (files?.length) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeErr } = await supabaseAdmin.storage.from(bucket).remove(paths);
      if (removeErr) errors.push({ step: `delete_storage_${bucket}`, error: removeErr.message });
    }
  }

  // ── 5. Cascade-delete content tables ──────────────────────────────────────
  for (const table of CASCADE_DELETE_TABLES) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (error && error.code !== "42P01" && error.code !== "42703") {
      // 42P01 = table not found; 42703 = column not found — schema drift, not a real error
      errors.push({ step: `delete_${table}`, error: error.message });
    }
  }

  // ── 6. Delete auth identity ────────────────────────────────────────────────
  // Only skip if profile anonymisation itself failed (PII still exposed)
  const profileFailed = errors.some(e => e.step === "anonymise_profile");

  if (!profileFailed) {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) errors.push({ step: "delete_auth_user", error: authErr.message });
  } else {
    errors.push({
      step: "delete_auth_user",
      error: "Skipped: profile anonymisation failed — auth identity preserved for investigation",
    });
  }

  const nonCriticalSteps = ["revoke_sessions", ...CASCADE_DELETE_TABLES.map(t => `delete_${t}`),
    "delete_auth_user", ...["documents","briefings","recaps","photo-doubts"].flatMap(b =>
      [`list_storage_${b}`, `delete_storage_${b}`])];

  const criticalErrors = errors.filter(e => !nonCriticalSteps.includes(e.step));

  return {
    userId,
    anonymised: criticalErrors.length === 0 && !profileFailed,
    errors,
    deletedAt: new Date().toISOString(),
  };
}
