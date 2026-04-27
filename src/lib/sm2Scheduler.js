// =====================================================================
// sm2Scheduler.js  —  Supermemo 2 algorithm implementation.
//
// Reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-key-facts-retention-in-the-student
//
// The algorithm adjusts difficulty (ease factor) and scheduling based
// on recall quality, creating exponentially spaced reviews that match
// how human memory actually fades.
// =====================================================================

const MIN_EF = 1.3;
const MAX_EF = 2.5;
const DEFAULT_EF = 2.5;

/**
 * computeNextReview — applies SM-2 algorithm to current card state.
 *
 * @param {object} card Current spaced_repetition_cards row
 * @param {number} quality 0-5, where:
 *        5 = perfect recall
 *        4 = correct with hesitation
 *        3 = correct after some effort
 *        2 = partial correct
 *        1 = mostly forgotten
 *        0 = complete blackout
 * @returns {object} { newEF, newInterval, newRepetition, nextDueAt }
 */
export function computeNextReview(card, quality) {
  if (!Number.isFinite(quality) || quality < 0 || quality > 5) {
    throw new Error("quality must be 0-5");
  }

  const currentEF = card.ease_factor || DEFAULT_EF;
  const currentInterval = card.interval_days || 1;
  const currentRep = card.repetition || 0;

  // SM-2 ease factor adjustment
  const newEF = Math.max(
    MIN_EF,
    currentEF + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  // Interval scheduling
  let newInterval;
  if (quality >= 4) {
    // Correct: space out exponentially
    if (currentRep === 0) {
      newInterval = 1;
    } else if (currentRep === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(currentInterval * newEF);
    }
  } else {
    // Incorrect or partial: reset to 1 day
    newInterval = 1;
  }

  // Clamp to reasonable bounds (1 day to 730 days / 2 years)
  newInterval = Math.max(1, Math.min(730, newInterval));

  const nextDueAt = new Date();
  nextDueAt.setDate(nextDueAt.getDate() + newInterval);

  return {
    newEF: Math.round(newEF * 100) / 100,
    newInterval,
    newRepetition: currentRep + 1,
    nextDueAt,
  };
}

/**
 * initializeCard — creates a new SM-2 card for a topic.
 * (Called on first review or from daily-plan generation.)
 */
export function initializeCard(topic, subject = null) {
  const nextDueAt = new Date();
  nextDueAt.setDate(nextDueAt.getDate() + 1); // First review tomorrow
  return {
    topic,
    subject,
    ease_factor: DEFAULT_EF,
    interval_days: 1,
    repetition: 0,
    next_due_at: nextDueAt,
  };
}

/**
 * estimateQuality — infer quality from mastery_score or explicit grade.
 * Used when mastery_topics are synced to spaced_repetition_cards.
 *
 * @param {number} masteryScore 0-100 from mastery_topics
 * @returns {number} 0-5 quality grade
 */
export function estimateQuality(masteryScore) {
  if (masteryScore >= 85) return 5;
  if (masteryScore >= 70) return 4;
  if (masteryScore >= 55) return 3;
  if (masteryScore >= 40) return 2;
  if (masteryScore >= 25) return 1;
  return 0;
}

/**
 * createNextDueList — ranks cards by urgency (days overdue).
 * Used for the "What to review?" dashboard signal.
 *
 * @param {Array} cards spaced_repetition_cards rows
 * @returns {Array} sorted by (daysOverdue desc, repetition asc)
 */
export function createNextDueList(cards) {
  const now = new Date();
  return cards
    .map(card => ({
      ...card,
      daysOverdue: Math.ceil((now - new Date(card.next_due_at)) / (1000 * 60 * 60 * 24)),
    }))
    .filter(card => card.daysOverdue >= 0)
    .sort((a, b) => {
      if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
      return a.repetition - b.repetition; // less-reviewed topics first
    });
}
