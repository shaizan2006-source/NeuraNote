import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";

export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("mastery_topics")
      .select("*")
      .eq("user_id", user.id)
      .order("mastery_score", { ascending: true }); // weakest first

    if (error) {
      console.error("Fetch mastery error:", error);
      return NextResponse.json({ success: true, topics: [] });
    }

    return NextResponse.json({
      success: true,
      topics: data ?? [],
    });
  } catch (err) {
    console.error("Mastery GET error:", err);
    return NextResponse.json({ success: true, topics: [] });
  }
}