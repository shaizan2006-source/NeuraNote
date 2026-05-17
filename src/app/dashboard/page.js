"use client";

import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { TrackingProvider } from "@/components/providers/TrackingProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import GreetingRow from "@/components/Dashboard/GreetingRow";
import BentoGrid from "@/components/Dashboard/BentoGrid";
import QuickChatDrawer from "@/components/QuickChat/QuickChatDrawer";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useEffect, useState, useMemo } from "react";
import { useActivePDF } from "@/hooks/useActivePDF";
import DashboardSkeleton from "@/components/shared/DashboardSkeleton";
import { useSlowLoad } from "@/hooks/useSlowLoad";
import EmptyState from "@/components/dashboard/EmptyState";
import { determineDashboardMode } from "@/lib/dashboardMode";
import MorningMode from "@/components/dashboard/modes/MorningMode";
import SlumpMode from "@/components/dashboard/modes/SlumpMode";
import NightMode from "@/components/dashboard/modes/NightMode";
import ActiveMode from "@/components/dashboard/modes/ActiveMode";
import StandardMode from "@/components/dashboard/modes/StandardMode";

function DashboardInner() {
  const { streak, progressQuestions, masteryTopics, user, userReady, documents, focusSession } = useDashboard();
  const showSkeleton = useSlowLoad(!userReady);
  const [showUpload, setShowUpload] = useState(false);
  if (showSkeleton) return <DashboardSkeleton />;
  const userId = user?.id;
  const { activePdf } = useActivePDF(userId);
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const hasDocuments = documents && documents.length > 0;
  const studiedToday = (progressQuestions ?? 0) > 0;
  const inSession = !!focusSession;
  const timeMode = useMemo(() => determineDashboardMode({ inSession, studiedToday }), [inSession, studiedToday]);

  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  return (
    <div style={{
      display:    "flex",
      height:     "100vh",
      overflow:   "hidden",
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
    }}>
      <MilestoneToast />

      <ErrorBoundary label="Sidebar">
        <DashboardSidebar />
      </ErrorBoundary>

      {/* Main area */}
      <div style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        padding:       "24px",
        overflowY:     "auto",
        overflowX:     "hidden",
        minWidth:      0,
      }}>
        <GreetingRow userName={userName} />

        {hasDocuments ? (() => {
          const grid = (
            <ErrorBoundary label="BentoGrid">
              <BentoGrid activePdf={activePdf} />
            </ErrorBoundary>
          );
          if (timeMode === "morning") return <MorningMode userName={userName}>{grid}</MorningMode>;
          if (timeMode === "slump")   return <SlumpMode userName={userName}>{grid}</SlumpMode>;
          if (timeMode === "night")   return <NightMode userName={userName}>{grid}</NightMode>;
          if (timeMode === "active")  return <ActiveMode>{grid}</ActiveMode>;
          return <StandardMode>{grid}</StandardMode>;
        })() : (
          <EmptyState onUploadClick={() => setShowUpload(true)} />
        )}
      </div>

      {/* QuickChat drawer (fixed overlay) */}
      <QuickChatDrawer userId={userId} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <TrackingProvider surface="dashboard">
      <DashboardProvider>
        <DrawerProvider>
          <DashboardInner />
        </DrawerProvider>
      </DashboardProvider>
    </TrackingProvider>
  );
}
