'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import FocusInlineChat from '@/components/focus/FocusInlineChat';
import { COLORS, TYPOGRAPHY } from '@/lib/styles';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { FocusSessionProvider, useFocusSession } from '@/context/FocusSessionContext';
import { useActivePDF } from '@/hooks/useActivePDF';
import FocusSessionSetup from '@/components/focus/FocusSessionSetup';
import FocusModeLoader from '@/components/focus/FocusModeLoader';
import FocusSessionActive from '@/components/focus/FocusSessionActive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  } = useDashboard();

  const { activePdf } = useActivePDF(user?.id);
  const { clearSession } = useFocusSession();

  const [sessionState, setSessionState] = useState(
    () => (focusSessionTasks.length > 0 ? 'active' : 'setup')
  );
  const [generatingForDoc, setGeneratingForDoc] = useState(null); // { id, name }
  const [generatingError, setGeneratingError] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialInput, setChatInitialInput] = useState('');
  const [isMobile, setIsMobile] = useState(false);

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
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
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
  };

  return (
    <div style={pageStyle}>
      <ContextualSidebar />
      <div style={contentContainerStyle}>
        {sessionState === 'setup' && (
          <FocusSessionSetup
            activePdf={activePdf}
            documents={documents}
            onSelectPDF={handleSelectPDF}
            error={generatingError}
            userId={user?.id}
          />
        )}
        {sessionState === 'generating' && (
          <FocusModeLoader documentName={generatingForDoc?.name} />
        )}
        {sessionState === 'active' && (
          <FocusSessionActive
            tasks={focusSessionTasks}
            setTasks={setFocusSessionTasks}
            durationSeconds={focusSessionDuration}
            documentId={focusSessionDocumentId}
            documentName={focusSessionDocumentName}
            userId={user?.id}
            onSessionEnd={() => {
              clearSession();
              setSessionState('setup');
            }}
            onAskAI={handleAskAI}
          />
        )}
      </div>

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
