import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { getAdaptivePlan } from "@/lib/adaptivePlanner";

export async function GET(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const plan = await getAdaptivePlan(user.id);

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (err) {
    console.error("Adaptive plan API error:", err);
    return NextResponse.json({ success: true, plan: [] });
  }
}