import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new NextResponse(null, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[/api/conversations] Supabase error:", error.message);
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(data || []);
}
