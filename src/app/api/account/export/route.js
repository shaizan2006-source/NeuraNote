// src/app/api/account/export/route.js
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const uid    = user.id;
  const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [docsRes, convsRes, progressRes, streakRes] = await Promise.allSettled([
    supabaseAdmin.from("documents").select("id,name,subject,created_at").eq("user_id", uid),
    supabaseAdmin.from("conversations").select("id,title,messages,created_at,updated_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("daily_progress").select("date,questions,score")
      .eq("user_id", uid).gte("date", since90.split("T")[0]),
    supabaseAdmin.from("study_streaks").select("streak_count,last_active_date")
      .eq("user_id", uid).maybeSingle(),
  ]);

  const payload = {
    exported_at:  new Date().toISOString(),
    user_id:      uid,
    documents:    docsRes.status === "fulfilled"    ? (docsRes.value.data    ?? []) : [],
    conversations: convsRes.status === "fulfilled"  ? (convsRes.value.data   ?? []) : [],
    daily_progress: progressRes.status === "fulfilled" ? (progressRes.value.data ?? []) : [],
    streak:       streakRes.status === "fulfilled"  ? (streakRes.value.data  ?? null) : null,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="askmynotes-export-${uid.slice(0,8)}.json"`,
    },
  });
}
