import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  computeFocusScore,
  computePeerPercentile,
  computeStudyTimeMins,
  computePeakHour,
  computeDailyStudyTime,
  computeWeeklyChange,
  computeStrongestSubject,
  computeStudyPlanProgress,
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

  const [streakRes, focusRes, masteryRes, examRes] = await Promise.all([
    supabase.from("study_streaks")
      .select("streak_count, last_active_date")
      .eq("user_id", user.id)
      .single(),
    supabase.from("focus_progress")
      .select("task, difficulty, active_time_seconds, created_at")
      .eq("user_id", user.id)
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
  ]);

  if (focusRes.error)   console.error("[progress/summary] focus_progress:", focusRes.error.message);
  if (masteryRes.error) console.error("[progress/summary] mastery_topics:", masteryRes.error.message);

  const streak         = streakRes.data?.streak_count  || 0;
  const lastActiveDate = streakRes.data?.last_active_date || null;
  const focusRows      = focusRes.data  || [];
  const masteryTopics  = masteryRes.data || [];
  const exam           = examRes.data?.[0] || null;

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
  const peerPercentile   = computePeerPercentile({ focusScore, streak, topicsMastered, totalTopics });
  const peakStudyHour    = computePeakHour(focusRows, 5.5); // IST = UTC+5:30
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
  });
  } catch (err) {
    console.error("[progress/summary]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
