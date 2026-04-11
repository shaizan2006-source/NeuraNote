import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { handleChat } from "@/lib/chat";

// 🔹 Supabase (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, user_id } = body;

    if (!message || !user_id) {
      return NextResponse.json(
        { error: "Missing message or user_id" },
        { status: 400 }
      );
    }

    // 🔹 Generate AI response using core engine
    const aiResponse = await handleChat({
      user_id,
      message,
    });

    return NextResponse.json({
      success: true,
      response: aiResponse,
    });

  } catch (error) {
    console.error("Send Chat Error:", error);

    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}