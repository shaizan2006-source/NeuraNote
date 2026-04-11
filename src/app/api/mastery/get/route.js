import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    const { data, error } = await supabase
      .from("mastery_topics")
      .select("*")
      .eq("user_id", user_id)
      .order("mastery_score", { ascending: true }); // weakest first

    if (error) {
      console.error("Fetch mastery error:", error);
      return NextResponse.json(
        { error: "Failed to fetch mastery" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      topics: data,
    });
  } catch (err) {
    console.error("Mastery GET error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}