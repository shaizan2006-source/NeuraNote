import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  computeFocusScore,
  computeStudyTimeMins,
  computePeakHour,
  computeDailyStudyTime,
  computeWeeklyChange,
  computeStrongestSubject,
  computeStudyPlanProgress,
  computeEngagementScore,
  computeModeBalance,
  computeFollowupDepth,
  computeLearningTrend,
  generateInsights,
} from "@/lib/progressUtils";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUser(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(req) {
  try {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [streakRes, focusRes, masteryRes, examRes, eventsRes, srRes] = await Promise.all([
    supabase.from("study_streaks")
      .select("streak_count, last_active_date")
      .eq("user_id", user.id)
      .single(),
    supabase.from("focus_progress")
      .select("task, difficulty, active_time_seconds, created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("mastery_topics")
      .select("topic, mastery_score, subject")
      .eq("user_id", user.id),
    supabase.from("exams")
      .select("name, exam_date")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("exam_date", { ascending: true })
      .limit(1),
    supabase.from("learning_events")
      .select("event_type, metadata, session_id, topic, created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.rpc("sr_next_due", { p_user_id: user.id, p_limit: 20 }),
  ]);

  if (focusRes.error)   console.error("[progress/summary] focus_progress:", focusRes.error.message);
  if (masteryRes.error) console.error("[progress/summary] mastery_topics:", masteryRes.error.message);
  if (eventsRes.error)  console.error("[progress/summary] learning_events:", eventsRes.error.message);
  if (srRes.error)      console.error("[progress/summary] sr_next_due:", srRes.error.message);

  const streak         = streakRes.data?.streak_count  || 0;
  const lastActiveDate = streakRes.data?.last_active_date || null;
  const focusRows      = focusRes.data  || [];
  const masteryTopics  = masteryRes.data || [];
  const exam           = examRes.data?.[0] || null;
  const learningEvents = eventsRes.data  || [];
  const nextDueTopics  = srRes.data || [];

  const dailyStudyTime     = computeDailyStudyTime(focusRows, 14);
  const totalStudyTimeMins = Math.round(dailyStudyTime.reduce((s, d) => s + d.minutes, 0));
  const thisWeekMins       = Math.round(dailyStudyTime.slice(-7).reduce((s, d) => s + d.minutes, 0));
  const weeklyChange       = computeWeeklyChange(dailyStudyTime);

  const topicsMastered = masteryTopics.filter(t => (t.mastery_score || 0) >= 50).length;
  const totalTopics    = masteryTopics.length;
  const avgAccuracy    = totalTopics > 0
    ? Math.round(masteryTopics.reduce((s, t) => s + (t.mastery_score || 0), 0) / totalTopics)
    : 0;
  const retentionScore = totalTopics > 0
    ? Math.round(masteryTopics.filter(t => (t.mastery_score || 0) >= 70).length / totalTopics * 100)
    : 0;

  const focusScore       = computeFocusScore({ streak, totalStudyTimeMins, topicsMastered, totalTopics });
  const peakStudyHour    = computePeakHour(focusRows, 5.5); // IST = UTC+5:30

  // Real cohort percentile: rank this user's streak among users preparing for the SAME exam.
  // Returned only when the cohort is large enough to be meaningful (else null -> UI hides it),
  // so we never show a fabricated number. (At scale, back this with a precomputed snapshot.)
  let peerPercentile = null;
  {
    const { data: profile } = await supabase.from("profiles").select("exam_type").eq("id", user.id).maybeSingle();
    if (profile?.exam_type) {
      const { data: cohort } = await supabase.from("profiles").select("id").eq("exam_type", profile.exam_type).limit(5000);
      const cohortIds = (cohort ?? []).map((p) => p.id);
      if (cohortIds.length >= 8) {
        const { data: streaks } = await supabase.from("study_streaks").select("streak_count").in("user_id", cohortIds);
        const vals = (streaks ?? []).map((s) => s.streak_count ?? 0);
        if (vals.length >= 8) {
          peerPercentile = Math.round((vals.filter((v) => v < streak).length / vals.length) * 100);
        }
      }
    }
  }
  const strongestSubject = computeStrongestSubject(masteryTopics);

  const avgSessionDepthMins = focusRows.length > 0
    ? Math.round(focusRows.reduce((s, r) => s + (r.active_time_seconds > 0 ? r.active_time_seconds / 60 : 20), 0) / focusRows.length)
    : 0;

  const topicAccuracy = [...masteryTopics]
    .sort((a, b) => (b.mastery_score || 0) - (a.mastery_score || 0))
    .slice(0, 5)
    .map(t => ({ topic: t.topic, accuracy: t.mastery_score || 0, subject: t.subject }));

  const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
  focusRows.forEach(r => {
    if (r.difficulty && r.difficulty in difficultyBreakdown) difficultyBreakdown[r.difficulty]++;
  });

  let examName = null, examDaysLeft = null, examReadiness = 0, syllabusPct = 0;
  if (exam) {
    examName      = exam.name;
    examDaysLeft  = Math.ceil((new Date(exam.exam_date + "T00:00:00") - new Date()) / 864e5);
    examReadiness = Math.min(100, Math.round(avgAccuracy * 0.6 + retentionScore * 0.4));
    syllabusPct   = totalTopics > 0 ? Math.round(topicsMastered / totalTopics * 100) : 0;
  }

  const lastWeekRows = focusRows.filter(r => {
    if (!r.created_at) return false;
    const daysAgo = (Date.now() - new Date(r.created_at).getTime()) / 864e5;
    return daysAgo >= 7 && daysAgo < 14;
  });
  const prevScore = computeFocusScore({
    streak:             Math.max(0, streak - 1),
    totalStudyTimeMins: Math.round(computeStudyTimeMins(lastWeekRows)),
    topicsMastered:     Math.max(0, topicsMastered - 1),
    totalTopics,
  });
  const focusTrend = focusScore >= prevScore ? "up" : "down";

  const studyPlanProgress = computeStudyPlanProgress(focusRows);

  // ── Derived from learning_events ──────────────────────────────────
  const engagementScore = computeEngagementScore(learningEvents, streak, totalTopics);
  const modeBalance     = computeModeBalance(learningEvents);
  const followupDepth   = computeFollowupDepth(learningEvents);
  const learningTrend   = computeLearningTrend(learningEvents);

  // Removed the per-load blocking OpenAI weak-topic clustering — its result was never consumed
  // by the Progress UI, so it was pure OpenAI cost + latency on every dashboard load.
  const weakTopicClusters = [];

  const insights        = generateInsights({
    learningTrend,
    followupDepth,
    modeBalance,
    streak,
    strongestSubject,
    avgAccuracy,
    topicAccuracy,
    weeklyChange,
  });

  return NextResponse.json({
    streak, lastActiveDate,
    totalStudyTimeMins, thisWeekMins, dailyStudyTime,
    topicsMastered, totalTopics, avgAccuracy, retentionScore, topicAccuracy,
    sessionsCompleted: focusRows.length, avgSessionDepthMins,
    weeklyChange, strongestSubject,
    focusScore, focusTrend, peerPercentile, peakStudyHour,
    difficultyBreakdown,
    examName, examDaysLeft, examReadiness, syllabusPct,
    studyPlanProgress,
    // New fields powered by learning_events
    engagementScore,
    modeBalance,
    followupDepth,
    learningTrend,
    insights,
    // Phase 2: semantic weak-topic clusters
    weakTopicClusters,
    // Phase 3: spaced repetition next-due topics
    nextDueTopics,
  }, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
  } catch (err) {
    console.error("[progress/summary]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
