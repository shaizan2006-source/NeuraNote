import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";

/**
 * GET /api/doubt/[threadId] — thread + its messages + the user's edits.
 * Used by both the sidebar (resume) and the full-page route.
 */
export async function GET(req, { params }) {
  if (!FLAGS.DOUBT_SIDEBAR) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { threadId } = await params;

  const { data: thread } = await supabaseAdmin
    .from("doubt_threads")
    .select("id, user_id, conversation_id, parent_key, original_question, original_answer, suggested_doubts, created_at")
    .eq("id", threadId)
    .maybeSingle();
  // 404 (not 403) for other users' threads — don't confirm existence.
  if (!thread || thread.user_id !== user.id) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { data: messages } = await supabaseAdmin
    .from("doubt_thread_messages")
    .select("id, role, content, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  const targetKeys = [thread.parent_key, ...(messages ?? []).map(m => m.id)];
  const { data: edits } = await supabaseAdmin
    .from("doubt_answer_edits")
    .select("target_type, target_key, edited_content")
    .eq("user_id", user.id)
    .in("target_key", targetKeys);

  const { user_id, ...clientThread } = thread;
  return NextResponse.json({
    thread:   clientThread,
    messages: messages ?? [],
    edits:    edits ?? [],
  });
}
