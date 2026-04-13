"use client";

import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import GreetingRow from "@/components/Dashboard/GreetingRow";
import BentoGrid from "@/components/Dashboard/BentoGrid";
import QuickChatDrawer from "@/components/QuickChat/QuickChatDrawer";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useEffect } from "react";
import { useActivePDF } from "@/hooks/useActivePDF";

function DashboardInner() {
  const { streak, progressQuestions, masteryTopics, user } = useDashboard();
  const userId = user?.id;
  const { activePdf } = useActivePDF(userId);
  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

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
        <DashboardSidebar activePdfActive={!!activePdf} />
      </ErrorBoundary>

      {/* Main area */}
      <div style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        padding:       "24px",
        overflow:      "hidden",
        minWidth:      0,
      }}>
        <GreetingRow userName={userName} />

        <ErrorBoundary label="BentoGrid">
          <BentoGrid activePdf={activePdf} />
        </ErrorBoundary>
      </div>

      {/* QuickChat drawer (fixed overlay) */}
      <QuickChatDrawer userId={userId} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DrawerProvider>
        <DashboardInner />
      </DrawerProvider>
    </DashboardProvider>
  );
}
