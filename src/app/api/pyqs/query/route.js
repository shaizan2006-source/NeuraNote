import { supabaseAdmin, verifyAuth } from "@/lib/serverAuth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { query, exam, subject, limit = 10 } = await req.json().catch(() => ({}));
  if (!query?.trim()) return Response.json({ error: "query required" }, { status: 400 });
  const safeLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 10));

  // Embed the query
  const embRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query.trim(),
  });
  const embedding = embRes.data[0].embedding;

  // Build filter string for RPC
  let filterSql = "true";
  const bindings = [];
  if (exam) { bindings.push(exam); filterSql += ` AND exam_type = $${bindings.length}`; }
  if (subject) { bindings.push(subject); filterSql += ` AND subject = $${bindings.length}`; }

  // Use pgvector similarity search via raw RPC
  const { data, error } = await supabaseAdmin.rpc("search_pyqs_semantic", {
    query_embedding: embedding,
    match_count: safeLimit,
    filter_exam: exam ?? null,
    filter_subject: subject ?? null,
  });

  if (error) {
    // Fallback to keyword search if RPC not deployed yet
    let q = supabaseAdmin
      .from("pyqs")
      .select("id,slug,exam_type,exam_year,subject,chapter,question_text,difficulty")
      .textSearch("question_text", query.trim().split(/\s+/).join(" & "), { type: "websearch" })
      .limit(safeLimit);
    if (exam) q = q.eq("exam_type", exam);
    if (subject) q = q.eq("subject", subject);
    const { data: fallback, error: fe } = await q;
    if (fe) return Response.json({ error: fe.message }, { status: 500 });
    return Response.json({ results: fallback ?? [], source: "keyword" });
  }

  return Response.json({ results: data ?? [], source: "semantic" });
}