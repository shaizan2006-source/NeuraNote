import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const sub = await req.json().catch(() => null); if (!sub || typeof sub !== "object") return Response.json({ error: "Invalid payload" }, { status: 400 });
  const { endpoint, keys } = sub;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  await supabaseAdmin.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    device_info: ua,
    last_used_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint" });

  return Response.json({ subscribed: true });
}
