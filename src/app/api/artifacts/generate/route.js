/**
 * POST /api/artifacts/generate
 *
 * Generates flashcards or micro-quiz for a weak-topic cluster.
 * Stores in generated_artifacts table for reuse.
 *
 * Body: {
 *   clusterLabel: string,     // e.g., "Thermodynamics"
 *   topics: [string],         // Topics in the cluster
 *   avgMastery: number,       // Avg mastery score 0-100
 *   artifactType: "flashcard" | "micro_quiz"
 * }
 *
 * Response: { ok: true, artifact: { type, content } }
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generateFlashcards, generateQuiz, clusterToId } from "@/lib/artifactGenerator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 2, timeout: 45_000 });

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { clusterLabel, topics, avgMastery, artifactType } = body;

    if (!clusterLabel || !Array.isArray(topics) || typeof avgMastery !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid clusterLabel, topics, avgMastery" },
        { status: 400 }
      );
    }

    if (!["flashcard", "micro_quiz"].includes(artifactType)) {
      return NextResponse.json(
        { error: "artifactType must be flashcard or micro_quiz" },
        { status: 400 }
      );
    }

    const clusterId = clusterToId(clusterLabel);
    const cluster = { label: clusterLabel, topics, avgScore: avgMastery };

    // Generate artifact via OpenAI
    let content;
    if (artifactType === "flashcard") {
      content = await generateFlashcards(cluster, openai);
    } else {
      content = await generateQuiz(cluster, openai);
    }

    // Upsert into generated_artifacts table
    const { error: upsertErr } = await supabase
      .from("generated_artifacts")
      .upsert({
        user_id:      user.id,
        cluster_id:   clusterId,
        artifact_type: artifactType,
        content,
        metadata:     { topics, avg_mastery: avgMastery, generated_at: new Date().toISOString() },
      }, { onConflict: "user_id,cluster_id,artifact_type" });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({
      ok: true,
      artifact: { type: artifactType, content },
    }, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("[/api/artifacts/generate] error:", err.message);
    return NextResponse.json({ error: "Artifact generation failed" }, { status: 500 });
  }
}
