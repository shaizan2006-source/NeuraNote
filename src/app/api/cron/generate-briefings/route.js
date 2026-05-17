import { generateBriefingForUser, getActiveBriefingUsers } from "@/lib/briefings/generator";

export async function GET(req) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return new Response(null, { status: 401 });

  const users = await getActiveBriefingUsers();
  const results = { generated: 0, skipped: 0, errors: 0 };

  for (const userId of users) {
    try {
      const res = await generateBriefingForUser(userId);
      if (res.skipped) results.skipped++;
      else results.generated++;
    } catch (err) {
      results.errors++;
      console.error(`[briefing] failed for ${userId}:`, err.message);
    }
  }

  console.log("[cron/generate-briefings]", results);
  return Response.json({ ok: true, users: users.length, ...results });
}
