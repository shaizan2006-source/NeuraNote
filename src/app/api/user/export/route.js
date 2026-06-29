import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { todayIST } from "@/lib/format/date";

// One export per user per day — prevents hammering
const EXPORT_COOLDOWN_HOURS = 24;

/**
 * Fetch a table with a user_id filter.
 * Returns { data, error, table } — never throws.
 * On Supabase error the table returns an empty array + records the error.
 */
async function fetchTable(table, userId, select = "*") {
  try {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .eq("user_id", userId);
    return { table, data: data ?? [], error: error?.message ?? null };
  } catch (err) {
    return { table, data: [], error: err.message };
  }
}

/**
 * GET /api/user/export
 * Returns a full GDPR-compliant JSON data export for the authenticated user.
 *
 * Edge cases handled:
 * - Unauthenticated → 401
 * - Rate limited (< 24h since last export) → 429 with retry-after header
 * - Account already deleted/anonymised → 403
 * - Individual table fetch failure → partial data returned, errors listed
 * - Zero data (new user) → all arrays empty, no errors
 * - Conversations table empty → messages query skipped safely
 * - user_plans exported with payment_id redacted (last 4 chars shown only)
 */
export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  // Guard: account already anonymised / hard-deleted
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("full_name, deleted_at, last_export_at")
    .eq("id", uid)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: "Failed to read profile" }, { status: 500 });
  }

  if (profile?.deleted_at) {
    return NextResponse.json(
      { error: "This account has been anonymised and its data is no longer available." },
      { status: 403 }
    );
  }

  // Rate limit: one export per EXPORT_COOLDOWN_HOURS per user
  if (profile?.last_export_at) {
    const lastExport = new Date(profile.last_export_at);
    const now = Date.now();
    // Clock skew guard: if last_export_at is somehow in the future, reject to avoid bypass
    if (lastExport.getTime() > now + 60_000) {
      return NextResponse.json({ error: "Clock skew detected. Contact support." }, { status: 500 });
    }
    const cooldownMs = EXPORT_COOLDOWN_HOURS * 60 * 60 * 1000;
    const retryAfterMs = cooldownMs - (now - lastExport.getTime());
    if (retryAfterMs > 0) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Export rate limit: one export per ${EXPORT_COOLDOWN_HOURS} hours.` },
        {
          status: 429,
          headers: {
            "Retry-After":       String(retryAfterSec),
            "X-RateLimit-Reset": new Date(lastExport.getTime() + cooldownMs).toISOString(),
          },
        }
      );
    }
  }

  // Fetch all user data in parallel — each call is individually resilient
  const fetchErrors = [];

  const [
    profileFull,
    convResult,
    docResult,
    focusResult,
    streakResult,
    examResult,
    quizResult,
    planResult,
    revisionResult,
    pushResult,
    notifPrefResult,
    masteryResult,
    srCardResult,
    weakResult,
    briefingResult,
    weeklyRecapResult,
    dailyProgressResult,
  ] = await Promise.all([
    // Full profile (for export — not filtered)
    supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle()
      .then(r => r),
    fetchTable("conversations", uid, "id,title,created_at"),
    fetchTable("documents", uid, "id,name,subject,page_count,concept_count,created_at"),
    fetchTable("focus_progress", uid),
    fetchTable("study_streaks", uid),
    fetchTable("exams", uid),
    fetchTable("quizzes", uid, "id,score,created_at"),
    fetchTable("user_plans", uid),
    fetchTable("revision_topics", uid, "topic,subject,created_at"),
    fetchTable("push_subscriptions", uid, "created_at,platform"),
    fetchTable("notification_preferences", uid),
    fetchTable("mastery_topics", uid, "topic,subject,mastery_score,updated_at"),
    fetchTable("spaced_repetition_cards", uid, "topic,subject,fsrs_state,next_due_at,repetition,interval_days,created_at"),
    fetchTable("weak_topics", uid, "topic,subject,count,level,updated_at"),
    fetchTable("daily_briefings", uid, "briefing_date,transcript,duration_seconds,listened_at"),
    fetchTable("weekly_recaps", uid, "week_starting,transcript,key_stats,created_at"),
    fetchTable("daily_progress", uid),
  ]);

  // Collect table-level fetch errors (non-fatal)
  for (const r of [convResult, docResult, focusResult, streakResult, examResult,
    quizResult, planResult, revisionResult, pushResult, notifPrefResult,
    masteryResult, srCardResult, weakResult, briefingResult, weeklyRecapResult,
    dailyProgressResult]) {
    if (r.error) fetchErrors.push({ table: r.table, error: r.error });
  }

  // Fetch messages only if conversations exist (avoids empty IN([]) edge case)
  const conversationIds = (convResult.data ?? []).map(c => c.id);
  let messages = [];
  if (conversationIds.length > 0) {
    const { data: msgs, error: msgErr } = await supabaseAdmin
      .from("messages")
      .select("conversation_id,role,content,created_at")
      .in("conversation_id", conversationIds);
    messages = msgs ?? [];
    if (msgErr) fetchErrors.push({ table: "messages", error: msgErr.message });
  }

  // Redact payment_id — always show exactly 4 masked chars + last 4 chars.
  // Handles short IDs: "ABC" → "****ABC" not "ABC". Prevents full ID leakage.
  function redactId(id) {
    if (!id) return null;
    const s = String(id);
    const visible = s.slice(-4);
    return `****${visible}`;
  }
  const plans = (planResult.data ?? []).map(p => ({
    ...p,
    payment_id: redactId(p.payment_id),
    order_id:   redactId(p.order_id),
  }));

  // Record export timestamp for rate-limiting BEFORE building the response.
  // If this fails we log and continue — user gets their data, rate limit
  // may not be enforced on next call (acceptable degradation vs blocking export).
  const { error: stampErr } = await supabaseAdmin
    .from("profiles")
    .update({ last_export_at: new Date().toISOString() })
    .eq("id", uid);
  if (stampErr) console.warn("[user/export] failed to stamp last_export_at:", stampErr.message);

  const exportData = {
    exported_at:  new Date().toISOString(),
    export_version: "2.0",
    ...(fetchErrors.length > 0 && { partial_errors: fetchErrors }),
    user: {
      id:         uid,
      email:      user.email,
      created_at: user.created_at,
      profile:    profileFull.data ?? null,
    },
    documents:     docResult.data,
    conversations: convResult.data,
    messages,
    study_data: {
      focus_progress:        focusResult.data,
      daily_progress:        dailyProgressResult.data,
      study_streaks:         streakResult.data,
      exams:                 examResult.data,
      quiz_results:          quizResult.data,
      revision_topics:       revisionResult.data,
      mastery_topics:        masteryResult.data,
      spaced_repetition_cards: srCardResult.data,
      weak_topics:           weakResult.data,
      daily_briefings:       briefingResult.data,
      weekly_recaps:         weeklyRecapResult.data,
    },
    subscription: {
      user_plans: plans,
    },
    notifications: {
      preferences:       notifPrefResult.data,
      push_subscriptions: pushResult.data,
    },
  };

  const filename = `ask-my-notes-export-${todayIST()}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
