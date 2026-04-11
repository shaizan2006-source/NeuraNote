import { NextResponse } from "next/server";
import { updateMastery } from "@/lib/mastery";

export async function POST(req) {
  try {
    const body = await req.json();

    const { user_id, topic, correct, total } = body;

    if (!user_id || !topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const masteryScore = await updateMastery({
      user_id,
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