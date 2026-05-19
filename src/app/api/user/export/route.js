import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/serverAuth";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  try {
    // Fetch conversations first so we can safely query messages
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id,title,created_at")
      .eq("user_id", uid);

    const conversationIds = (conversations ?? []).map(c => c.id);

    // Only query messages if there are conversations — empty IN([]) varies by DB driver
    const messagesQuery = conversationIds.length > 0
      ? supabaseAdmin
          .from("messages")
          .select("conversation_id,role,content,created_at")
          .in("conversation_id", conversationIds)
      : Promise.resolve({ data: [] });

    const [
      { data: profile },
      { data: documents },
      { data: messages },
      { data: daily_progress },
      { data: study_streaks },
      { data: exams },
      { data: quiz_results },
      { data: user_plans },
      { data: revision_topics },
      { data: push_subscriptions },
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", uid).single(),
      supabaseAdmin.from("documents").select("id,name,subject,page_count,concept_count,created_at").eq("user_id", uid),
      messagesQuery,
      supabaseAdmin.from("daily_progress").select("*").eq("user_id", uid),
      supabaseAdmin.from("study_streaks").select("*").eq("user_id", uid),
      supabaseAdmin.from("exams").select("*").eq("user_id", uid),
      supabaseAdmin.from("quizzes").select("id,score,created_at").eq("user_id", uid),
      supabaseAdmin.from("user_plans").select("*").eq("user_id", uid),
      supabaseAdmin.from("revision_topics").select("topic,subject,created_at").eq("user_id", uid),
      supabaseAdmin.from("push_subscriptions").select("created_at,platform").eq("user_id", uid),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: uid,
        email: user.email,
        created_at: user.created_at,
        profile: profile ?? null,
      },
      documents: documents ?? [],
      conversations: conversations ?? [],
      messages: messages ?? [],
      study_data: {
        daily_progress: daily_progress ?? [],
        study_streaks: study_streaks ?? [],
        exams: exams ?? [],
        quiz_results: quiz_results ?? [],
        user_plans: user_plans ?? [],
        revision_topics: revision_topics ?? [],
      },
      notifications: {
        push_subscriptions: push_subscriptions ?? [],
      },
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ask-my-notes-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (err) {
    console.error("[user/export] error:", err.message);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
