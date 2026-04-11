import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getAdaptivePlan(user_id) {
  try {
    // 1. Fetch all data in parallel
    const [
      { data: masteryData },
      { data: srsData },
      { data: weakData },
    ] = await Promise.all([
      supabase
        .from("mastery_topics")
        .select("topic, mastery_score")
        .eq("user_id", user_id),

      supabase
        .from("revision_topics")
        .select("topic, next_review")
        .eq("user_id", user_id),

      supabase
        .from("weak_topics")
        .select("topic, weight")
        .eq("user_id", user_id),
    ]);

    // 2. Convert to maps for fast lookup
    const masteryMap = {};
    const srsMap = {};
    const weakMap = {};

    masteryData?.forEach((item) => {
      masteryMap[item.topic] = item.mastery_score;
    });

    srsData?.forEach((item) => {
      srsMap[item.topic] = item.next_review;
    });

    weakData?.forEach((item) => {
      weakMap[item.topic] = item.weight;
    });

    // 3. Merge all topics
    const allTopics = new Set([
      ...Object.keys(masteryMap),
      ...Object.keys(srsMap),
      ...Object.keys(weakMap),
    ]);

    const today = new Date();

    // 4. Compute priority
    const result = [];

    allTopics.forEach((topic) => {
      const mastery = masteryMap[topic] ?? 0;
      const nextReview = srsMap[topic];
      const weakWeight = weakMap[topic] ?? 0;

      // is due today
      let isDue = false;
      if (nextReview) {
        isDue = new Date(nextReview) <= today;
      }

      const priority =
        (100 - mastery) * 0.5 +
        (isDue ? 30 : 0) +
        weakWeight * 20;

      result.push({
        topic,
        priority,
        mastery,
        is_due: isDue,
      });
    });

    // 5. Sort (highest priority first)
    result.sort((a, b) => b.priority - a.priority);

    // 6. Return top 5
    return result.slice(0, 5);
  } catch (err) {
    console.error("Adaptive planner error:", err);
    return [];
  }
}