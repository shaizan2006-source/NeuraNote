import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FALLBACK_TASKS = [
  { name: "Read through the material carefully", estimatedMinutes: 15 },
  { name: "Note key concepts and definitions", estimatedMinutes: 10 },
  { name: "Attempt practice problems", estimatedMinutes: 20 },
  { name: "Review and summarise", estimatedMinutes: 10 },
];

export function parseFocusTasks(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FALLBACK_TASKS;
    return parsed.map((t, i) => ({
      id: `t${i + 1}`,
      name: String(t.name || "Study task"),
      estimatedMinutes: Number(t.estimatedMinutes) || 10,
      status: i === 0 ? "current" : "pending",
    }));
  } catch {
    return FALLBACK_TASKS;
  }
}

export async function POST(req) {
  try {
    // ── Auth ──────────────────────────────────────────────────────
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // ── Parse body ────────────────────────────────────────────────
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    // ── Verify ownership ──────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, name")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docErr || !doc) return NextResponse.json({ error: "pdf_not_found" }, { status: 404 });

    // ── Fetch chunks ──────────────────────────────────────────────
    const { data: chunks, error: chunkErr } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", documentId)
      .limit(8);

    if (chunkErr || !chunks || chunks.length === 0) {
      return NextResponse.json({ error: "no_chunks_found" }, { status: 422 });
    }

    const material = chunks.map((c) => c.content).join("\n\n---\n\n");

    // ── Call GPT-4o-mini ──────────────────────────────────────────
    const prompt = `You are an AI study coach. Given the following study material chunks, generate 6-8 progressive study tasks.

Rules:
- Tasks must be specific to the content (not generic like "Study hard")
- Progress from easier (review/read/define) to harder (apply/solve/synthesise)
- End with one review/summary task
- Estimate realistic minutes per task (5–20 min each)
- Total session should be 25–90 minutes

Return ONLY a JSON array, no other text:
[
  { "name": "Review [specific concept]", "estimatedMinutes": 8 },
  ...
]

Study material:
${material}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    let tasks = parseFocusTasks(raw);

    // Retry once on fallback (means GPT returned bad JSON)
    if (tasks === FALLBACK_TASKS) {
      const retry = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 800,
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: raw },
          { role: "user", content: "Return ONLY the JSON array. No prose, no markdown fences." },
        ],
      });
      const raw2 = retry.choices[0]?.message?.content?.trim() ?? "[]";
      tasks = parseFocusTasks(raw2);
    }

    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    return NextResponse.json({
      success: true,
      tasks,
      totalMinutes,
      documentId: doc.id,
      documentName: doc.name,
    });
  } catch (err) {
    console.error("[generate-focus-tasks]", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
