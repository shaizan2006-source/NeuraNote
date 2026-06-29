import { verifyAuth } from "@/lib/serverAuth";
import { detectDecompression, acknowledgeDecompression, DECOMPRESSION_MESSAGES } from "@/lib/decompression/detector";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await detectDecompression(user.id);
  if (!result) return Response.json({ triggered: false });

  const msg = DECOMPRESSION_MESSAGES[result.primary.type];
  return Response.json({ triggered: true, trigger_id: result.trigger_id, signals: result.signals, message: msg });
}

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { trigger_id, response } = await req.json();
  if (!trigger_id || !response) return Response.json({ error: "trigger_id and response required" }, { status: 400 });

  await acknowledgeDecompression(trigger_id, response);
  return Response.json({ ok: true });
}