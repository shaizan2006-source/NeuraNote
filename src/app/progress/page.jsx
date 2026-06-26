"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter }             from "next/navigation";
import { useProgressData }       from "@/hooks/useProgressData";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import CognitiveProgressCard     from "@/components/progress/CognitiveProgressCard";
import FocusScoreCard            from "@/components/progress/FocusScoreCard";
import StreakCard                 from "@/components/progress/StreakCard";
import StudyTimeCard             from "@/components/progress/StudyTimeCard";
import AccuracyCard              from "@/components/progress/AccuracyCard";
import SessionDepthCard          from "@/components/progress/SessionDepthCard";
import WeeklyRecapCard           from "@/components/progress/WeeklyRecapCard";
import InsightsPanel             from "@/components/progress/InsightsPanel";
import StudyPlanCard             from "@/components/progress/StudyPlanCard";
import ExamCountdownCard         from "@/components/progress/ExamCountdownCard";
import DashboardSidebar          from "@/components/dashboard/DashboardSidebar";
import CohortWidget              from "@/components/dashboard/CohortWidget";

// Analytics
import { useFocusScore }    from "@/hooks/useFocusScore";
import { useAccuracy }      from "@/hooks/useAccuracy";
import { useTrends }        from "@/hooks/useTrends";
import { useStudyInsights } from "@/hooks/useStudyInsights";
import { computeStudyDepth } from "@/lib/analytics/computeStudyDepth";

function Skeleton({ isMobile }) {
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        <div style={{ ...s, height: 160 }} />
        <div style={{ ...s, height: 160 }} />
      </div>
    </>
  );
}

function ProgressInner() {
  const router                   = useRouter();
  const { data, loading, error } = useProgressData();
  const { dailyPlan }            = useDashboard();
  const [isMobile, setIsMobile]  = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Analytics — same enrichment as ProgressLayout
  const focusAnalytics = useFocusScore(data);
  const accuracy       = useAccuracy(data);
  const trends         = useTrends(data);
  const insights       = useStudyInsights(data);
  const depthData      = useMemo(() => computeStudyDepth(data), [data]);

  if (error === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface) 100%)" }}>
      <DashboardSidebar />
      <main style={{
        flex: 1,
        padding: isMobile ? "16px 12px" : "24px 28px",
        maxWidth: 1100, margin: "0 auto",
        width: "100%", overflowY: "auto", boxSizing: "border-box",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "4px 12px", color: "var(--text-tertiary)",
              fontSize: 11, cursor: "pointer", transition: "border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Progress</h1>
          {loading && <span style={{ fontSize: 10, color: "var(--text-disabled)" }}>Loading…</span>}
          {!loading && data && (
            <div style={{ marginLeft: "auto" }}>
              <CohortWidget peerPercentile={data.peerPercentile} cohortSize={data.cohortSize} />
            </div>
          )}
        </div>

        {loading ? <Skeleton isMobile={isMobile} /> : data && data.sessionsCompleted === 0 && data.totalTopics === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "64px 24px", gap: 14, textAlign: "center",
          }}>
            <span style={{ fontSize: 36 }}>📊</span>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Your analytics will appear here
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", maxWidth: 280 }}>
              Complete study sessions and add topics — your Focus Score, Accuracy, and Insights will populate automatically.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                marginTop: 4, padding: "9px 20px",
                background: "var(--accent-grad)",
                border: "none", borderRadius: 8, color: "var(--bg-base)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Go to Dashboard →
            </button>
          </div>
        ) : data ? (
          <>
            {/* Row 1: Cognitive Progress (large left) + Focus Score + Daily Streak */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
              gridTemplateRows: isMobile ? "auto auto auto" : "auto auto",
              gap: 12,
            }}>
              <div style={{ gridColumn: "1", gridRow: isMobile ? "1" : "1 / 3", display: "flex", flexDirection: "column" }}>
                <CognitiveProgressCard
                  topicsMastered={data.topicsMastered}
                  totalTopics={data.totalTopics}
                  avgAccuracy={accuracy.overall}
                  retentionScore={data.retentionScore}
                  peerPercentile={data.peerPercentile}
                  masteryTopics={accuracy.byTopic}
                />
              </div>
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
              gap: 12,
              marginTop: 12,
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
              <SessionDepthCard
                avgSessionDepthMins={data.avgSessionDepthMins}
                sessionsCompleted={data.sessionsCompleted}
                difficultyBreakdown={data.difficultyBreakdown}
                depthData={depthData}
              />
            </div>

            {/* Row 3: Weekly Recap */}
            <div style={{ marginTop: 12 }}>
              <WeeklyRecapCard
                thisWeekMins={data.thisWeekMins}
                weeklyChange={trends.studyTimeTrend}
                strongestSubject={data.strongestSubject}
              />
            </div>

            {/* Row 4: Smart Insights — fully driven by analytics layer */}
            <InsightsPanel insights={insights} />

            {/* Row 5: Study Plan + Exam Countdown */}
            <div style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12,
            }}>
              <StudyPlanCard studyPlanProgress={data.studyPlanProgress} dailyPlan={dailyPlan} />
              <ExamCountdownCard
                examName={data.examName}
                examDaysLeft={data.examDaysLeft}
                examReadiness={data.examReadiness}
                syllabusPct={data.syllabusPct}
              />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <DashboardProvider>
      <ProgressInner />
    </DashboardProvider>
  );
}
