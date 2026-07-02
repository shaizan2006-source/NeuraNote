import { NextResponse } from "next/server";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";
import { supabase, getUser, getOwnedSession } from "@/lib/sageline/server";

/** GET /api/sageline/session/[id] — resume payload after a drop/reconnect. */
export async function GET(req, { params }) {
  if (!FLAGS.SAGELINE_V2) return flagDisabledResponse();

  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await getOwnedSession(id, user.id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: turns } = await supabase
    .from("sageline_transcript_turns")
    .select("role, content, turn_index, created_at")
    .eq("session_id", session.id)
    .order("turn_index", { ascending: true });

  return NextResponse.json({ session, turns: turns ?? [] });
}
