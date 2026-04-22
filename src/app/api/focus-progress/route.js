import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAuthUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

// ✅ SAVE TASK
export async function POST(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { task, task_index, difficulty, document_id, document_name } = body;

  const { data, error } = await supabase.from("focus_progress").insert([
    {
      user_id: user.id,
      task,
      task_index,
      difficulty,
      completed: true,
      document_id:   document_id   || null,
      document_name: document_name || null,
    },
  ]);

  if (error) {
    console.error('[focus-progress POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ✅ GET TASKS
export async function GET(req) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("focus_progress")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error('[focus-progress GET]', error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data ?? []);
}
