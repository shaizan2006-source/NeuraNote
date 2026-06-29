import { generateBriefingForUser, getActiveBriefingUsers } from "@/lib/briefings/generator";
import { cronSecretValid } from "@/lib/security/cronAuth";

export async function GET(req) {
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

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
