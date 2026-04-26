/**
 * computeProgress
 *
 * Derives cognitive score and mastery percentage from available API data.
 *
 * cognitiveScore blends accuracy (40%), retention (40%), and mastery% (20%).
 * This mirrors the examReadiness formula in the API but is scoped to learning
 * state rather than exam preparedness.
 *
 * TODO: When the API exposes per-topic last_studied_at, split topics into
 * "started", "in progress", and "completed" instead of just mastered/total.
 */

export function computeProgress(data) {
  const empty = {
    masteryPct: 0,
    cognitiveScore: 0,
    topicsCompleted: 0,
    topicsTotal: 0,
  };
  if (!data) return empty;

  const {
    topicsMastered = 0,
    totalTopics    = 0,
    avgAccuracy    = 0,
    retentionScore = 0,
  } = data;

  const masteryPct      = totalTopics > 0 ? Math.round((topicsMastered / totalTopics) * 100) : 0;
  const cognitiveScore  = Math.min(100, Math.round(avgAccuracy * 0.4 + retentionScore * 0.4 + masteryPct * 0.2));

  return {
    masteryPct,
    cognitiveScore,
    topicsCompleted: topicsMastered,
    topicsTotal:     totalTopics,
  };
}
