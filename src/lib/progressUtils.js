export function computeFocusScore({ streak, totalStudyTimeMins, topicsMastered, totalTopics }) {
  const consistency = Math.min(streak / 7, 1) * 40;
  const depth = Math.min(totalStudyTimeMins / 180, 1) * 40;
  const mastery = totalTopics > 0 ? (topicsMastered / totalTopics) * 20 : 0;
  return Math.min(100, Math.round(consistency + depth + mastery));
}

export function computePeerPercentile({ focusScore, streak, topicsMastered, totalTopics }) {
  const masteryPct = totalTopics > 0 ? topicsMastered / totalTopics : 0;
  const raw = (focusScore / 100) * 60 + (streak > 3 ? 15 : 0) + masteryPct * 25;
  return Math.min(95, Math.max(10, Math.round(raw)));
}

export function computeStudyTimeMins(focusRows) {
  return focusRows.reduce((sum, row) => {
    const secs = row.active_time_seconds > 0 ? row.active_time_seconds : 20 * 60;
    return sum + secs;
  }, 0) / 60;
}

export function computePeakHour(focusRows) {
  const counts = {};
  focusRows.forEach(row => {
    if (!row.created_at) return;
    const h = new Date(row.created_at).getUTCHours();
    counts[h] = (counts[h] || 0) + 1;
  });
  const entries = Object.entries(counts);
  if (!entries.length) return 20;
  return parseInt(entries.sort((a, b) => b[1] - a[1])[0][0]);
}

export function computeDailyStudyTime(focusRows, days = 14, now = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayRows = focusRows.filter(r => r.created_at?.startsWith(dateStr));
    return { date: dateStr, minutes: Math.round(computeStudyTimeMins(dayRows)) };
  });
}

export function computeWeeklyChange(dailyStudyTime) {
  if (dailyStudyTime.length < 14) return 0;
  const thisWeek = dailyStudyTime.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const lastWeek = dailyStudyTime.slice(-14, -7).reduce((s, d) => s + d.minutes, 0);
  if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

export function computeStrongestSubject(masteryTopics) {
  if (!masteryTopics.length) return null;
  const bySubject = {};
  masteryTopics.forEach(t => {
    const s = t.subject || "General";
    if (!bySubject[s]) bySubject[s] = { total: 0, count: 0 };
    bySubject[s].total += t.mastery_score || 0;
    bySubject[s].count++;
  });
  return Object.entries(bySubject)
    .map(([subject, { total, count }]) => ({ subject, avg: total / count }))
    .sort((a, b) => b.avg - a.avg)[0]?.subject || null;
}

export function computeStudyPlanProgress(focusRows) {
  const activeDates = new Set(
    focusRows.filter(r => r.created_at).map(r => r.created_at.split("T")[0])
  );
  const currentDay = activeDates.size;
  const totalDays = 30;
  return { currentDay, totalDays, completionPct: Math.min(100, Math.round((currentDay / totalDays) * 100)) };
}
