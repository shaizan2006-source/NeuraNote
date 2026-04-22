'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import { COLORS, TYPOGRAPHY } from '@/lib/styles';
import { useDashboard } from '@/context/DashboardContext';
import { useActivePDF } from '@/hooks/useActivePDF';
import FocusSessionSetup from '@/components/focus/FocusSessionSetup';
import FocusModeLoader from '@/components/focus/FocusModeLoader';
import FocusSessionActive from '@/components/focus/FocusSessionActive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function FocusPage() {
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

  const [sessionState, setSessionState] = useState(
    () => (focusSessionTasks.length > 0 ? 'active' : 'setup')
  );
  const [generatingForDoc, setGeneratingForDoc] = useState(null); // { id, name }
  const [generatingError, setGeneratingError] = useState(null);

  // Resume after page refresh during generation
  useEffect(() => {
    const resumeDocId = sessionStorage.getItem('focusSelectedDocumentId');
    const resumeDocName = sessionStorage.getItem('focusSelectedDocumentName');
    if (resumeDocId && sessionState === 'setup') {
      handleSelectPDF(resumeDocId, resumeDocName || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!res.ok) throw new Error(data.error || 'generation_failed');

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
      setGeneratingError(err.message === 'pdf_not_found'
        ? 'PDF not found. Please select another.'
        : 'Failed to generate tasks. Please try again.');
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
  };

  return (
    <div style={pageStyle}>
      <ContextualSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
            onSessionEnd={() => setSessionState('setup')}
          />
        )}
      </div>
    </div>
  );
}
