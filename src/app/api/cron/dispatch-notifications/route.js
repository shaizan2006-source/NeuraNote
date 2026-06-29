import { dispatchNotifications } from "@/lib/notifications/dispatcher";
import { cronSecretValid } from "@/lib/security/cronAuth";

export async function GET(req) {
  if (!cronSecretValid(req)) return new Response(null, { status: 401 });

  try {
    const results = await dispatchNotifications();
    console.log("[cron/dispatch-notifications]", results);
    return Response.json({ ok: true, ...results });
  } catch (err) {
    console.error("[cron/dispatch-notifications] fatal:", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
