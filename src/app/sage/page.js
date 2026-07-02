"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { TrackingProvider } from "@/components/providers/TrackingProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import AskAISidebar from "@/components/AskAI/AskAISidebar";
import AskAISection from "@/components/dashboard/AskAISection";
import MilestoneToast, { checkMilestones } from "@/components/ui/MilestoneToast";
import { useActivePDF } from "@/hooks/useActivePDF";
import UserProfileButton from "@/components/ui/UserProfile";
import { loadSavedChatId } from "@/lib/chatStorage";
import { LogoMark } from "@/components/brand/Logo";
import { FLAGS } from "@/lib/featureFlags";

// Incognito glasses — inline SVG per design system (no icon libs)
function IncognitoIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7" cy="15.5" r="3.2" />
      <circle cx="17" cy="15.5" r="3.2" />
      <path d="M10.2 15h3.6" />
      <path d="M4 11.5l1.6-5A1.8 1.8 0 0 1 7.3 5h9.4a1.8 1.8 0 0 1 1.7 1.5l1.6 5" />
    </svg>
  );
}

function AskAIInner() {
  const searchParams = useSearchParams();
  const {
    streak, progressQuestions, masteryTopics, user, setDocumentId, setQuestion,
    incognitoSession, startIncognito, closeIncognito,
  } = useDashboard();
  const userId = user?.id;
  const incognito = FLAGS.INCOGNITO && !!incognitoSession;

  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("amn_ask_prefill");
      if (!prefill) return;
      sessionStorage.removeItem("amn_ask_prefill");
      setQuestion(prefill);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (incognito) closeIncognito();
    setActiveConversationId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("cid");
    window.history.replaceState({}, "", url.toString());
  }

  function handleSelectConversation(id) {
    // Opening a saved conversation always leaves incognito — never ambiguous.
    if (incognito) closeIncognito();
    setActiveConversationId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("cid", id);
    window.history.replaceState({}, "", url.toString());
  }

  async function handleToggleIncognito() {
    if (incognito) { closeIncognito(); return; }
    const session = await startIncognito();
    if (!session) return;
    // Incognito never attaches to a saved conversation
    setActiveConversationId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("cid");
    window.history.replaceState({}, "", url.toString());
  }

  function handleSelectPdf(pdfId) {
    setActivePdfId(pdfId);
  }

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "var(--bg-base)",
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
          padding: "14px 24px", borderBottom: "1px solid var(--border-hairline)",
          flexShrink: 0, background: "color-mix(in srgb, var(--bg-elevated) 85%, transparent)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-primary)", flexShrink: 0,
            }}><LogoMark size={24} strokeWidth={1.7} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>Sage</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>
                {incognito
                  ? "Incognito — this chat won't be saved to your history"
                  : activePdf
                    ? <><span style={{ color: "var(--info)" }}>◈ {activePdf.name}</span> · Ask Sage anything</>
                    : "Your notes that answer back"
                }
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {FLAGS.INCOGNITO && (
              incognito ? (
                // Persistent badge — always visible while incognito is active
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 10px 5px 12px", borderRadius: 999,
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-secondary)",
                }}>
                  <IncognitoIcon />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Incognito</span>
                  <button
                    onClick={handleToggleIncognito}
                    aria-label="Close incognito chat"
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: "0 2px",
                      color: "var(--text-tertiary)", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    }}
                  >
                    End
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleToggleIncognito}
                  aria-label="Start incognito chat"
                  title="Incognito chat — not saved to your history, auto-deletes in 7 days"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: 8,
                    background: "none", border: "1px solid var(--border-hairline)",
                    color: "var(--text-tertiary)", cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "var(--border-hairline)"; }}
                >
                  <IncognitoIcon />
                </button>
              )
            )}
            <UserProfileButton user={user} />
          </div>
        </div>

        {/* Chat area */}
        <div style={{
          flex: 1, overflow: "hidden", padding: "0 24px",
          display: "flex", flexDirection: "column",
        }}>
          <ErrorBoundary label="Sage">
            <AskAISection fullPage conversationId={incognito ? null : activeConversationId} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export default function AskAIPage() {
  return (
    <TrackingProvider surface="ask_ai">
      <DashboardProvider>
        <DrawerProvider>
          <Suspense fallback={null}>
            <AskAIInner />
          </Suspense>
        </DrawerProvider>
      </DashboardProvider>
    </TrackingProvider>
  );
}
