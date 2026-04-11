import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ✅ SAVE TASK
export async function POST(req) {
  const body = await req.json();
  const { user_id, task, task_index, difficulty } = body;

  const { data, error } = await supabase.from("focus_progress").insert([
  {
    user_id,
    task,
    task_index,
    difficulty,
    completed: true,
  },
]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ✅ GET TASKS
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  const { data, error } = await supabase
    .from("focus_progress")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}