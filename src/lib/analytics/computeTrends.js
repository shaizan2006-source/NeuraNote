/**
 * computeTrends
 *
 * Produces week-over-week trend signals from available data.
 *
 * studyTimeTrend    — exact (weeklyChange from API, uses 14-day dailyStudyTime)
 * focusScoreTrend   — directional estimate (focusTrend flag + proportional magnitude)
 * accuracyTrend     — null; requires time-series quiz data not yet available
 * streakMomentum    — categorical: strong / building / fragile / broken
 * consistencyPct    — % of last 7 days with >= 20 valid minutes
 *
 * TODO: Store weekly focusScore snapshots to compute exact focusScoreTrend.
 * TODO: Add per-session accuracy timestamps to compute accuracyTrend.
 */

import { VALID_STUDY_MINUTES } from "./computeStreak.js";

export function computeTrends(data) {
  const empty = {
    focusScoreTrend:  0,
    studyTimeTrend:   0,
    accuracyTrend:    null,
    streakMomentum:  "neutral",
    consistencyPct:   0,
    activeDays:       0,
  };
  if (!data) return empty;

  const {
    weeklyChange = 0,
    focusTrend   = "up",
    streak       = 0,
    dailyStudyTime = [],
  } = data;

  const studyTimeTrend = weeklyChange;

  // Estimate score delta magnitude from study time change (rough proxy)
  const magnitude = Math.max(1, Math.round(Math.abs(weeklyChange) * 0.15));
  const focusScoreTrend = focusTrend === "up" ? magnitude : -magnitude;

  const streakMomentum =
    streak >= 7 ? "strong"   :
    streak >= 3 ? "building" :
    streak >  0 ? "fragile"  : "broken";

  const last7      = dailyStudyTime.slice(-7);
  const activeDays = last7.filter(d => d.minutes >= VALID_STUDY_MINUTES).length;
  const consistencyPct = Math.round((activeDays / 7) * 100);

  return {
    focusScoreTrend,
    studyTimeTrend,
    accuracyTrend: null,
    streakMomentum,
    consistencyPct,
    activeDays,
  };
}
