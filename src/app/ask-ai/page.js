"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AskAISidebar from "@/components/AskAI/AskAISidebar";
import AskAISection from "@/components/dashboard/AskAISection";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useActivePDF } from "@/hooks/useActivePDF";
import UserProfileButton from "@/components/ui/UserProfile";
import { loadSavedChatId } from "@/lib/chatStorage";

function AskAIInner() {
  const searchParams = useSearchParams();
  const { streak, progressQuestions, masteryTopics, user, setDocumentId } = useDashboard();
  const userId = user?.id;
  const { activePdf, setActivePdfId } = useActivePDF(userId);

  // Active conversation — priority: URL ?cid= → localStorage → null
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const fromUrl = searchParams.get("cid");
    if (fromUrl) return fromUrl;
    return loadSavedChatId(); // restore last session on refresh without ?cid=
  });

  // If conversation was restored from localStorage (no ?cid= in URL), sync the URL
  useEffect(() => {
    if (!activeConversationId) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.get("cid")) {
      url.searchParams.set("cid", activeConversationId);
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — activeConversationId is stable from useState init

  useEffect(() => {
    checkMilestones({ streak, progressQuestions, masteryTopics: masteryTopics?.length ?? 0 });
  }, [streak, progressQuestions, masteryTopics]);

  // When Ask AI creates a new conversation (first question in a fresh chat),
  // update the active ID and URL so follow-up questions use the saved thread.
  useEffect(() => {
    function onNewConv(e) {
      const { id } = e.detail;
      setActiveConversationId(prev => prev === null ? id : prev);
      const url = new URL(window.location.href);
      if (!url.searchParams.get("cid")) {
        url.searchParams.set("cid", id);
        window.history.replaceState({}, "", url.toString());
      }
    }
    window.addEventListener("askmynotes:new-conversation", onNewConv);
    return () => window.removeEventListener("askmynotes:new-conversation", onNewConv);
  }, []);

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
          <UserProfileButton user={user} />
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
        <Suspense fallback={null}>
          <AskAIInner />
        </Suspense>
      </DrawerProvider>
    </DashboardProvider>
  );
}
