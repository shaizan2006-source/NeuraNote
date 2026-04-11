import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

// POST → increment question count for today
export async function POST(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (data) {
    await supabase
      .from("daily_progress")
      .update({ questions: data.questions + 1 })
      .eq("id", data.id);
  } else {
    await supabase
      .from("daily_progress")
      .insert({ user_id: user.id, date: today, questions: 1 });
  }

  return NextResponse.json({ success: true });
}

// GET → fetch today's progress
export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ questions: 0, score: 0 });

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  const questions = data?.questions || 0;
  const score = Math.min(100, questions * 10);

  return NextResponse.json({ questions, score });
}
