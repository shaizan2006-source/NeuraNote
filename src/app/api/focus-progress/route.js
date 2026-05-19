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

  const body = await req.json().catch(() => null); if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { task, task_index, difficulty, document_id, document_name, active_time_seconds } = body;

  const { data, error } = await supabase.from("focus_progress").insert([
    {
      user_id: user.id,
      task,
      task_index,
      difficulty,
      completed: true,
      document_id:         document_id   || null,
      document_name:       document_name || null,
      active_time_seconds: active_time_seconds || 0,
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

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("focus_progress")
    .select("id, task, task_index, difficulty, completed, document_id, document_name, active_time_seconds, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error('[focus-progress GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
