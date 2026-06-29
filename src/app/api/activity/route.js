import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin as supabase } from "@/lib/serverAuth";

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
