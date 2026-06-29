import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 🔹 Supabase (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    // P4-S0: derive the user from the verified JWT — NEVER from the request body.
    // Previously user_id came straight from the body with no auth, so any caller could
    // read any user's full chat history (IDOR). service_role bypasses RLS, so the route
    // itself must enforce ownership.
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user_id = user.id;

    // 🔹 Fetch chat history — cap to the most recent 200 (unbounded select grew with usage)
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      messages: (data || []).reverse(), // back to oldest-first for display
    });

  } catch (error) {
    console.error("Chat History Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}