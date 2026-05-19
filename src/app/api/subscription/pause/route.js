import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const VALID_DURATIONS = [30, 60, 90];

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { duration_days } = await req.json().catch(() => ({}));
  if (!VALID_DURATIONS.includes(duration_days)) {
    return Response.json({ error: "duration_days must be 30, 60, or 90" }, { status: 400 });
  }

  const pausedUntil = new Date(Date.now() + duration_days * 86_400_000).toISOString();

  const { error } = await supabaseAdmin
    .from("user_plans")
    .update({ paused_until: pausedUntil, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    console.error("[subscription/pause] error:", error.message);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }

  return Response.json({ paused_until: pausedUntil });
}
