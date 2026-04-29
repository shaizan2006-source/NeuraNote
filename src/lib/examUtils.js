// src/lib/examUtils.js

/**
 * Derive a 0–59% accuracy from weak topic attempt count.
 * Topics are weak by definition (count >= 5), so accuracy is capped at 59%.
 * @param {number} count
 * @returns {number}
 */
export function deriveAccuracy(count) {
  return Math.max(0, Math.min(59, 100 - count * 12));
}

/**
 * Generate a day-by-day study plan from weak topics and exam date.
 * @param {{ exam_date: string }} exam
 * @param {Array<{ topic: string, count: number }>} weakTopics  — already filtered by subject, sorted by count desc
 * @param {(date: string) => number} getDaysLeft
 * @returns {Array<{ day: number, date: string, action: string, topics: typeof weakTopics, isRestDay: boolean }>}
 */
export function generateExamStudyPlan(exam, weakTopics, getDaysLeft) {
  const rawDays = getDaysLeft(exam.exam_date);

  // Exam is today
  if (rawDays === 0) {
    return [{
      day: 0,
      date: "Today",
      action: "🔥 Final Revision",
      topics: weakTopics.slice(0, 5),
      isRestDay: false,
    }];
  }

  // Exam already passed
  if (rawDays < 0) return [];

  const daysLeft = rawDays;
  const action =
    daysLeft > 7  ? "📘 Learn"
    : daysLeft > 3 ? "📝 Practice"
    :                "⚡ Revise";

  // No weak topics — produce generic schedule
  if (weakTopics.length === 0) {
    return Array.from({ length: Math.min(daysLeft, 7) }, (_, i) => ({
      day: i + 1,
      date: new Date(Date.now() + i * 86_400_000)
        .toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      action,
      topics: [],
      isRestDay: false,
    }));
  }

  const topicsPerDay = Math.min(3, Math.ceil(weakTopics.length / daysLeft));

  return Array.from({ length: daysLeft }, (_, i) => {
    const slice = weakTopics.slice(i * topicsPerDay, (i + 1) * topicsPerDay);
    return {
      day: i + 1,
      date: new Date(Date.now() + i * 86_400_000)
        .toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      action,
      topics: slice,
      isRestDay: slice.length === 0,
    };
  });
}

/**
 * Safe sessionStorage read — returns null in private browsing mode.
 * @param {string} key
 * @returns {any|null}
 */
export function readSessionStorage(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Safe sessionStorage write.
 * @param {string} key
 * @param {any} value
 */
export function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing — silently ignore
  }
}

/**
 * Safe sessionStorage remove.
 * @param {string} key
 */
export function clearSessionStorage(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
