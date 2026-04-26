/**
 * computeStudyDepth
 *
 * Classifies sessions into shallow / medium / deep.
 * Depth score is a 0–100 composite of avg duration and hard-task ratio.
 *
 * Since the API only provides avgSessionDepthMins (not per-session durations),
 * the distribution is estimated from difficultyBreakdown counts.
 *
 * TODO: Store per-session duration in focus_progress and compute exact distribution.
 */

const SHALLOW_MAX_MINS  = 10;   // < 10 min
const MEDIUM_MAX_MINS   = 25;   // 10–25 min
// >= 25 min (+ hard difficulty) = deep

export function computeStudyDepth(data) {
  const empty = {
    avgDuration: 0,
    depthScore: 0,
    distribution: { shallow: 0, medium: 0, deep: 0 },
  };
  if (!data) return empty;

  const {
    avgSessionDepthMins = 0,
    sessionsCompleted = 0,
    difficultyBreakdown = {},
  } = data;

  const easy   = difficultyBreakdown.easy   || 0;
  const medium = difficultyBreakdown.medium || 0;
  const hard   = difficultyBreakdown.hard   || 0;
  const diffTotal = easy + medium + hard;

  let distribution;
  if (diffTotal > 0) {
    // Map difficulty label → depth classification (best proxy available)
    distribution = { shallow: easy, medium, deep: hard };
  } else if (sessionsCompleted > 0) {
    // Estimate from avg duration alone
    const isDeep    = avgSessionDepthMins >= MEDIUM_MAX_MINS;
    const isMedium  = avgSessionDepthMins >= SHALLOW_MAX_MINS;
    distribution = {
      shallow: isMedium  ? 0 : sessionsCompleted,
      medium:  isMedium && !isDeep ? sessionsCompleted : 0,
      deep:    isDeep    ? sessionsCompleted : 0,
    };
  } else {
    distribution = { shallow: 0, medium: 0, deep: 0 };
  }

  // Depth score: 75% from duration quality, 25% from hard-task ratio
  const durationNorm =
    avgSessionDepthMins >= MEDIUM_MAX_MINS ? 1 :
    avgSessionDepthMins >= SHALLOW_MAX_MINS ? 0.6 :
    avgSessionDepthMins > 0 ? 0.25 : 0;
  const hardRatio    = diffTotal > 0 ? hard / diffTotal : 0;
  const depthScore   = Math.min(100, Math.round((durationNorm * 0.75 + hardRatio * 0.25) * 100));

  return {
    avgDuration: avgSessionDepthMins,
    depthScore,
    distribution,
  };
}
