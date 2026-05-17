import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req, { params }) {
  const user = await verifyAuth(req);
  if (!user) return new NextResponse(null, { status: 401 });

  const { id } = await params;

  const { data: convo, error: convoErr } = await supabaseAdmin
    .from("conversations")
    .select("id, title, created_at, updated_at, user_id")
    .eq("id", id)
    .single();

  if (convoErr || !convo) return new NextResponse(null, { status: 404 });
  if (convo.user_id !== user.id) return new NextResponse(null, { status: 403 });

  const { data: messages, error: msgErr } = await supabaseAdmin
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    console.error("[/api/conversations/[id]] messages error:", msgErr.message);
    return NextResponse.json({ ...convo, messages: [] });
  }

  return NextResponse.json({ ...convo, messages: messages || [] });
}

export async function DELETE(req, { params }) {
  const user = await verifyAuth(req);
  if (!user) return new NextResponse(null, { status: 401 });

  const { id } = await params;

  const { data: convo } = await supabaseAdmin
    .from("conversations")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!convo || convo.user_id !== user.id) return new NextResponse(null, { status: 404 });

  await supabaseAdmin.from("conversations").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}