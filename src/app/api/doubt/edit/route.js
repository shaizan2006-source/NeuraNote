import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { validEditTarget } from "@/lib/doubt";

// Edits are the user's working copy — the original answer/message row is
// never overwritten. POST upserts; DELETE reverts to the original.

async function verifyTargetOwnership(targetType, targetKey, userId) {
  if (targetType === "main_answer") {
    const { data } = await supabaseAdmin
      .from("doubt_threads")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_key", targetKey)
      .limit(1)
      .maybeSingle();
    return !!data;
  }
  // doubt_message: the message must live in one of the user's threads
  const { data: msg } = await supabaseAdmin
    .from("doubt_thread_messages")
    .select("id, thread_id")
    .eq("id", targetKey)
    .maybeSingle();
  if (!msg) return false;
  const { data: thread } = await supabaseAdmin
    .from("doubt_threads")
    .select("id")
    .eq("id", msg.thread_id)
    .eq("user_id", userId)
    .maybeSingle();
  return !!thread;
}

export async function POST(req) {
  if (!FLAGS.DOUBT_SIDEBAR) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { target_type, target_key, edited_content } = body ?? {};
  if (!validEditTarget(target_type, target_key) ||
      typeof edited_content !== "string" || edited_content.trim() === "" ||
      edited_content.length > 20000) {
    return NextResponse.json({ error: "Invalid edit target or content" }, { status: 400 });
  }

  if (!(await verifyTargetOwnership(target_type, target_key, user.id))) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("doubt_answer_edits")
    .upsert({
      user_id:        user.id,
      target_type,
      target_key,
      edited_content: edited_content.trim(),
      created_at:     new Date().toISOString(),
    }, { onConflict: "user_id,target_type,target_key" });

  if (error) {
    console.error("[doubt/edit POST]", error.message);
    return NextResponse.json({ error: "Failed to save edit" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!FLAGS.DOUBT_SIDEBAR) return flagDisabledResponse();

  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { target_type, target_key } = body ?? {};
  if (!validEditTarget(target_type, target_key)) {
    return NextResponse.json({ error: "Invalid edit target" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("doubt_answer_edits")
    .delete()
    .eq("user_id", user.id)
    .eq("target_type", target_type)
    .eq("target_key", target_key);

  if (error) {
    console.error("[doubt/edit DELETE]", error.message);
    return NextResponse.json({ error: "Failed to revert" }, { status: 500 });
  }
  return NextResponse.json({ reverted: true });
}
