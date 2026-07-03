"use client";

import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { TrackingProvider } from "@/components/providers/TrackingProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import GreetingRow from "@/components/dashboard/GreetingRow";
import BentoGrid from "@/components/dashboard/BentoGrid";
import QuickChatDrawer from "@/components/QuickChat/QuickChatDrawer";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useEffect, useState } from "react";
import { useActivePDF } from "@/hooks/useActivePDF";
import DashboardSkeleton from "@/components/shared/DashboardSkeleton";
import EmptyState from "@/components/dashboard/EmptyState";
import { determineDashboardMode } from "@/lib/dashboardMode";
import MorningMode from "@/components/dashboard/modes/MorningMode";
import SlumpMode from "@/components/dashboard/modes/SlumpMode";
import NightMode from "@/components/dashboard/modes/NightMode";
import ActiveMode from "@/components/dashboard/modes/ActiveMode";
import StandardMode from "@/components/dashboard/modes/StandardMode";

function DashboardInner() {
  const { streak, progressQuestions, masteryTopics, user, dataReady, documents, focusSession } = useDashboard();
  const [showUpload, setShowUpload] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Time-of-day mode is computed CLIENT-SIDE after mount; computing it during render
  // (determineDashboardMode → new Date().getHours()) makes the SSR HTML differ from the
  // client's first render → hydration mismatch. Stable "standard" until mounted.
  const [timeMode, setTimeMode] = useState("standard");

  const userId       = user?.id;
  const studiedToday = (progressQuestions ?? 0) > 0;
  const inSession    = !!focusSession;
  const { activePdf } = useActivePDF(userId);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    setTimeMode(determineDashboardMode({ inSession, studiedToday }));
  }, [inSession, studiedToday]);
  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  // Render the deterministic skeleton until mounted (and while loading): the SSR HTML then
  // exactly matches the client's first render, eliminating dashboard hydration mismatches.
  // ALL hooks are above this early return, so hook order stays stable.
  if (!mounted || !dataReady) return <DashboardSkeleton />;

  const userName     = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const hasDocuments = documents && documents.length > 0;

  return (
    <div style={{
      display:    "flex",
      height:     "100vh",
      overflow:   "hidden",
      background: "var(--bg-base)",
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
