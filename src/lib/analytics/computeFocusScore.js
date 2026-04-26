/**
 * computeFocusScore
 *
 * Uses the same weights as the server (streak 40%, study volume 40%, mastery 20%)
 * so the breakdown sums to focusScore. The server value is used as canonical score;
 * this function extracts the per-factor breakdown for UI display.
 *
 * TODO: When session-level completion tracking is added, replace volume factor
 * with a composite of completion rate + volume for more precision.
 */

export function computeFocusScore(data) {
  const empty = {
    score: 0,
    breakdown: { consistency: 0, volume: 0, mastery: 0 },
    maxPoints: { consistency: 40, volume: 40, mastery: 20 },
  };
  if (!data) return empty;

  const {
    streak = 0,
    totalStudyTimeMins = 0,
    topicsMastered = 0,
    totalTopics = 0,
  } = data;

  const consistency = Math.min(streak / 7, 1) * 40;
  const volume      = Math.min(totalStudyTimeMins / 180, 1) * 40;
  const mastery     = totalTopics > 0 ? (topicsMastered / totalTopics) * 20 : 0;

  return {
    score: data.focusScore ?? Math.min(100, Math.round(consistency + volume + mastery)),
    breakdown: {
      consistency: Math.round(consistency),
      volume:      Math.round(volume),
      mastery:     Math.round(mastery),
    },
    maxPoints: { consistency: 40, volume: 40, mastery: 20 },
  };
}
