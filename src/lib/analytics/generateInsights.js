/**
 * generateInsights
 *
 * Produces up to 5 data-backed, human-readable insights ranked by urgency.
 * Each insight: { icon, message, type, action? }
 *   type:   "timing" | "positive" | "warning" | "nudge"
 *   action: { label, type: "start_session" | "review_topic" | "take_quiz" }
 *           (action field is wired for future CTA rendering; not rendered in v1)
 *
 * Priority scale (lower = shown first):
 *   1 — urgent (exam countdown, very low accuracy)
 *   2 — high impact (broken streak, session too short, big drop)
 *   3 — moderate (weekly change, difficulty imbalance, consistency gap)
 *   4 — informational positive (peak time, streak building, accuracy strong)
 *   5 — celebratory / context (strongest subject, perfect week)
 *
 * TODO: Replace difficulty-based proxies with ML-inferred cognitive load scores.
 * TODO: Add percentile benchmarks from real anonymised cohort data.
 */

function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

const MIN_SESSIONS_FOR_INSIGHTS = 2;

export function generateInsights(data, computed = {}) {
  if (!data) return [];

  const sessionsCompleted = data.sessionsCompleted || 0;
  if (sessionsCompleted < MIN_SESSIONS_FOR_INSIGHTS) return [];

  const {
    peakStudyHour,
    avgSessionDepthMins = 0,
    strongestSubject,
    streak              = 0,
    difficultyBreakdown = {},
    weeklyChange        = 0,
    avgAccuracy         = 0,
    topicAccuracy       = [],
    topicsMastered      = 0,
    totalTopics         = 0,
    examDaysLeft        = null,
    examName            = null,
    examReadiness       = 0,
    peerPercentile      = 0,
  } = data;

  const { trends } = computed;
  const { consistencyPct = 0, activeDays = 0 } = trends || {};

  const db         = { easy: difficultyBreakdown.easy || 0, medium: difficultyBreakdown.medium || 0, hard: difficultyBreakdown.hard || 0 };
  const diffTotal  = db.easy + db.medium + db.hard;

  const candidates = [];

  // ── PRIORITY 1: Urgent ─────────────────────────────────────────────────────

  if (examName && examDaysLeft !== null && examDaysLeft > 0 && examDaysLeft <= 14) {
    candidates.push({
      priority: 1, icon: "", type: "warning",
      message: `${examName} is ${examDaysLeft} day${examDaysLeft === 1 ? "" : "s"} away — switch focus to revision, not new topics`,
      action: { label: "Review Topics", type: "review_topic" },
    });
  }

  if (avgAccuracy > 0 && avgAccuracy < 40 && totalTopics >= 3) {
    const weakest = topicAccuracy.length > 0 ? topicAccuracy[topicAccuracy.length - 1] : null;
    const hint    = weakest ? ` — start with ${weakest.topic}` : "";
    candidates.push({
      priority: 1, icon: "", type: "warning",
      message: `${avgAccuracy}% accuracy — master the basics${hint} before pushing forward`,
      action: { label: "Review Weak Topics", type: "review_topic" },
    });
  }

  // ── PRIORITY 2: High impact ─────────────────────────────────────────────────

  if (avgSessionDepthMins > 0 && avgSessionDepthMins < 12 && sessionsCompleted >= 3) {
    candidates.push({
      priority: 2, icon: "", type: "warning",
      message: `Avg session: ${avgSessionDepthMins} min — too short for retention. Target 20+ min for ideas to stick`,
      action: { label: "Start 25-min Session", type: "start_session" },
    });
  }

  if (streak === 0 && sessionsCompleted >= 3) {
    candidates.push({
      priority: 2, icon: "", type: "nudge",
      message: "Your streak broke — one session today resets the momentum. Daily beats cramming",
      action: { label: "Start a Session", type: "start_session" },
    });
  }

  if (weeklyChange <= -30 && sessionsCompleted > 5) {
    candidates.push({
      priority: 2, icon: "", type: "nudge",
      message: `Study time dropped ${Math.abs(weeklyChange)}% this week — even 20 min/day rebuilds the habit`,
      action: { label: "Start Short Session", type: "start_session" },
    });
  }

  // ── PRIORITY 3: Moderate ───────────────────────────────────────────────────

  if (avgSessionDepthMins > 45) {
    candidates.push({
      priority: 3, icon: "", type: "warning",
      message: `${avgSessionDepthMins}-min avg sessions — focus drops after 45 min. Try 25-min Pomodoro sprints`,
      action: { label: "Try Focus Mode", type: "start_session" },
    });
  }

  if (weeklyChange >= 25) {
    candidates.push({
      priority: 3, icon: "", type: "positive",
      message: `${weeklyChange}% more study time vs last week — your strongest week recently`,
    });
  }

  if (diffTotal >= 5 && db.easy / diffTotal > 0.65) {
    candidates.push({
      priority: 3, icon: "", type: "nudge",
      message: `${Math.round((db.easy / diffTotal) * 100)}% easy sessions — challenge yourself with medium/hard topics to grow faster`,
      action: { label: "Try Hard Quiz", type: "take_quiz" },
    });
  }

  if (consistencyPct <= 28 && sessionsCompleted >= 3) {
    candidates.push({
      priority: 3, icon: "", type: "nudge",
      message: `Only ${activeDays} of 7 days studied this week — spreading sessions out beats marathon cramming`,
      action: { label: "Plan Sessions", type: "start_session" },
    });
  }

  // ── PRIORITY 4: Informational positive ─────────────────────────────────────

  if (peakStudyHour !== null && peakStudyHour !== undefined && sessionsCompleted >= 4) {
    const nextHour = (peakStudyHour + 1) % 24;
    candidates.push({
      priority: 4, icon: "", type: "timing",
      message: `You study best at ${fmtHour(peakStudyHour)}–${fmtHour(nextHour)} — schedule your hardest topics in that window`,
      action: { label: "Start Session Now", type: "start_session" },
    });
  }

  if (streak >= 3 && streak < 7) {
    candidates.push({
      priority: 4, icon: "", type: "positive",
      message: `${streak}-day streak — ${7 - streak} more day${7 - streak === 1 ? "" : "s"} to lock in a full-week habit`,
    });
  }

  if (streak >= 7) {
    candidates.push({
      priority: 4, icon: "", type: "positive",
      message: `${streak}-day streak — your consistency puts you ahead of most students`,
    });
  }

  if (avgAccuracy >= 75) {
    candidates.push({
      priority: 4, icon: "", type: "positive",
      message: `${avgAccuracy}% average accuracy — strong retention. Push into harder topics now`,
      action: { label: "Take Hard Quiz", type: "take_quiz" },
    });
  }

  if (diffTotal >= 3 && db.hard / diffTotal > 0.35) {
    candidates.push({
      priority: 4, icon: "", type: "positive",
      message: `${Math.round((db.hard / diffTotal) * 100)}% hard sessions — tackling difficulty is where real growth happens`,
    });
  }

  if (examName && examDaysLeft !== null && examDaysLeft > 14 && examDaysLeft <= 60) {
    const projectedReadiness = Math.min(100, Math.round(examReadiness * 1.15));
    candidates.push({
      priority: 4, icon: "", type: "timing",
      message: `${examName} in ${examDaysLeft} days — at this pace you're on track for ~${projectedReadiness}% readiness`,
    });
  }

  if (peerPercentile >= 70) {
    candidates.push({
      priority: 4, icon: "", type: "positive",
      message: `You're outperforming ${peerPercentile}% of students — keep the momentum`,
    });
  }

  // ── PRIORITY 5: Celebratory / context ──────────────────────────────────────

  if (avgSessionDepthMins >= 20 && avgSessionDepthMins <= 40) {
    candidates.push({
      priority: 5, icon: "", type: "positive",
      message: `${avgSessionDepthMins}-min avg sessions — you're in the optimal focus zone`,
    });
  }

  if (strongestSubject && totalTopics >= 3) {
    candidates.push({
      priority: 5, icon: "", type: "positive",
      message: `${strongestSubject} is your strongest subject — use it as a confidence anchor before exams`,
    });
  }

  if (consistencyPct === 100) {
    candidates.push({
      priority: 5, icon: "", type: "positive",
      message: "You studied every day this week — perfect consistency",
    });
  }

  // Sort ascending by priority (1 = most urgent), strip internal field, return top 5
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, 5).map(({ priority, ...rest }) => rest);
}
