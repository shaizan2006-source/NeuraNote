import { supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const exam = searchParams.get("exam");
  const year = searchParams.get("year");
  const subject = searchParams.get("subject");
  const chapter = searchParams.get("chapter");
  const difficulty = searchParams.get("difficulty");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const perPage = Math.min(50, parseInt(searchParams.get("per_page") ?? "20", 10));

  let query = supabaseAdmin
    .from("pyqs")
    .select("id, slug, exam_type, exam_year, subject, chapter, question_text, options, correct_answer, solution_text, difficulty, mark_weight, concepts", { count: "exact" });

  if (exam) query = query.eq("exam_type", exam);
  if (year) query = query.eq("exam_year", parseInt(year, 10));
  if (subject) query = query.eq("subject", subject);
  if (chapter) query = query.eq("chapter", chapter);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data, count, error } = await query
    .order("exam_year", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  // Degrade gracefully: if the pyqs table/columns aren't present yet (e.g. the migration
  // hasn't been applied to this environment), return empty results instead of a 500 so the
  // page renders an empty state rather than crashing.
  if (error) {
    console.error("[pyqs/search]", error.message);
    return Response.json({ results: [], total: 0, page, has_more: false });
  }

  return Response.json({
    results: data ?? [],
    total: count ?? 0,
    page,
    has_more: (page * perPage) < (count ?? 0),
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" } });
}
