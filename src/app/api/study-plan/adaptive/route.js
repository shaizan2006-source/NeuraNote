import { NextResponse } from "next/server";
import { getAdaptivePlan } from "@/lib/adaptivePlanner";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    const plan = await getAdaptivePlan(user_id);

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (err) {
    console.error("Adaptive plan API error:", err);

    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}