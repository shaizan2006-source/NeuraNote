import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────
// STEP 4 — AI TOPIC NORMALIZATION (synonym map)
// ─────────────────────────────────────────────
const SYNONYM_MAP = {
  "recursive functions": "recursion",
  "recursion problems": "recursion",
  "recursive algorithm": "recursion",
  "dynamic programming": "dp",
  "dynamic prog": "dp",
  "graph traversal": "graph",
  "graph search": "graph",
  "bfs dfs": "graph",
  "normalization forms": "normalization",
  "database normalization": "normalization",
  "process scheduling": "scheduling",
  "cpu scheduling": "scheduling",
  "deadlock prevention": "deadlock",
  "deadlock avoidance": "deadlock",
  "css selectors": "selectors",
  "html selectors": "selectors",
  "http protocol": "http",
  "hypertext transfer": "http",
  "page replacement": "paging",
  "memory paging": "paging",
};

function normalizeTopic(topic) {
  const t = topic.toLowerCase().trim().replace(/\s+/g, " ");
  return SYNONYM_MAP[t] || t;
}

// ─────────────────────────────────────────────
// STEP 1 — STOPWORD FILTER (fallback extraction)
// ─────────────────────────────────────────────
const STOP_WORDS = new Set([
  // verbs
  "explain", "describe", "define", "tell", "give", "show",
  "find", "list", "write", "solve", "calculate", "derive",
  "compare", "differentiate", "state", "discuss", "prove",
  "summarize", "outline", "elaborate", "mention", "identify",
  // modifiers
  "briefly", "short", "simple", "simply", "easy", "detailed",
  "clearly", "quickly", "better", "best", "good", "great",
  "basic", "advanced", "general", "specific", "different",
  // generics
  "problem", "question", "answer", "example", "examples",
  "concept", "topic", "subject", "chapter", "unit",
  "types", "type", "kinds", "kind", "method", "methods",
  "approach", "approaches", "technique", "techniques",
  "algorithm", // too generic — keep subject-specific ones
  "important", "notes", "note", "terms", "term",
  // connectors
  "what", "which", "where", "when", "why", "how",
  "does", "that", "this", "with", "from", "into",
  "about", "using", "through", "between", "among",
  // fillers
  "also", "just", "even", "more", "less", "very",
  "much", "some", "many", "most", "each", "every",
]);

function fallbackExtractTopics(question) {
  return question
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w));
}

// ─────────────────────────────────────────────
// STEP 1 (PRIMARY) — AI-BASED TOPIC EXTRACTION
// ─────────────────────────────────────────────
async function extractTopicsWithAI(question, subject) {
  try {
    const prompt = `
You are an academic topic extractor.

Given a student's question and subject, extract ONLY the core academic topics being asked about.

Rules:
- Return only domain-specific nouns (e.g. "recursion", "entropy", "normalization", "selectors")
- Do NOT return: verbs, adjectives, fillers, question words
- Do NOT return generic words like "problem", "example", "question"
- Max 3 topics
- If no valid topic found, return empty array
- Return ONLY a JSON array of strings, nothing else

Subject: ${subject || "general"}
Question: "${question}"

Return format: ["topic1", "topic2"]
    `.trim();

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 60,
    });

    const raw = res.choices[0].message.content.trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed
        .map((t) => normalizeTopic(t.toLowerCase().trim()))
        .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
    }

    return [];
  } catch (err) {
    console.warn("AI extraction failed, using fallback:", err.message);
    return fallbackExtractTopics(question).map(normalizeTopic);
  }
}

