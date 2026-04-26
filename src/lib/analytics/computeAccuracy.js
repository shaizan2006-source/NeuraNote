/**
 * computeAccuracy
 *
 * Derives overall, a "recent" proxy, and trend direction from API data.
 *
 * Note: the API sends topicAccuracy as top-5 by mastery_score (highest first).
 * Without time-series quiz data we approximate "recent" as the average of the
 * top-3 actively studied topics. A dedicated quiz-answer table would give exact
 * per-session accuracy — mark as TODO.
 *
 * TODO: Add recent accuracy from a quiz_answers table (date-windowed, last 7 days).
 */

export function computeAccuracy(data) {
  const empty = { overall: 0, recent: null, byTopic: [], trend: "stable", retentionScore: 0 };
  if (!data) return empty;

  const { avgAccuracy = 0, topicAccuracy = [], retentionScore = 0 } = data;

  // Proxy for recent: avg of top-3 topics (they accumulate more recent activity)
  const recent =
    topicAccuracy.length >= 3
      ? Math.round(
          topicAccuracy.slice(0, 3).reduce((s, t) => s + (t.accuracy || 0), 0) / 3
        )
      : avgAccuracy;

  // Trend direction
  const diff = recent - avgAccuracy;
  const trend = diff > 5 ? "up" : diff < -5 ? "down" : "stable";

  return {
    overall: avgAccuracy,
    recent,
    byTopic: topicAccuracy,
    trend,
    retentionScore,
  };
}
