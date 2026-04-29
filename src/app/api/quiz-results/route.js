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

  const { userId, subject, results } = body;

  if (!userId || !Array.isArray(results) || results.length === 0) {
    return NextResponse.json(
      { error: "userId and results[] are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const normalizedSubject = (subject || "general").toLowerCase().trim();

  for (const item of results) {
    const { topic, correct, total } = item;
    if (!topic || !total) continue;

    const accuracy = (correct / total) * 100;

    // 1. Update mastery score (uses existing lib/mastery.js)
    await updateMastery({ user_id: userId, topic, correct, total }).catch(
      (err) => console.error("[quiz-results] mastery update failed:", err)
    );

    // 2. Update weak_topics based on performance
    const { data: existing } = await supabase
      .from("weak_topics")
      .select("id, count")
      .eq("user_id", userId)
      .eq("topic", topic)
      .eq("subject", normalizedSubject)
      .single();

    if (accuracy >= 80) {
      // Mastered — remove from weak topics entirely
      if (existing) {
        await supabase
          .from("weak_topics")
          .delete()
          .eq("id", existing.id);
      }
    } else if (accuracy >= 60) {
      // Improving — reduce count by 2
      if (existing) {
        const newCount = Math.max(0, existing.count - 2);
        await supabase
          .from("weak_topics")
          .update({
            count: newCount,
            level: "medium",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      // Still weak — increment count
      if (existing) {
        await supabase
          .from("weak_topics")
          .update({
            count: existing.count + 1,
            level: "hard",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    }

    // 3. Log to learning_events (Realtime also watches this table)
    await supabase
      .from("learning_events")
      .insert({
        user_id: userId,
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
