/**
 * POST /api/progress/ask
 *
 * Conversational search over learning activity. User asks a question about
 * their progress, and the endpoint:
 * 1. Embeds the question with OpenAI text-embedding-3-small
 * 2. Searches learning_events via pgvector semantic similarity
 * 3. Fetches related mastery_topics and study data
 * 4. Calls OpenAI to synthesize a conversational answer
 *
 * Body: { question: string }
 *
 * Response: {
 *   ok: true,
 *   answer: string,
 *   metadata: {
 *     relatedTopics: [{ topic, mastery_score, lastActive }],
 *     relatedEvents: number,
 *     synthesizedAt: timestamp
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "question is required and must be non-empty" }, { status: 400 });
    }

    // Step 1: Embed the question with OpenAI
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question.slice(0, 2000), // Truncate for safety
    });

    const queryEmbedding = embeddingRes.data[0]?.embedding;
    if (!queryEmbedding) throw new Error("Failed to embed question");

    // Step 2: Semantic search over learning_events (limit to 10 most relevant)
    const { data: relevantEvents, error: searchErr } = await supabase.rpc(
      "match_learning_events",
      {
        p_user_id: user.id,
        query_emb: queryEmbedding,
        match_count: 10,
        event_filter: null, // Search all embeddable events
      }
    );

    if (searchErr) console.error("[progress/ask] search error:", searchErr.message);

    // Step 3: Fetch mastery_topics and study data for context
    const [masteryRes, streakRes, focusRes] = await Promise.all([
      supabase.from("mastery_topics")
        .select("topic, mastery_score, subject")
        .eq("user_id", user.id)
        .order("mastery_score", { ascending: true })
        .limit(10),
      supabase.from("study_streaks")
        .select("streak_count, last_active_date")
        .eq("user_id", user.id)
        .single(),
      supabase.from("focus_progress")
        .select("task, difficulty, active_time_seconds, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const topicsInfo = masteryRes.data || [];
    const streakInfo = streakRes.data || {};
    const recentSessions = focusRes.data || [];

    // Step 4: Build context for Claude to synthesize answer
    const eventSummary = (relevantEvents || [])
      .slice(0, 5)
      .map(e => `- ${e.event_type || "activity"}: ${e.metadata?.topic || "general"} (${e.created_at ? new Date(e.created_at).toLocaleDateString() : "unknown date"})`)
      .join("\n");

    const weakTopics = topicsInfo
      .filter(t => (t.mastery_score || 0) < 50)
      .map(t => `${t.topic} (${t.mastery_score}%)`)
      .join(", ");

    const context = `
User has been studying with the following patterns:
- Current streak: ${streakInfo.streak_count || 0} days
- Last active: ${streakInfo.last_active_date ? new Date(streakInfo.last_active_date).toLocaleDateString() : "never"}
- Recent sessions: ${recentSessions.length} in the last 30 days
- Weak areas: ${weakTopics || "none identified yet"}
- Recent activity:
${eventSummary || "No detailed activity yet"}

User asked: "${question}"

Provide a conversational, encouraging answer that:
1. Addresses their specific question about their progress
2. References specific topics or patterns where relevant
3. Suggests actionable next steps
4. Keeps tone warm and motivational (they're studying for exams)
5. Keeps response under 150 words
`;

    // Step 5: Call OpenAI to synthesize answer
    const answerRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are an encouraging study coach analyzing a student's learning progress. Be specific, supportive, and actionable.",
        },
        {
          role: "user",
          content: context,
        },
      ],
    });

    const answer = answerRes.choices[0]?.message?.content || "Unable to analyze your progress at this moment.";

    // Step 6: Extract topics mentioned in the answer
    const mentionedTopics = topicsInfo.filter(t => answer.toLowerCase().includes(t.topic.toLowerCase()));

    return NextResponse.json({
      ok: true,
      answer,
      metadata: {
        relatedTopics: mentionedTopics.map(t => ({
          topic: t.topic,
          mastery_score: t.mastery_score,
          subject: t.subject,
        })),
        relatedEvents: (relevantEvents || []).length,
        synthesizedAt: new Date().toISOString(),
      },
    }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("[/api/progress/ask] error:", err.message);
    return NextResponse.json({ error: "Failed to process your question" }, { status: 500 });
  }
}
