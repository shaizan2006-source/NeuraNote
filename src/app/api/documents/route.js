import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error('[documents GET]', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}
