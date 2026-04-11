import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 🔹 Supabase (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    // 🔹 Fetch chat history
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      messages: data,
    });

  } catch (error) {
    console.error("Chat History Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}