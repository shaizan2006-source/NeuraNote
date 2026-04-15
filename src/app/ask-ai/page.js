"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AskAISidebar from "@/components/AskAI/AskAISidebar";
import AskAISection from "@/components/dashboard/AskAISection";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useActivePDF } from "@/hooks/useActivePDF";

function AskAIInner() {
  const searchParams = useSearchParams();
  const { streak, progressQuestions, masteryTopics, user, setDocumentId } = useDashboard();
  const userId = user?.id;
  const { activePdf, setActivePdfId } = useActivePDF(userId);

  // Active conversation (from URL ?cid= or sidebar selection)
  const [activeConversationId, setActiveConversationId] = useState(
    () => searchParams.get("cid") || null
  );

  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  // Sync active PDF into DashboardContext documentId
  useEffect(() => {
    if (activePdf?.id && setDocumentId) setDocumentId(activePdf.id);
  }, [activePdf]);

  function handleNewChat() {
    setActiveConversationId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("cid");
    window.history.replaceState({}, "", url.toString());
  }

  function handleSelectConversation(id) {
    setActiveConversationId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("cid", id);
    window.history.replaceState({}, "", url.toString());
  }

  function handleSelectPdf(pdfId) {
    setActivePdfId(pdfId);
  }

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)",
    }}>
      <MilestoneToast />

      <ErrorBoundary label="Sidebar">
        <AskAISidebar
          userId={userId}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          activePdf={activePdf}
          onSelectPdf={handleSelectPdf}
        />
      </ErrorBoundary>

      {/* Main chat area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden", minWidth: 0,
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0, background: "rgba(17,17,17,0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #8B5CF6, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, flexShrink: 0,
            }}>✦</div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f4f4f5" }}>Ask AI</p>
              <p style={{ margin: 0, fontSize: 11, color: "#52525b" }}>
                {activePdf
                  ? <><span style={{ color: "#22D3EE" }}>◈ {activePdf.name}</span> · Ask anything</>
                  : "Ask any academic question"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1, overflow: "hidden", padding: "0 24px",
          display: "flex", flexDirection: "column",
        }}>
          <ErrorBoundary label="Ask AI">
            <AskAISection fullPage conversationId={activeConversationId} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function AskAIPage() {
  return (
    <DashboardProvider>
      <DrawerProvider>
        <AskAIInner />
      </DrawerProvider>
    </DashboardProvider>
  );
}
