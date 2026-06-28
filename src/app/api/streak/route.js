import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// F-019: streak day boundary must follow IST (users roll over at 05:30 IST), not UTC midnight.
const istDateStr = (ms = Date.now()) => new Date(ms + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

async function getUser(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
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
  } catch (err) {
    console.error('[streak GET]', err);
    return NextResponse.json({ streak: 0 });
  }
}

export async function POST(req) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ streak: 0 });

    const today = istDateStr();

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
    const yesterdayStr = istDateStr(Date.now() - 86_400_000);

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
  } catch (err) {
    console.error('[streak POST]', err);
    return NextResponse.json({ streak: 0 });
  }
}
