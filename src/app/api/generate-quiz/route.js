import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    // ========================
    // 1. Get User ID (SAFE)
    // ========================
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const userId = body.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ========================
    // 2. Fetch Weak Topics
    // ========================
    const { data: topicsData, error: topicsError } = await supabase
      .from("weak_topics")
      .select("topic, count")
      .eq("user_id", userId)
      .order("count", { ascending: false })
      .limit(5);

    if (topicsError) throw topicsError;

    let topics = topicsData?.map((t) => t.topic) || [];

    if (!topics.length) {
      topics = ["algorithms", "data structures", "time complexity"];
    }

    // ========================
    // 3. Fetch Context (SAFE)
    // ========================
    let contextChunks = "";

    try {
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("content")
        .limit(5);

      contextChunks =
        chunks?.map((c) => c.content).join("\n").slice(0, 3000) || "";
    } catch (err) {
      console.warn("No context found");
    }

    const hasContext = contextChunks.trim().length > 100;

    // ========================
    // 4. Build Prompt
    // ========================
    const prompt = `
You are an expert AI tutor and exam question setter.

Generate a quiz based on weak topics.

Weak topics:
${topics.join(", ")}

${
  hasContext
    ? `
STUDY MATERIAL:
${contextChunks}

Use this as PRIMARY source.
`
    : `
No study material found. Use general knowledge.
`
}

INSTRUCTIONS:
- Generate EXACTLY 5 MCQs
- Moderate difficulty
- Conceptual questions only
- Each question MUST include a "topic" field indicating the concept

OUTPUT STRICT JSON ARRAY FORMAT:

[
  {
    "question": "string",
    "options": {
      "A": "string",
      "B": "string",
      "C": "string",
      "D": "string"
    },
    "answer": "A",
    "explanation": "string",
    "topic": "string"
  }
]
`;

    // ========================
    // 5. OpenAI Call
    // ========================
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No markdown. No text outside JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    // ========================
    // 6. Parse Response SAFELY
    // ========================
    let questions;

    try {
      let raw = completion.choices[0].message.content;

      if (!raw) throw new Error("Empty AI response");

      raw = raw.trim();

      raw = raw.replace(/```json/g, "").replace(/```/g, "");

      questions = JSON.parse(raw);

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid quiz format");
      }
    } catch (err) {
      console.error("Parse Error:", completion.choices[0].message.content);

      return NextResponse.json(
        { error: "Failed to parse quiz" },
        { status: 500 }
      );
    }

    // ========================
    // 7. Store Quiz
    // ========================
    let quizData = null;

    try {
      const { data, error } = await supabase
        .from("quizzes")
        .insert([
          {
            user_id: userId,
            topics,
            questions,
          },
        ])
        .select()
        .single();

      if (!error) quizData = data;
    } catch (err) {
      console.warn("Quiz not saved (non-critical)");
    }

    // ========================
    // 8. Return Response
    // ========================
    return NextResponse.json({
      quizId: quizData?.id || null,
      topics,
      questions,
      usedContext: hasContext,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}