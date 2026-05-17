import { supabaseAdmin } from "@/lib/serverAuth";
import { generateWeeklyRecapForUser } from "@/lib/recaps/generator";

export async function GET(req) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return new Response(null, { status: 401 });

  // Active users: streak >= 1 OR session in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { data: activeUsers } = await supabaseAdmin
    .from("focus_progress")
    .select("user_id")
    .gte("session_date", weekAgo)
    .limit(500);

  const userIds = [...new Set((activeUsers ?? []).map(u => u.user_id))];
  const results = { generated: 0, skipped: 0, errors: 0 };

  for (const userId of userIds) {
    try {
      const res = await generateWeeklyRecapForUser(userId);
      if (res.skipped) results.skipped++;
      else results.generated++;
    } catch (err) {
      results.errors++;
      console.error(`[weekly-recap] ${userId}:`, err.message);
    }
  }

  return Response.json({ ok: true, ...results });
}
