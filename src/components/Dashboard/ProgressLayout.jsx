"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard }                 from "@/context/DashboardContext";
import { createClient }                 from "@supabase/supabase-js";

import CognitiveProgressCard from "@/components/progress/CognitiveProgressCard";
import FocusScoreCard        from "@/components/progress/FocusScoreCard";
import StreakCard             from "@/components/progress/StreakCard";
import StudyTimeCard         from "@/components/progress/StudyTimeCard";
import AccuracyCard          from "@/components/progress/AccuracyCard";
import SessionDepthCard      from "@/components/progress/SessionDepthCard";
import WeeklyRecapCard       from "@/components/progress/WeeklyRecapCard";
import InsightsPanel         from "@/components/progress/InsightsPanel";
import StudyPlanCard         from "@/components/progress/StudyPlanCard";
import ExamCountdownCard     from "@/components/progress/ExamCountdownCard";
import SpacedRepetitionCard  from "@/components/progress/SpacedRepetitionCard";
import ProgressQuestionsPanel from "@/components/progress/ProgressQuestionsPanel";

// Analytics hooks
import { useFocusScore }    from "@/hooks/useFocusScore";
import { useAccuracy }      from "@/hooks/useAccuracy";
import { useTrends }        from "@/hooks/useTrends";
import { useStudyInsights } from "@/hooks/useStudyInsights";
import { computeStudyDepth } from "@/lib/analytics/computeStudyDepth";

function ProgressSkeleton({ isMobile }) {
  const s = {
    background: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    animation: "skeleton-pulse 1.5s ease-in-out infinite",
  };
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gridTemplateRows: isMobile ? "auto auto auto" : "auto auto", gap: 12, marginBottom: 12 }}>
        <div style={{ ...s, gridRow: isMobile ? "1" : "1 / 3", minHeight: 280 }} />
        {!isMobile && <div style={{ ...s, height: 134 }} />}
        {!isMobile && <div style={{ ...s, height: 134 }} />}
        {isMobile && <div style={{ ...s, height: 134 }} />}
        {isMobile && <div style={{ ...s, height: 134 }} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
        {[1, 2, 3].map(i => <div key={i} style={{ ...s, height: 130 }} />)}
      </div>
      <div style={{ ...s, height: 84, marginBottom: 12 }} />
      <div style={{ ...s, height: 56, marginBottom: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ ...s, height: 160 }} />
        <div style={{ ...s, height: 160 }} />
        <div style={{ ...s, height: 160 }} />
      </div>
    </>
  );
}

