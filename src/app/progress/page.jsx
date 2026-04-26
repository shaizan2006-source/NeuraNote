"use client";
import { useRouter }        from "next/navigation";
import { useProgressData }  from "@/hooks/useProgressData";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import HeroSection          from "@/components/progress/HeroSection";
import AnalyticsGrid        from "@/components/progress/AnalyticsGrid";
import InsightsPanel        from "@/components/progress/InsightsPanel";
import StudyPlanCard        from "@/components/progress/StudyPlanCard";
import ExamCountdownCard    from "@/components/progress/ExamCountdownCard";
import DashboardSidebar     from "@/components/dashboard/DashboardSidebar";

function Skeleton() {
  const s = { background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "skeleton-pulse 1.5s ease-in-out infinite" };
  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ ...s, height: 155, flex: 2 }} />
        <div style={{ ...s, height: 155, flex: 1 }} />
        <div style={{ ...s, height: 155, flex: 1 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ ...s, height: 120 }} />)}
      </div>
      <div style={{ ...s, height: 60, marginBottom: 14 }} />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ ...s, height: 140, flex: 1 }} />
        <div style={{ ...s, height: 140, flex: 1 }} />
      </div>
    </>
  );
}

function ProgressInner() {
  const router                   = useRouter();
  const { data, loading, error } = useProgressData();
  const { dailyPlan }            = useDashboard();

  if (error === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "linear-gradient(180deg, #0A0A0A 0%, #1A1A2E 100%)" }}>
      <DashboardSidebar />
      <main style={{
        flex: 1, padding: "24px 28px", maxWidth: 1100, margin: "0 auto",
        width: "100%", overflowY: "auto", boxSizing: "border-box",
      }}>
        <div style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "4px 12px", color: "#71717a",
              fontSize: 11, cursor: "pointer", transition: "border-color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f4f4f5" }}>Progress</h1>
          {loading && <span style={{ fontSize: 10, color: "#3f3f46" }}>Loading…</span>}
        </div>

        {loading ? <Skeleton /> : data ? (
          <>
            <HeroSection data={data} />
            <AnalyticsGrid data={data} />
            <InsightsPanel
              peakStudyHour={data.peakStudyHour}
              avgSessionDepthMins={data.avgSessionDepthMins}
              strongestSubject={data.strongestSubject}
              streak={data.streak}
              difficultyBreakdown={data.difficultyBreakdown}
              weeklyChange={data.weeklyChange}
            />
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px" }}>
                <StudyPlanCard studyPlanProgress={data.studyPlanProgress} dailyPlan={dailyPlan} />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <ExamCountdownCard
                  examName={data.examName}
                  examDaysLeft={data.examDaysLeft}
                  examReadiness={data.examReadiness}
                  syllabusPct={data.syllabusPct}
                />
              </div>
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
