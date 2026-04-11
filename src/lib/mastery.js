import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Update mastery score for a topic
 *
 * @param {Object} params
 * @param {string} params.user_id
 * @param {string} params.topic
 * @param {number} params.correct
 * @param {number} params.total
 */
export async function updateMastery({ user_id, topic, correct, total }) {
  try {
    // 1. Get SRS level
    const { data: srsData, error: srsError } = await supabase
      .from("revision_topics")
      .select("level")
      .eq("user_id", user_id)
      .eq("topic", topic)
      .single();

    if (srsError && srsError.code !== "PGRST116") {
      console.error("SRS fetch error:", srsError);
      return;
    }

    const level = srsData?.level ?? 0;

    // 2. Convert to scores
    const srsScore = (level / 5) * 100;

    const quizScore =
      total > 0 ? (correct / total) * 100 : 0;

    // 3. Final mastery calculation
    const masteryScore =
      srsScore * 0.4 + quizScore * 0.6;

    // 4. UPSERT into mastery_topics
    const { error: upsertError } = await supabase
      .from("mastery_topics")
      .upsert(
        [
          {
            user_id,
            topic,
            mastery_score: masteryScore,
            last_updated: new Date().toISOString(),
          },
        ],
        {
          onConflict: "user_id,topic",
        }
      );

    if (upsertError) {
      console.error("Mastery upsert error:", upsertError);
    }

    return masteryScore;
  } catch (err) {
    console.error("Mastery update failed:", err);
  }
}