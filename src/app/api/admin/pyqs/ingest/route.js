import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { autoClassifyPyq } from "@/lib/pyqs/autoClassify";
import { generatePyqSlug } from "@/lib/pyqs/slugGenerator";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "shaizan2006@gmail.com").split(",").map(e => e.trim());

async function embedQuestion(text) {
  const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: text.slice(0, 2000) });
  return res.data[0].embedding;
}

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email)) return new Response(null, { status: 403 });

  const { pyqs: input } = await req.json();
  if (!Array.isArray(input) || !input.length) return Response.json({ error: "pyqs array required" }, { status: 400 });

  const results = { inserted: 0, skipped: 0, errors: 0 };

  for (const raw of input) {
    try {
      const classified = await autoClassifyPyq(raw);
      const tempId = crypto.randomUUID();
      const slug = generatePyqSlug({ ...classified, id: tempId });

      // Check slug uniqueness
      const { data: existing } = await supabaseAdmin.from("pyqs").select("id").eq("slug", slug).maybeSingle();
      if (existing) { results.skipped++; continue; }

      const embedding = await embedQuestion(classified.question_text);

      const { error } = await supabaseAdmin.from("pyqs").insert({
        id: tempId,
        slug,
        exam_type: classified.exam_type,
        exam_year: classified.exam_year,
        exam_session: classified.exam_session ?? null,
        subject: classified.subject,
        chapter: classified.chapter ?? null,
        concepts: classified.concepts ?? [],
        question_text: classified.question_text,
        question_image_url: classified.question_image_url ?? null,
        options: classified.options ?? null,
        correct_answer: classified.correct_answer ?? null,
        solution_text: classified.solution_text ?? null,
        difficulty: classified.difficulty ?? "medium",
        mark_weight: classified.mark_weight ?? 4,
        question_type: classified.question_type ?? "mcq",
        source_attribution: classified.source_attribution ?? null,
        embedding,
      });

      if (error) { results.errors++; console.error("[ingest]", error.message); }
      else results.inserted++;
    } catch (err) {
      results.errors++;
      console.error("[ingest] error:", err.message);
    }
  }

  return Response.json({ ok: true, ...results });
}
