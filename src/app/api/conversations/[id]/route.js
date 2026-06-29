import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req, { params }) {
  const user = await verifyAuth(req);
  if (!user) return new NextResponse(null, { status: 401 });

  const { id } = await params;

  // Messages are stored as JSONB in the conversations row (not a separate table).
  const { data: convo, error } = await supabaseAdmin
    .from("conversations")
    .select("id, title, messages, created_at, updated_at, user_id")
    .eq("id", id)
    .single();

  if (error || !convo) return new NextResponse(null, { status: 404 });
  if (convo.user_id !== user.id) return new NextResponse(null, { status: 403 });

  return NextResponse.json(convo);
}

export async function PATCH(req, { params }) {
  const user = await verifyAuth(req);
  if (!user) return new NextResponse(null, { status: 401 });

  const { id } = await params;

  // Verify ownership before mutating
  const { data: convo } = await supabaseAdmin
    .from("conversations")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!convo || convo.user_id !== user.id) return new NextResponse(null, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates = {};
  if (typeof body.title === "string") updates.title = body.title.trim().slice(0, 100);
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  updates.updated_at = new Date().toISOString();
  await supabaseAdmin.from("conversations").update(updates).eq("id", id);
  return NextResponse.json({ ok: true });
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