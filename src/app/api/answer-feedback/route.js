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

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question_hash, domain, marks, rating, flag_type } = await req.json();

    if (!question_hash || ![1, -1].includes(rating)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { error } = await supabase.from("answer_feedback").insert({
      user_id:       user.id,
      question_hash,
      domain:        domain || null,
      marks:         marks  || null,
      rating,
      flag_type:     flag_type || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("answer-feedback POST error:", err.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
