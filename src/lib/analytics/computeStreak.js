/**
 * computeStreak
 *
 * A "valid study day" requires at least VALID_STUDY_MINUTES studied.
 * currentStreak comes from the DB (authoritative). longestStreak is the
 * maximum consecutive valid days found in the 14-day dailyStudyTime window,
 * clamped to be at least as large as the current streak.
 *
 * TODO: Persist longest_streak in study_streaks table and return from API
 * so we can show lifetime longest streak, not just the 14-day window.
 */

export const VALID_STUDY_MINUTES = 20;

export function computeStreak(data) {
  const empty = {
    currentStreak: 0,
    longestStreak: 0,
    studiedToday: false,
    validDayThreshold: VALID_STUDY_MINUTES,
    activeDaysThisWeek: 0,
  };
  if (!data) return empty;

  const { streak = 0, lastActiveDate = null, dailyStudyTime = [] } = data;
  const today = new Date().toISOString().split("T")[0];

  const studiedToday = lastActiveDate === today;

  // Longest consecutive run of valid days in the 14-day window
  let longestInWindow = 0;
  let run = 0;
  for (const { minutes } of dailyStudyTime) {
    if (minutes >= VALID_STUDY_MINUTES) {
      run++;
      if (run > longestInWindow) longestInWindow = run;
    } else {
      run = 0;
    }
  }
  const longestStreak = Math.max(streak, longestInWindow);

  // Active (valid) days in last 7
  const last7 = dailyStudyTime.slice(-7);
  const activeDaysThisWeek = last7.filter(d => d.minutes >= VALID_STUDY_MINUTES).length;

  return {
    currentStreak: streak,
    longestStreak,
    studiedToday,
    validDayThreshold: VALID_STUDY_MINUTES,
    activeDaysThisWeek,
  };
}
