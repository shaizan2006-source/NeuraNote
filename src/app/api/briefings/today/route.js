import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { todayIST } from "@/lib/format/date";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  // Must use IST date: briefings are keyed on the user's calendar day.
  // UTC date is wrong here — at 6 AM IST the UTC date is still the previous day.
  const todayStr = todayIST();

  const { data } = await supabaseAdmin
    .from("daily_briefings")
    .select("id, audio_url, transcript, duration_seconds, listened_at")
    .eq("user_id", user.id)
    .eq("briefing_date", todayStr)
    .maybeSingle();

  if (!data) return Response.json({ available: false });
  return Response.json({ available: true, ...data });
}
