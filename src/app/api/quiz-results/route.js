// src/app/api/quiz-results/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateMastery } from "@/lib/mastery";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, results } = body;

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "results[] is required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify caller identity — don't trust body-supplied userId
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verifiedUserId = user.id; // use this instead of body's userId

  const normalizedSubject = (subject || "general").toLowerCase().trim();

  for (const item of results) {
    const { topic, correct, total } = item;
    if (!topic || !total || typeof correct !== "number") continue;

    const accuracy = (correct / total) * 100;

    // 1. Update mastery (non-critical — .catch so it never throws)
    await updateMastery({ user_id: verifiedUserId, topic, correct, total }).catch(
      (err) => console.error("[quiz-results] mastery update failed:", err)
    );

    try {
      // 2. Read existing weak_topics row
      const { data: existing } = await supabase
        .from("weak_topics")
        .select("id, count")
        .eq("user_id", verifiedUserId)
        .eq("topic", topic)
        .eq("subject", normalizedSubject)
        .single();

      if (accuracy >= 80) {
        if (existing) {
          await supabase.from("weak_topics").delete().eq("id", existing.id);
        }
      } else if (accuracy >= 60) {
        if (existing) {
          const newCount = Math.max(0, existing.count - 2);
          await supabase.from("weak_topics").update({
            count: newCount,
            level: "medium",
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        }
      } else {
        if (existing) {
          await supabase.from("weak_topics").update({
            count: existing.count + 1,
            level: "hard",
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        }
      }
    } catch (err) {
      console.error("[quiz-results] weak_topics update failed for topic:", topic, err);
      // Continue processing remaining topics — don't let one failure block others
    }

    // 3. Log to learning_events (non-critical — .catch so it never throws)
    await supabase
      .from("learning_events")
      .insert({
        user_id: verifiedUserId,
        event_type: "quiz_completed",
        metadata: {
          topic,
          subject: normalizedSubject,
          correct,
          total,
          accuracy: Math.round(accuracy),
        },
      })
      .catch((err) =>
        console.error("[quiz-results] learning_event insert failed:", err)
      );
  }

  return NextResponse.json({ success: true });
}
