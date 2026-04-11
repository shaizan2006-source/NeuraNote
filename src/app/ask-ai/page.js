"use client";

import { useEffect } from "react";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import AskAISection from "@/components/dashboard/AskAISection";

function AskAIInner() {
  const { streak, progressQuestions, masteryTopics, documentId } = useDashboard();

  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--surface-base)" }}>
      <MilestoneToast />

      {/* ── Sidebar ── */}
      <ErrorBoundary label="Sidebar">
        <DashboardSidebar />
      </ErrorBoundary>

      {/* ── Main chat area ── */}
      <div style={{
        flex:           1,
        display:        "flex",
        flexDirection:  "column",
        height:         "100vh",
        overflow:       "hidden",
        minWidth:       0,
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          padding:      "14px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink:   0,
          background:   "var(--surface-base)",
          gap:          12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width:          32,
              height:         32,
              borderRadius:   "50%",
              background:     "linear-gradient(135deg, var(--brand), #4f46e5)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       14,
              flexShrink:     0,
            }}>✦</div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Ask AI</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                {documentId ? "PDF connected · Ask anything" : "Ask any academic question"}
              </p>
            </div>
          </div>

        </div>

        {/* ── Chat ── */}
        <div style={{
          flex:     1,
          overflow: "hidden",
          padding:  "0 24px",
          display:  "flex",
          flexDirection: "column",
        }}>
          <ErrorBoundary label="Ask AI">
            <AskAISection fullPage />
          </ErrorBoundary>
        </div>

      </div>
    </div>
  );
}

export default function AskAIPage() {
  return (
    <DashboardProvider>
      <AskAIInner />
    </DashboardProvider>
  );
}
