'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import FocusInlineChat from '@/components/focus/FocusInlineChat';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { FocusSessionProvider, useFocusSession } from '@/context/FocusSessionContext';
import { useActivePDF } from '@/hooks/useActivePDF';
import FocusSessionSetup from '@/components/focus/FocusSessionSetup';
import FocusModeLoader from '@/components/focus/FocusModeLoader';
import FocusSessionActive from '@/components/focus/FocusSessionActive';
import FocusAmbientBackground from '@/components/focus/FocusAmbientBackground';


function FocusPageContent() {
  const {
    documents,
    user,
    focusSessionTasks,
    setFocusSessionTasks,
    focusSessionDuration,
    focusSessionDocumentId,
    focusSessionDocumentName,
    startFocusSession,
    restoreFocusSession,
    clearFocusSession,
  } = useDashboard();

  const { activePdf } = useActivePDF(user?.id);
  const { clearSession } = useFocusSession();

  const [sessionState, setSessionState] = useState('setup');
  const [generatingForDoc, setGeneratingForDoc] = useState(null); // { id, name }
  const [generatingError, setGeneratingError] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialInput, setChatInitialInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [savedSession, setSavedSession] = useState(null);
  const [showResumeCard, setShowResumeCard] = useState(false);
  const [resumedTimeLeft, setResumedTimeLeft] = useState(null);

  // Check for a saved active session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('amn_focus_session');
      if (!raw) return;
      const data = JSON.parse(raw);
      const MAX_AGE_MS = 24 * 60 * 60 * 1000;
      if (!data?.sessionId || !data?.tasks?.length || Date.now() - data.startedAt > MAX_AGE_MS) {
        localStorage.removeItem('amn_focus_session');
        return;
      }
      setSavedSession(data);
      setShowResumeCard(true);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResumeSession = useCallback(() => {
    if (!savedSession) return;
    const elapsed = Math.floor((Date.now() - savedSession.startedAt) / 1000);
    const remaining = Math.max(1, savedSession.durationSeconds - elapsed);
    restoreFocusSession(savedSession);
    setResumedTimeLeft(remaining);
    setShowResumeCard(false);
    setSavedSession(null);
    setSessionState('active');
  }, [savedSession, restoreFocusSession]);

  const handleDiscardSession = useCallback(() => {
    try { localStorage.removeItem('amn_focus_session'); } catch {}
    setShowResumeCard(false);
    setSavedSession(null);
  }, []);

  // Read weak-topic prefill from ExamCard navigation
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("amn_focus_prefill");
      if (!raw) return;
      sessionStorage.removeItem("amn_focus_prefill");
      const prefill = JSON.parse(raw);
      if (prefill?.topic) {
        setChatInitialInput(
          `Help me study "${prefill.topic}"${prefill.subject ? ` from ${prefill.subject.toUpperCase()}` : ""}. Start with the key concepts I should know.`
        );
        setChatOpen(true);
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume after page refresh during generation
  useEffect(() => {
    const resumeDocId = sessionStorage.getItem('focusSelectedDocumentId');
    const resumeDocName = sessionStorage.getItem('focusSelectedDocumentName');
    if (resumeDocId && sessionState === 'setup') {
      handleSelectPDF(resumeDocId, resumeDocName || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Handle "Ask AI" button click: collapse sidebar + open chat with task context
  const handleAskAI = useCallback((taskName) => {
    // Collapse sidebar programmatically
    try {
      localStorage.setItem('amn_ctx_sidebar_collapsed', 'true');
      window.dispatchEvent(new CustomEvent('amn:sidebar:collapse'));
    } catch {}
    // Open chat with task text pre-filled
    setChatInitialInput(taskName);
    setChatOpen(true);
  }, []);

  const handleSelectPDF = async (documentId, documentName) => {
    setSessionState('generating');
    setGeneratingForDoc({ id: documentId, name: documentName });
    setGeneratingError(null);
    sessionStorage.setItem('focusSelectedDocumentId', documentId);
    sessionStorage.setItem('focusSelectedDocumentName', documentName);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/generate-focus-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'generation_failed');

      startFocusSession(
        data.tasks,
        data.totalMinutes * 60,
        data.documentId,
        data.documentName
      );
      sessionStorage.removeItem('focusSelectedDocumentId');
      sessionStorage.removeItem('focusSelectedDocumentName');
      setSessionState('active');
    } catch (err) {
      setSessionState('setup');
      const msg = err.message;
      setGeneratingError(
        msg === 'pdf_not_found'   ? '❌ Failed to upload PDF: File not found. Please select another.' :
        msg === 'pdf_parse_failed' ? '❌ Failed to upload PDF: Could not read this PDF. Please try re-uploading it.' :
        msg === 'pdf_empty'        ? '❌ Failed to upload PDF: This PDF has no readable text. Please upload a different file.' :
        '❌ Failed to generate tasks. Please try again.'
      );
    }
  };

  const pageStyle = {
    background: 'var(--bg-base)',   // fallback: matches amb-layer-base before component mounts
    height: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
    overflow: 'hidden',
  };

  const contentContainerStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    overflowY: chatOpen ? 'hidden' : 'auto',
    overflowX: 'hidden',
    // Subtle accent scrollbar on Firefox
    scrollbarWidth: 'thin',
    scrollbarColor: 'color-mix(in srgb, var(--accent) 25%, transparent) transparent',
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div style={pageStyle}>
      <FocusAmbientBackground />
      {/* Webkit scrollbar for the content scroll area */}
      <style>{`
        .amn-focus-scroll::-webkit-scrollbar { width: 4px; }
        .amn-focus-scroll::-webkit-scrollbar-track { background: transparent; }
        .amn-focus-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--accent) 25%, transparent); border-radius: 4px; }
        .amn-focus-scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--accent) 45%, transparent); }
      `}</style>
      <ContextualSidebar />
      <div className="amn-focus-scroll" style={contentContainerStyle}>
        {!showResumeCard && sessionState === 'setup' && (
          <FocusSessionSetup
            activePdf={activePdf}
            documents={documents}
            onSelectPDF={handleSelectPDF}
            error={generatingError}
            userId={user?.id}
          />
        )}
        {!showResumeCard && sessionState === 'generating' && (
          <FocusModeLoader documentName={generatingForDoc?.name} />
        )}
        {!showResumeCard && sessionState === 'active' && (
          <FocusSessionActive
            tasks={focusSessionTasks}
            setTasks={setFocusSessionTasks}
            durationSeconds={focusSessionDuration}
            initialTimeLeft={resumedTimeLeft}
            documentId={focusSessionDocumentId}
            documentName={focusSessionDocumentName}
            userId={user?.id}
            isMobile={isMobile}
            onSessionEnd={() => {
              clearSession();
              clearFocusSession();
              setResumedTimeLeft(null);
              setSessionState('setup');
            }}
            onAskAI={handleAskAI}
          />
        )}
      </div>

      {/* Resume session card */}
      <AnimatePresence>
        {showResumeCard && savedSession && (
          <motion.div
            key="resume-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 18 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              style={{
                background: COLORS.bg.card,
                border: `1px solid ${COLORS.border.light}`,
                borderRadius: RADIUS.lg,
                padding: SPACING.xxl,
                maxWidth: 380,
                width: '90%',
                boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: SPACING.md }}>⚡</div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
                Resume your session?
              </div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary, marginBottom: SPACING.xl, lineHeight: 1.6 }}>
                You have an active focus session for{' '}
                <span style={{ color: COLORS.text.primary, fontWeight: 600 }}>
                  {savedSession.documentName || 'your document'}
                </span>
                .
              </div>
              <div style={{ display: 'flex', gap: SPACING.md }}>
                <button
                  onClick={handleDiscardSession}
                  style={{
                    flex: 1, padding: `${SPACING.md} ${SPACING.lg}`,
                    background: 'transparent',
                    border: `1px solid ${COLORS.border.light}`,
                    borderRadius: RADIUS.md,
                    color: COLORS.text.secondary,
                    fontSize: TYPOGRAPHY.sizes.body,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: TYPOGRAPHY.fontFamily,
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.border.accent; e.currentTarget.style.color = COLORS.text.primary; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border.light; e.currentTarget.style.color = COLORS.text.secondary; }}
                >
                  No, new session
                </button>
                <button
                  onClick={handleResumeSession}
                  style={{
                    flex: 1, padding: `${SPACING.md} ${SPACING.lg}`,
                    background: COLORS.accent.cyan,
                    border: 'none',
                    borderRadius: RADIUS.md,
                    color: 'var(--bg-base)',
                    fontSize: TYPOGRAPHY.sizes.body,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: TYPOGRAPHY.fontFamily,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  Resume
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat drawer: flex-based (not fixed overlay) */}
      <AnimatePresence>
        {chatOpen && sessionState === 'active' && (
          <motion.div
            key="focus-chat-drawer"
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ duration: isMobile ? 0.28 : 0.25, ease: 'easeOut' }}
            style={{ display: 'flex' }}
          >
            <FocusInlineChat
              userId={user?.id}
              documentId={focusSessionDocumentId}
              documentName={focusSessionDocumentName}
              initialInput={chatInitialInput}
              onClose={() => setChatOpen(false)}
              isMobile={isMobile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FocusPageInner() {
  const { focusSessionId } = useDashboard();

  return (
    <FocusSessionProvider sessionId={focusSessionId}>
      <FocusPageContent />
    </FocusSessionProvider>
  );
}

export default function FocusPage() {
  return (
    <DashboardProvider>
      <FocusPageInner />
    </DashboardProvider>
  );
}
