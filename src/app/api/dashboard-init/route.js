import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

/**
 * GET /api/dashboard-init
 *
 * Returns all critical first-paint data in one round-trip (previously 4 separate fetches,
 * each with its own auth + network + DB query). The four queries run in parallel server-side
 * via Promise.allSettled so one slow table never blocks the others.
 *
 * Shape:
 *   { documents, streak, lastActiveDate, progress, focusProgress }
 *
 * On any partial failure the field returns its safe default so the dashboard still loads.
 */
export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid   = user.id;
  const today = new Date().toISOString().split("T")[0];
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString(); // focus: 30-day window

  const [docsRes, streakRes, progressRes, focusRes] = await Promise.allSettled([
    // 1. documents
    supabaseAdmin
      .from("documents")
      .select("id, name, subject, created_at, content")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),

    // 2. streak
    supabaseAdmin
      .from("study_streaks")
      .select("streak_count, last_active_date")
      .eq("user_id", uid)
      .maybeSingle(),

    // 3. daily progress (today only)
    supabaseAdmin
      .from("daily_progress")
      .select("questions, score")
      .eq("user_id", uid)
      .eq("date", today)
      .maybeSingle(),

    // 4. focus progress (30-day window, matches existing /api/focus-progress?days=30)
    supabaseAdmin
      .from("focus_progress")
      .select("id, task, task_index, difficulty, completed, document_id, document_name, active_time_seconds, created_at")
      .eq("user_id", uid)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const documents     = docsRes.status === "fulfilled"    ? (docsRes.value.data    ?? []) : [];
  const streakRow     = streakRes.status === "fulfilled"  ? (streakRes.value.data  ?? null) : null;
  const progressRow   = progressRes.status === "fulfilled"? (progressRes.value.data?? null) : null;
  const focusProgress = focusRes.status === "fulfilled"   ? (focusRes.value.data   ?? []) : [];

  const streak         = streakRow?.streak_count    ?? 0;
  const lastActiveDate = streakRow?.last_active_date ?? null;
  const questions      = progressRow?.questions      ?? 0;
  const score          = Math.min(100, questions * 10);

  return NextResponse.json(
    { documents, streak, lastActiveDate, progress: { questions, score }, focusProgress },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
