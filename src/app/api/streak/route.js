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

export async function GET(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ streak: 0 });

  const { data, error } = await supabase
    .from("study_streaks")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ streak: 0 });
  }

  return NextResponse.json({ streak: data.streak_count, lastActiveDate: data.last_active_date ?? null });
}

export async function POST(req) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ streak: 0 });

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("study_streaks")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!data) {
    await supabase.from("study_streaks").insert({
      user_id: user.id,
      streak_count: 1,
      last_active_date: today,
    });
    return NextResponse.json({ streak: 1 });
  }

  const lastDate = data.last_active_date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = data.streak_count;

  if (lastDate === today) {
    return NextResponse.json({ streak: newStreak });
  }

  newStreak = lastDate === yesterdayStr ? newStreak + 1 : 1;

  await supabase
    .from("study_streaks")
    .update({ streak_count: newStreak, last_active_date: today })
    .eq("id", data.id);

  return NextResponse.json({ streak: newStreak });
}