// ─────────────────────────────────────────────
// STEP 2 — MANUAL WEAK INTENT DETECTION
// ─────────────────────────────────────────────
function detectWeakIntent(question) {
  const q = question.toLowerCase();
  const patterns = [
    "i am weak in",
    "i'm weak in",
    "i struggle with",
    "i am bad at",
    "i don't understand",
    "i dont understand",
    "i keep getting wrong",
  ];
  for (const pattern of patterns) {
    if (q.includes(pattern)) {
      return normalizeTopic(q.split(pattern)[1]?.trim() || "");
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// POST — TRACK WEAK TOPIC
// ─────────────────────────────────────────────
export async function POST(req) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { question, subject } = await req.json();

    // ── AUTH ──
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedSubject = subject?.toLowerCase().trim() || "general";

    // ── STEP 5 DEBUG LOGS ──
    console.log("RAW INPUT:", question);
    console.log("SUBJECT:", normalizedSubject);

    // ─────────────────────────────────────────
    // MANUAL WEAK INTENT (highest priority)
    // ─────────────────────────────────────────
    const manualTopic = detectWeakIntent(question);

    if (manualTopic) {
      console.log("MANUAL TOPIC DETECTED:", manualTopic);

      await upsertWeakTopic(supabase, {
        user_id: user.id,
        topic: manualTopic,
        subject: normalizedSubject,
        count: 3,
        level: "hard",
      });

      return NextResponse.json({ success: true, type: "manual" });
    }

    // ─────────────────────────────────────────
    // AI EXTRACTION (primary path)
    // ─────────────────────────────────────────
    const topics = await extractTopicsWithAI(question, normalizedSubject);

    console.log("EXTRACTED TOPICS:", topics);

    for (const topic of topics) {
      const normalized = normalizeTopic(topic);

      console.log("NORMALIZED TOPIC:", normalized);

      if (!normalized || normalized.length < 3) continue;

      // ── STEP 3: upsert with subject tag ──
      await trackTopicAttempt(supabase, {
        user_id: user.id,
        topic: normalized,
        subject: normalizedSubject,
      });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("weak-topics POST error:", err);
    return NextResponse.json({ error: "Failed to track topics" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// STEP 3 — SAFE UPSERT (no duplicates)
// ─────────────────────────────────────────────
async function trackTopicAttempt(supabase, { user_id, topic, subject }) {
  // Check topic_attempts
  const { data: attempt } = await supabase
    .from("topic_attempts")
    .select("*")
    .eq("topic", topic)
    .eq("user_id", user_id)
    .eq("subject", subject)
    .single();

  if (attempt) {
    const newCount = attempt.count + 1;

    await supabase
      .from("topic_attempts")
      .update({ count: newCount, updated_at: new Date().toISOString() })
      .eq("id", attempt.id);

    // Promote to weak_topics at threshold
    if (newCount >= 3) {
      await upsertWeakTopic(supabase, {
        user_id,
        topic,
        subject,
        count: newCount,
        level: newCount >= 6 ? "hard" : "medium",
      });
    }
  } else {
    await supabase.from("topic_attempts").insert({
      topic,
      count: 1,
      user_id,
      subject,
      updated_at: new Date().toISOString(),
    });
  }
}

async function upsertWeakTopic(supabase, { user_id, topic, subject, count, level }) {
  const { data: existing } = await supabase
    .from("weak_topics")
    .select("*")
    .eq("topic", topic)
    .eq("user_id", user_id)
    .eq("subject", subject)
    .single();

  if (existing) {
    await supabase
      .from("weak_topics")
      .update({
        count: Math.max(existing.count, count),
        level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("weak_topics").insert({
      topic,
      subject,
      count,
      user_id,
      level,
      updated_at: new Date().toISOString(),
    });
  }
}

// ─────────────────────────────────────────────
// GET — FETCH WEAK TOPICS (subject-filtered)
// ─────────────────────────────────────────────
export async function GET(req) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) return NextResponse.json({ topics: [] });

    // ── STEP 6: rank by count + recency ──
    const { data } = await supabase
      .from("weak_topics")
      .select("*")
      .eq("user_id", user.id)
      .order("count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ topics: data || [] });

  } catch (err) {
    console.error("weak-topics GET error:", err);
    return NextResponse.json({ topics: [] });
  }
}