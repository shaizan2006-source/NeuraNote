import { dispatchNotifications } from "@/lib/notifications/dispatcher";

export async function GET(req) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return new Response(null, { status: 401 });
  }

  try {
    const results = await dispatchNotifications();
    console.log("[cron/dispatch-notifications]", results);
    return Response.json({ ok: true, ...results });
  } catch (err) {
    console.error("[cron/dispatch-notifications] fatal:", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
