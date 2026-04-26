import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data: { user } } = await supabase.auth.getUser(token);
    return user || null;
  } catch {
    return null;
  }
}

// POST → increment question count for today
export async function POST(req) {
  try {
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
  } catch (err) {
    console.error('[progress POST]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// GET → fetch today's progress
export async function GET(req) {
  try {
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
  } catch (err) {
    console.error('[progress GET]', err);
    return NextResponse.json({ questions: 0, score: 0 });
  }
}
