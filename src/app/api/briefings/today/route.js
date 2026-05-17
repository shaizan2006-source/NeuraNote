import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  const { data } = await supabaseAdmin
    .from("daily_briefings")
    .select("id, audio_url, transcript, duration_seconds, listened_at")
    .eq("user_id", user.id)
    .eq("briefing_date", todayStr)
    .maybeSingle();

  if (!data) return Response.json({ available: false });
  return Response.json({ available: true, ...data });
}
