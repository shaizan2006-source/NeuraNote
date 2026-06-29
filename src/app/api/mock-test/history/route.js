import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("mock_tests")
    .select("id,exam_type,started_at,completed_at,total_questions,marks_obtained,total_marks,predicted_rank_range,status")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tests: data ?? [] });
}