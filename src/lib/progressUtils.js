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

export function computePeakHour(focusRows, tzOffsetHours = 0) {
  const counts = {};
  const offsetMs = tzOffsetHours * 3600 * 1000;
  focusRows.forEach(row => {
    if (!row.created_at) return;
    const localMs = new Date(row.created_at).getTime() + offsetMs;
    const h = Math.floor(localMs / (3600 * 1000)) % 24;
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

// ── New functions powered by learning_events ──────────────────────────────────

// Engagement score 0–100.
// Weights: question frequency 30%, coach share 25%, follow-up depth 20%, streak 15%, topic breadth 10%.
export function computeEngagementScore(events, streak = 0, totalTopics = 0, days = 14) {
  if (!events.length) return 0;

  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  const recent = events.filter(e => new Date(e.created_at).getTime() >= cutoff);

  const questions   = recent.filter(e => e.event_type === "question_asked");
  const coachQ      = questions.filter(e => e.metadata?.mode === "coach");
  const depthValues = questions.map(e => Number(e.metadata?.depth) || 0);

  const freqScore   = Math.min(questions.length / (days * 3), 1) * 30;    // ≥3/day = full
  const coachShare  = questions.length > 0 ? (coachQ.length / questions.length) : 0;
  const coachScore  = coachShare * 25;
  const avgDepth    = depthValues.length > 0 ? depthValues.reduce((a, b) => a + b, 0) / depthValues.length : 0;
  const depthScore  = Math.min(avgDepth / 5, 1) * 20;                      // depth ≥5 = full
  const streakScore = Math.min(streak / 7, 1) * 15;
  const topics      = new Set(recent.filter(e => e.topic).map(e => e.topic));
  const breadthScore = Math.min(topics.size / 10, 1) * 10;                 // ≥10 unique topics = full

  return Math.min(100, Math.round(freqScore + coachScore + depthScore + streakScore + breadthScore));
}

// Minutes spent in answering vs coach mode, derived from session boundaries in events.
// Returns { answeringMins, coachMins, ratio } where ratio = coachMins / (answeringMins || 1).
export function computeModeBalance(events) {
  const sessions = {};
  events.forEach(e => {
    if (!e.session_id) return;
    if (!sessions[e.session_id]) sessions[e.session_id] = { answering: 0, coach: 0 };
    if (e.event_type === "question_asked") {
      const mode = e.metadata?.mode === "coach" ? "coach" : "answering";
      sessions[e.session_id][mode] += 1;
    }
  });

  // Estimate time: each question represents ~3 min of answering or ~5 min of coaching.
  let answeringMins = 0, coachMins = 0;
  Object.values(sessions).forEach(s => {
    answeringMins += s.answering * 3;
    coachMins     += s.coach     * 5;
  });

  return {
    answeringMins: Math.round(answeringMins),
    coachMins:     Math.round(coachMins),
    ratio:         answeringMins > 0 ? Math.round((coachMins / answeringMins) * 100) / 100 : 0,
  };
}

// Average depth of follow-up questions (position in thread).
// depth=0 means first question in thread, depth=3 means 4th question.
export function computeFollowupDepth(events) {
  const depthVals = events
    .filter(e => e.event_type === "question_asked" && Number.isFinite(Number(e.metadata?.depth)))
    .map(e => Number(e.metadata.depth));
  if (!depthVals.length) return 0;
  return Math.round((depthVals.reduce((a, b) => a + b, 0) / depthVals.length) * 10) / 10;
}

// Learning trend over the last 14 days split into two 7-day windows.
// Returns 'rising' | 'steady' | 'declining'.
export function computeLearningTrend(events, days = 14) {
  const now    = Date.now();
  const half   = days / 2;
  const midMs  = now - half * 24 * 3600 * 1000;
  const startMs = now - days * 24 * 3600 * 1000;

  const questions = events.filter(e => e.event_type === "question_asked");
  const prev = questions.filter(e => {
    const t = new Date(e.created_at).getTime();
    return t >= startMs && t < midMs;
  }).length;
  const curr = questions.filter(e => new Date(e.created_at).getTime() >= midMs).length;

  if (prev === 0 && curr === 0) return "steady";
  if (curr > prev * 1.15) return "rising";
  if (curr < prev * 0.85) return "declining";
  return "steady";
}

// Produce 3–5 insight pills for the Progress dashboard InsightsPanel.
// All inputs are already-computed values — no DB calls here.
export function generateInsights({
  learningTrend,
  followupDepth,
  modeBalance,
  streak,
  strongestSubject,
  avgAccuracy,
  topicAccuracy = [],
  weeklyChange,
}) {
  const insights = [];

  // Streak milestone
  if (streak >= 7)
    insights.push({ kind: "strength", text: `${streak}-day streak — you're in a learning flow.` });
  else if (streak >= 3)
    insights.push({ kind: "strength", text: `${streak}-day streak. Keep going — 7 days unlocks deep retention.` });
  else if (streak === 0)
    insights.push({ kind: "nudge", text: "Start a session today to begin your streak." });

  // Learning trend
  if (learningTrend === "rising")
    insights.push({ kind: "strength", text: "Activity is up this week — momentum is building." });
  else if (learningTrend === "declining")
    insights.push({ kind: "nudge", text: "Activity dropped this week. Even one session will reverse the trend." });

  // Coach depth
  if (followupDepth >= 3)
    insights.push({ kind: "strength", text: `Deep learning mode — your average thread depth is ${followupDepth}. You're thinking, not just asking.` });
  else if (followupDepth < 1 && modeBalance.coachMins > 0)
    insights.push({ kind: "nudge", text: "Try follow-up questions in Coach Mode to build deeper understanding." });

  // Weakest topic
  const weakest = [...topicAccuracy].sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakest && weakest.accuracy < 60)
    insights.push({ kind: "gap", text: `${weakest.topic} is your weakest area (${weakest.accuracy}%). Schedule a revision session.`, topic: weakest.topic });

  // Strongest subject
  if (strongestSubject && avgAccuracy >= 70)
    insights.push({ kind: "strength", text: `${strongestSubject} is your strongest subject. Use it to build confidence before exams.` });

  // Weekly change
  if (weeklyChange >= 20)
    insights.push({ kind: "strength", text: `Study time up ${weeklyChange}% this week. Great consistency.` });
  else if (weeklyChange <= -20)
    insights.push({ kind: "nudge", text: `Study time down ${Math.abs(weeklyChange)}% vs last week. Try to recover with two focused sessions.` });

  return insights.slice(0, 5);
}
