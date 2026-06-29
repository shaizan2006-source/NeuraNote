import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { updateMastery } from "@/lib/mastery";

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { topic, correct, total } = body;

    if (!topic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const masteryScore = await updateMastery({
      user_id: user.id,
      topic,
      correct,
      total,
    });

    return NextResponse.json({
      success: true,
      mastery_score: masteryScore,
    });
  } catch (error) {
    console.error("Mastery update API error:", error);

    return NextResponse.json(
      { error: "Failed to update mastery" },
      { status: 500 }
    );
  }
}