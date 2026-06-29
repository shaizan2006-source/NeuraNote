import { supabaseAdmin } from "@/lib/serverAuth";
import { generateWeeklyRecapForUser } from "@/lib/recaps/generator";
import { daysAgoIST } from "@/lib/format/date";
import { cronSecretValid } from "@/lib/security/cronAuth";

export async function GET(req) {
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

  // Active users: streak >= 1 OR session in last 7 IST days
  const weekAgo = daysAgoIST(7);
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
