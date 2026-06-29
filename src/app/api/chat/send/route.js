import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { handleChat } from "@/lib/chat";

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // 🔹 Generate AI response using core engine
    const aiResponse = await handleChat({
      user_id: user.id,
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