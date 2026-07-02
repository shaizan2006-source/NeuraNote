import { supabaseAdmin } from "@/lib/serverAuth";
import { cronSecretValid } from "@/lib/security/cronAuth";

export const maxDuration = 60;

/**
 * Hourly purge: delete incognito sessions that expired (7-day TTL) or were
 * explicitly closed more than an hour ago. Register in Vercel dashboard:
 * /api/cron/purge-incognito, schedule "0 * * * *".
 */
export async function GET(req) {
  if (!cronSecretValid(req)) {
    return new Response(null, { status: 401 });
  }

  const now     = new Date();
  const nowIso  = now.toISOString();
  const hourAgo = new Date(now.getTime() - 3600_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("incognito_sessions")
    .delete()
    .or(`expires_at.lt.${nowIso},closed_at.lt.${hourAgo}`)
    .select("id");

  if (error) {
    console.error("[purge-incognito] delete failed:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, purged: data?.length ?? 0, ran_at: nowIso });
}
