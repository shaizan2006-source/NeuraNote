import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const ALLOWED_FIELDS = [
  "briefing_enabled", "briefing_time",
  "midday_enabled", "midday_time",
  "focus_anchor_enabled", "focus_anchor_time",
  "night_closure_enabled", "night_closure_time",
  "cohort_updates_enabled", "care_nudges_enabled",
];

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Return defaults if no row exists yet
  if (!data) {
    const defaults = {
      briefing_enabled: true, briefing_time: 420,
      midday_enabled: true, midday_time: 780,
      focus_anchor_enabled: true, focus_anchor_time: 1080,
      night_closure_enabled: true, night_closure_time: 1260,
      cohort_updates_enabled: true, care_nudges_enabled: true,
    };
    return Response.json(defaults);
  }

  return Response.json(data);
}

export async function PATCH(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const body = await req.json().catch(() => null); if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const update = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  await supabaseAdmin.from("notification_preferences").upsert(
    { user_id: user.id, ...update },
    { onConflict: "user_id" }
  );

  return Response.json({ updated: true });
}