export default function ProgressLayout() {
  const {
    progressSummary: data,
    progressSummaryLoading: loading,
    progressSummaryError: error,
    fetchProgressSummary,
    dailyPlan,
    toggleDashboardMode,
  } = useDashboard();
  const [isMobile, setIsMobile] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    fetchProgressSummary();
  }, [fetchProgressSummary]);

  useEffect(() => {
    // Get auth token for artifact generation (Phase 4)
    const getToken = async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        );
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
        }
      } catch (err) {
        console.error("[ProgressLayout] Failed to get auth token:", err.message);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ── Analytics (all memoized; recompute only when `data` reference changes) ──
  const focusAnalytics = useFocusScore(data);
  const accuracy       = useAccuracy(data);
  const trends         = useTrends(data);
  const localInsights  = useStudyInsights(data);
  const depthData      = useMemo(() => computeStudyDepth(data), [data]);

  // Normalise API insights ({kind,text}) → InsightsPanel shape ({icon,message,type}).
  // Falls back to locally computed insights when the API hasn't tracked enough events yet.
  const KIND_MAP = { strength: "positive", gap: "warning", nudge: "nudge" };
  const KIND_ICON = { strength: "✨", gap: "⚠️", nudge: "💡" };
  const insights = useMemo(() => {
    const api = data?.insights;
    if (Array.isArray(api) && api.length > 0) {
      return api.map(({ kind, text }) => ({
        icon:    KIND_ICON[kind] ?? "💡",
        message: text,
        type:    KIND_MAP[kind]  ?? "nudge",
      }));
    }
    return localInsights;
  }, [data, localInsights]);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (error === "unauthenticated") return null;

  if (error) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 40, gap: 8, color: "#71717a",
    }}>
      <span style={{ fontSize: 24 }}>⚠</span>
      <p style={{ margin: 0, fontSize: 14 }}>Failed to load progress data</p>
      <p style={{ margin: 0, fontSize: 12, color: "#52525b" }}>{error}</p>
    </div>
  );

  // New-user empty state — no sessions AND no mastered topics yet
  const isNewUser = !loading && data && data.sessionsCompleted === 0 && data.totalTopics === 0;

  return (
    <>
      {loading ? (
        <ProgressSkeleton isMobile={isMobile} />
      ) : isNewUser ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "48px 24px", gap: 14, textAlign: "center",
        }}>
          <span style={{ fontSize: 36 }}>📊</span>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>
            Your analytics will appear here
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#52525b", maxWidth: 280 }}>
            Complete a few study sessions and add topics to your mastery tracker — your Focus Score, Accuracy, and Insights will populate automatically.
          </p>
          <button
            onClick={toggleDashboardMode}
            style={{
              marginTop: 4, padding: "9px 20px",
              background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              border: "none", borderRadius: 8, color: "#fff",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Start Studying →
          </button>
        </div>
      ) : data ? (
        <>
          {/* Row 1: Cognitive Progress (large left) + Focus Score + Daily Streak (stacked right) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
            gridTemplateRows:    isMobile ? "auto auto auto" : "auto auto",
            gap: 12, marginBottom: 12,
          }}>
            <div style={{ gridColumn: "1", gridRow: isMobile ? "1" : "1 / 3", display: "flex", flexDirection: "column" }}>
              <CognitiveProgressCard
                topicsMastered={data.topicsMastered}
                totalTopics={data.totalTopics}
                avgAccuracy={accuracy.overall}
                retentionScore={data.retentionScore}
                peerPercentile={data.peerPercentile}
                masteryTopics={accuracy.byTopic}
                weakTopicClusters={data.weakTopicClusters ?? []}
                token={token}
              />
            </div>

            {/* FocusScoreCard — receives pre-computed breakdown so it doesn't recompute */}
            <FocusScoreCard
              focusScore={focusAnalytics.score}
              focusTrend={data.focusTrend}
              streak={data.streak}
              totalStudyTimeMins={data.totalStudyTimeMins}
              topicsMastered={data.topicsMastered}
              totalTopics={data.totalTopics}
              breakdown={focusAnalytics.breakdown}
            />

            <StreakCard streak={data.streak} lastActiveDate={data.lastActiveDate} />
          </div>

          {/* Row 2: Study Time | Accuracy | Session Depth */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 12, marginBottom: 12,
          }}>
            <StudyTimeCard
              thisWeekMins={data.thisWeekMins}
              dailyStudyTime={data.dailyStudyTime}
              peakStudyHour={data.peakStudyHour}
            />
            <AccuracyCard
              avgAccuracy={accuracy.overall}
              topicAccuracy={accuracy.byTopic}
            />
            {/* SessionDepthCard receives depthData for improved distribution display */}
            <SessionDepthCard
              avgSessionDepthMins={data.avgSessionDepthMins}
              sessionsCompleted={data.sessionsCompleted}
              difficultyBreakdown={data.difficultyBreakdown}
              depthData={depthData}
              followupDepth={data.followupDepth ?? null}
            />
          </div>

          {/* Row 3: Weekly Recap */}
          <div style={{ marginBottom: 12 }}>
            <WeeklyRecapCard
              thisWeekMins={data.thisWeekMins}
              weeklyChange={trends.studyTimeTrend}
              strongestSubject={data.strongestSubject}
              learningTrend={data.learningTrend ?? null}
              modeBalance={data.modeBalance ?? null}
            />
          </div>

          {/* Row 4: Smart Insights — fully driven by analytics layer */}
          <div style={{ marginBottom: 16 }}>
            <InsightsPanel insights={insights} />
          </div>

          {/* Row 4b: Conversational Progress Panel — Phase 5 */}
          <div style={{ marginBottom: 16 }}>
            <ProgressQuestionsPanel token={token} />
          </div>

          {/* Row 5: Study Plan + Exam Countdown + SR Review Queue */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 12,
          }}>
            <StudyPlanCard
              studyPlanProgress={data.studyPlanProgress}
              dailyPlan={dailyPlan}
              onSwitchToStudy={toggleDashboardMode}
            />
            <ExamCountdownCard
              examName={data.examName}
              examDaysLeft={data.examDaysLeft}
              examReadiness={data.examReadiness}
              syllabusPct={data.syllabusPct}
            />
            <SpacedRepetitionCard nextDueTopics={data.nextDueTopics} />
          </div>
        </>
      ) : null}
    </>
  );
}
