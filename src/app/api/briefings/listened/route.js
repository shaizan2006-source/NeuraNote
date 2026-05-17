import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  await supabaseAdmin
    .from("daily_briefings")
    .update({ listened_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("briefing_date", todayStr)
    .is("listened_at", null);

  return Response.json({ ok: true });
}
