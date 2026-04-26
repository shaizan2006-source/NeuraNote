/**
 * PROGRESS BACKEND REFERENCE
 * ──────────────────────────
 * Single source of truth for all data available on the /progress page.
 * Import `useProgressData` into any new progress component to get live data.
 *
 * API ENDPOINT
 *   GET /api/progress/summary
 *   Auth: Bearer <supabase_access_token>  (auto-handled by the hook)
 *
 * SUPABASE TABLES QUERIED
 *   study_streaks   → streak_count, last_active_date
 *   focus_progress  → task, difficulty, active_time_seconds, created_at
 *   mastery_topics  → topic, mastery_score (0–100), subject
 *   exams           → name, exam_date  (status = "active")
 */

// ── Hook (use this in any "use client" component) ─────────────────────────────
export { useProgressData } from "@/hooks/useProgressData";

// ── Data shape returned by the hook / API ─────────────────────────────────────
/**
 * @typedef {Object} ProgressData
 *
 * STREAK & ACTIVITY
 * @property {number}      streak            - Consecutive study days
 * @property {string|null} lastActiveDate    - ISO date of last session e.g. "2026-04-26"
 *
 * STUDY TIME
 * @property {number}   totalStudyTimeMins  - All-time study minutes
 * @property {number}   thisWeekMins        - Minutes studied in last 7 days
 * @property {Array<{date: string, minutes: number}>} dailyStudyTime
 *                                          - 14-day breakdown, oldest first
 *
 * MASTERY & ACCURACY
 * @property {number}   topicsMastered      - Topics with mastery_score >= 50
 * @property {number}   totalTopics         - Total topics attempted
 * @property {number}   avgAccuracy         - Average mastery_score across all topics (0–100)
 * @property {number}   retentionScore      - % of topics with mastery_score >= 70 (0–100)
 * @property {Array<{topic: string, accuracy: number, subject: string}>} topicAccuracy
 *                                          - Top 5 topics by mastery score
 *
 * SESSIONS
 * @property {number}   sessionsCompleted   - Total focus_progress rows
 * @property {number}   avgSessionDepthMins - Average session length in minutes
 * @property {{easy: number, medium: number, hard: number}} difficultyBreakdown
 *                                          - Count of sessions per difficulty level
 *
 * FOCUS SCORE  (computed, 0–100)
 *   Formula: consistency(40%) + depth(40%) + mastery(20%)
 *   • consistency = min(streak/7, 1) × 40
 *   • depth       = min(totalStudyTimeMins/180, 1) × 40
 *   • mastery     = (topicsMastered/totalTopics) × 20
 * @property {number}        focusScore      - 0–100
 * @property {"up"|"down"}   focusTrend      - vs previous week's focus score
 * @property {number}        peerPercentile  - % of peer users beaten (10–95)
 * @property {number|null}   peakStudyHour   - Most-active hour (0–23, IST)
 *
 * WEEKLY RECAP
 * @property {number}      weeklyChange      - % change in study time vs prior week
 * @property {string|null} strongestSubject  - Subject with highest avg mastery_score
 *
 * EXAM
 * @property {string|null} examName          - Active exam name
 * @property {number|null} examDaysLeft      - Days until exam_date
 * @property {number}      examReadiness     - avgAccuracy×0.6 + retentionScore×0.4
 * @property {number}      syllabusPct       - topicsMastered/totalTopics × 100
 *
 * STUDY PLAN
 * @property {{currentDay: number, totalDays: number, completionPct: number}} studyPlanProgress
 *   currentDay  = unique dates with at least one session
 *   totalDays   = 30 (fixed plan length)
 *   completionPct = min(100, currentDay/30 × 100)
 */

// ── Utility computations (importable individually if needed) ──────────────────
export {
  computeFocusScore,
  computePeerPercentile,
  computeStudyTimeMins,
  computePeakHour,
  computeDailyStudyTime,
  computeWeeklyChange,
  computeStrongestSubject,
  computeStudyPlanProgress,
} from "@/lib/progressUtils";

// ── Quick-start example ───────────────────────────────────────────────────────
/**
 * USAGE IN A NEW COMPONENT:
 *
 *   "use client";
 *   import { useProgressData } from "@/lib/progressBackend";
 *
 *   export default function MyProgressCard() {
 *     const { data, loading, error } = useProgressData();
 *
 *     if (error === "unauthenticated") { redirect to /login }
 *     if (loading) return <Skeleton />;
 *     if (!data)   return null;
 *
 *     // data is typed as ProgressData above — all fields are always present
 *     return <div>{data.streak} day streak · {data.focusScore}/100 focus</div>;
 *   }
 */
