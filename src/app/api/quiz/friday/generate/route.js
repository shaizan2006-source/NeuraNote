import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import OpenAI from "openai";
import { daysAgoIST } from "@/lib/format/date";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  const weekAgo = daysAgoIST(7);

  // Get this week's topics from focus sessions
  const { data: sessions } = await supabaseAdmin
    .from("focus_progress")
    .select("document_id")
    .eq("user_id", user.id)
    .gte("session_date", weekAgo)
    .not("document_id", "is", null)
    .limit(10);

  const docIds = [...new Set((sessions ?? []).map(s => s.document_id))];

  // Get recent chunks for context
  let chunks = [];
  if (docIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("document_chunks")
      .select("content, document_id")
      .in("document_id", docIds)
      .limit(15);
    chunks = data ?? [];
  }

  // Also get weak topics for 30% review portion
  const { data: weakTopics } = await supabaseAdmin
    .from("weak_topics")
    .select("topic, subject")
    .eq("user_id", user.id)
    .order("count", { ascending: false })
    .limit(5);

  const context = chunks.map(c => c.content).join("\n\n").slice(0, 4000);
  const weakContext = (weakTopics ?? []).map(t => `${t.topic} (${t.subject})`).join(", ") || "general revision";

  const prompt = `Generate 20 MCQ questions for a JEE/NEET student's Friday weekly test.

Source material (from this week's studied chapters):
${context || "General JEE/NEET concepts"}

Also include review of these weak topics: ${weakContext}

Distribution:
- 14 questions from this week's material (70%)
- 6 review questions from weak topics (30%)
- Difficulty: 8 easy (40%), 10 medium (50%), 2 hard (10%)

Return valid JSON array:
[
  {
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "explanation": "Brief explanation",
    "difficulty": "easy|medium|hard",
    "topic": "..."
  }
]`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_tokens: 3000,
    response_format: { type: "json_object" },
  });

  let questions = [];
  try {
    const parsed = JSON.parse(completion.choices[0].message.content);
    questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
  } catch {
    return Response.json({ error: "Failed to parse questions" }, { status: 500 });
  }

  return Response.json({ questions: questions.slice(0, 20), week_starting: weekAgo });
}
