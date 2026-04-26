import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, messages, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { title, user_id } = await req.json();
  if (!user_id || !title?.trim()) {
    return NextResponse.json({ error: "Missing user_id or title" }, { status: 400 });
  }

  const { error } = await supabase
    .from("conversations")
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
