import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { sessionActive } from "@/lib/incognito";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";

async function getActiveSession(userId) {
  const { data } = await supabaseAdmin
    .from("incognito_sessions")
    .select("id, expires_at, closed_at, messages")
    .eq("user_id", userId)
    .is("closed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return sessionActive(data) ? data : null;
}

function toClient(session) {
  return { id: session.id, expires_at: session.expires_at, messages: session.messages ?? [] };
}

/** GET /api/incognito — resume the active session, or 404 if none. */
export async function GET(req) {
  if (!FLAGS.INCOGNITO) return flagDisabledResponse();
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getActiveSession(user.id);
  if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 });
  return NextResponse.json(toClient(session));
}

/** POST /api/incognito — resume the active session or create a fresh one. */
export async function POST(req) {
  if (!FLAGS.INCOGNITO) return flagDisabledResponse();
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getActiveSession(user.id);
  if (existing) return NextResponse.json(toClient(existing));

  const { data, error } = await supabaseAdmin
    .from("incognito_sessions")
    .insert({ user_id: user.id })
    .select("id, expires_at, messages")
    .single();

  if (error) {
    console.error("[incognito POST]", error.message);
    return NextResponse.json({ error: "Failed to start incognito session" }, { status: 500 });
  }
  return NextResponse.json(toClient(data));
}

/** DELETE /api/incognito — explicitly close the active session (idempotent). */
export async function DELETE(req) {
  if (!FLAGS.INCOGNITO) return flagDisabledResponse();
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("incognito_sessions")
    .update({ closed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("closed_at", null);

  if (error) {
    console.error("[incognito DELETE]", error.message);
    return NextResponse.json({ error: "Failed to close session" }, { status: 500 });
  }
  return NextResponse.json({ closed: true });
}
