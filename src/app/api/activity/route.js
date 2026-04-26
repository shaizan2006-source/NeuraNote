import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error: authErr } = await supabase.auth.getUser(token);
    const user = data?.user;
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await supabase
      .from("user_activity")
      .upsert(
        { user_id: user.id, last_active: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[activity POST]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
