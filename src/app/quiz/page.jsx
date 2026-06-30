// src/app/quiz/page.jsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import TopBar from '@/components/shared/TopBar';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import Button from '@/components/shared/Button';
import { segmentText } from '@/lib/wordSegmenter';
import ProgressBar from '@/components/shared/ProgressBar';
import QuizSkeleton from '@/components/shared/QuizSkeleton';
import QuestionSkeleton from '@/components/quiz/QuestionSkeleton';
import QuizPDFSelector from '@/components/quiz/QuizPDFSelector';
import { useActivePDF } from '@/hooks/useActivePDF';
import { useQuizStream } from '@/hooks/useQuizStream';
import { saveQuizSession, loadQuizSession, clearQuizSession } from '@/utils/quizSession';
import { retryWithBackoff } from '@/utils/quizResilience';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import { clientFetch } from '@/lib/clientFetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Quiz state machine:
// 'init'         — checking auth + localStorage
// 'resumeDialog' — asking to resume or start new
// 'selectingPdf' — showing PDF selector
// 'active'       — quiz in progress (streamStatus tracks loading within this state)

function QuizContent() {
  const router = useRouter();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      setAuthLoading(false);
    });
  }, []);

  // ── Responsive (mobile stacks the quiz columns) ──────────────────────────
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { activePdf, loading: activePdfLoading } = useActivePDF(userId);

  // ── Prefill context (from sessionStorage amn_prefill) ────────────────────
  const [prefillContext, setPrefillContext] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("amn_prefill");
      if (raw) {
        sessionStorage.removeItem("amn_prefill");
        setPrefillContext(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // ── Documents list ────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!userId) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch('/api/documents', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => setDocuments(Array.isArray(data) ? data : []))
        .catch(() => setDocuments([]));
    });
  }, [userId]);

  // ── Quiz stream (replaces plain questions useState) ───────────────────────
  const {
    questions,
    streamStatus,
    readyCount,
    initStream,
    revealStream,
    failStream,
    restoreStream,
    cleanup: cleanupStream,
  } = useQuizStream();

  // ── Other quiz state ──────────────────────────────────────────────────────
  const [quizState, setQuizState] = useState('init');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [savedSession, setSavedSession] = useState(null);

  // ── Performance signals ───────────────────────────────────────────────────
  const [performanceSignals, setPerformanceSignals] = useState({
    questionTimes: {},
    wrongAnswers: [],
    skippedQuestions: [],
    weakConcepts: {},
  });
  const questionStartTimeRef = useRef(Date.now());

  // ── AI Coach ──────────────────────────────────────────────────────────────
  const [coachSuggestion, setCoachSuggestion] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const coachTimerRef = useRef(null);
  const autoSaveDataRef = useRef({});

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (quizState !== 'active') return;
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [quizState]);

  // ── Track per-question start time ─────────────────────────────────────────
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  // ── Init: check auth + localStorage ──────────────────────────────────────
  useEffect(() => {
    if (authLoading || activePdfLoading) return;

    const saved = loadQuizSession();
    if (saved && saved.questions.length > 0) {
      setSavedSession(saved);
      setQuizState('resumeDialog');
    } else {
      setQuizState('selectingPdf');
    }
  }, [authLoading, activePdfLoading]);

  // Keep ref current every render so the interval always saves fresh data.
  // Only persist questions that are fully ready (not streaming placeholders).
  // streamStatus is included so the autosave interval can skip mid-stream ticks.
  autoSaveDataRef.current = {
    selectedDocument,
    questions: questions.filter((q) => q._status === 'ready'),
    currentIndex,
    answers,
    evaluations,
    sessionSeconds,
    performanceSignals,
    streamStatus,
  };

  // ── Auto-save every 30s when active ──────────────────────────────────────
  // Guard: only persist when streaming is complete so a mid-reveal tick cannot
  // overwrite a full session with a truncated ready-only prefix.
  useEffect(() => {
    if (quizState !== 'active') return;
    const id = setInterval(() => {
      if (autoSaveDataRef.current.streamStatus === 'complete') saveQuizSession(autoSaveDataRef.current);
    }, 30000);
    return () => clearInterval(id);
  }, [quizState]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────
  useEffect(() => () => clearTimeout(coachTimerRef.current), []);
  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(evaluations).length;

  // ── Resume saved session ──────────────────────────────────────────────────
  const handleResume = useCallback(() => {
    if (!savedSession) return;
    setSelectedDocument(savedSession.selectedDocument);
    restoreStream(savedSession.questions);
    setCurrentIndex(savedSession.currentIndex);
    setAnswers(savedSession.answers);
    setEvaluations(savedSession.evaluations);
    setSessionSeconds(savedSession.sessionSeconds || 0);
    setPerformanceSignals(savedSession.performanceSignals || {
      questionTimes: {},
      wrongAnswers: [],
      skippedQuestions: [],
      weakConcepts: {},
    });
    setQuizState('active');
  }, [savedSession, restoreStream]);

  // ── Abandon saved session ─────────────────────────────────────────────────
  const handleAbandon = useCallback(() => {
    clearQuizSession();
    setSavedSession(null);
    setQuizState('selectingPdf');
  }, []);

  // ── PDF selected → stream questions ──────────────────────────────────────
  // Transitions to 'active' IMMEDIATELY with placeholder slots, then reveals
  // questions progressively as the API responds (fake streaming over batch).
  const handleSelectPDF = useCallback(async (documentId, documentName) => {
    const existing = loadQuizSession();
    if (existing && existing.questions.length > 0) {
      const confirmed = window.confirm(
        `You have an active quiz on "${existing.selectedDocument?.name || 'a previous PDF'}". Abandon it and start a new quiz?`
      );
      if (!confirmed) return;
      clearQuizSession();
    }

    setSelectedDocument({ id: documentId, name: documentName });
    setGenerationError(null);
    setCurrentIndex(0);
    setAnswers({});
    setEvaluations({});
    setSessionSeconds(0);
    setCoachSuggestion(null);
    setPerformanceSignals({ questionTimes: {}, wrongAnswers: [], skippedQuestions: [], weakConcepts: {} });

    // Show quiz shell instantly with 12 placeholder slots
    initStream(12);
    setQuizState('active');

    try {
      const requestBody = JSON.stringify({ documentId, userId, count: 12, marks: [5, 10, 20] });
      const data = await retryWithBackoff(
        () => clientFetch('/api/ai/generate-questions', {
          method: 'POST',
          body: requestBody,
        }).then((r) => r?.json()),
        2,
        2000,
        60000
      );

      if (!data.success) {
        setGenerationError(data.error || 'Could not generate questions from this PDF. Please try a different file.');
        failStream();
        setQuizState('selectingPdf');
        return;
      }

      if (data.sourceDocument?.id !== documentId) {
        setGenerationError('Questions were not generated from the selected PDF. Please try again.');
        failStream();
        setQuizState('selectingPdf');
        return;
      }

      // Progressively reveal questions one by one
      revealStream(data.questions);
    } catch {
      setGenerationError('Connection error. Please check your internet and try again.');
      failStream();
      setQuizState('selectingPdf');
    }
  }, [userId, initStream, revealStream, failStream]);

  // ── Evaluate answer ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!answers[currentIndex] || !currentQ || currentQ._status !== 'ready') return;
    setEvaluating(true);

    const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);

    try {
      const res = await clientFetch('/api/ai/evaluate-answer', {
        method: 'POST',
        body: JSON.stringify({
          question: currentQ.text,
          answer: answers[currentIndex],
          hints: currentQ.hints,
          totalMarks: currentQ.marks,
        }),
      });
      const data = await res.json();
      const evaluation = {
        marksEarned: data.marksEarned ?? 0,
        totalMarks: data.totalMarks ?? currentQ.marks,
        feedback: data.feedback ?? 'Evaluation complete.',
        explanation: data.explanation ?? '',
      };

      setEvaluations((prev) => ({ ...prev, [currentIndex]: evaluation }));

      // ── Performance signal collection ─────────────────────────────────────
      const isWrong = evaluation.marksEarned < evaluation.totalMarks * 0.5;
      const topicGuess = currentQ.text.split(' ').slice(0, 6).join(' ');

      setPerformanceSignals((prev) => {
        const newTimes = { ...prev.questionTimes, [currentQ.id]: timeSpent };
        const timeValues = Object.values(newTimes);
        const avgTime = Math.round(timeValues.reduce((a, b) => a + b, 0) / timeValues.length);
        const slowestEntry = Object.entries(newTimes).reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]);

        const next = {
          questionTimes: newTimes,
          wrongAnswers: isWrong
            ? [...prev.wrongAnswers, { questionId: currentQ.id, topic: topicGuess, marksEarned: evaluation.marksEarned, totalMarks: evaluation.totalMarks }]
            : prev.wrongAnswers,
          skippedQuestions: prev.skippedQuestions,
          weakConcepts: isWrong
            ? { ...prev.weakConcepts, [topicGuess]: (prev.weakConcepts[topicGuess] || 0) + 1 }
            : prev.weakConcepts,
          timePerQuestion: {
            avg: avgTime,
            slowest: slowestEntry[1] > 0 ? { topic: slowestEntry[0], seconds: slowestEntry[1] } : null,
          },
        };

        if (isWrong) {
          clearTimeout(coachTimerRef.current);
          const capturedIndex = currentIndex;
          const capturedTotal = questions.length;
          coachTimerRef.current = setTimeout(
            () => fetchCoachSuggestion(next, selectedDocument?.name, capturedIndex, capturedTotal),
            500
          );
        }

        return next;
      });

      if (currentIndex < questions.length - 1) {
        setTimeout(() => { setCurrentIndex((i) => i + 1); setEvaluating(false); }, 1200);
      } else {
        setEvaluating(false);
      }
    } catch {
      setEvaluations((prev) => ({
        ...prev,
        [currentIndex]: {
          marksEarned: 0,
          totalMarks: currentQ.marks,
          feedback: 'Evaluation failed — please try again.',
          explanation: '',
        },
      }));
      setEvaluating(false);
    }
  }, [answers, currentIndex, currentQ, questions.length, selectedDocument]);

  // ── Skip question ─────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (!currentQ || currentQ._status !== 'ready') return;
    const topicGuess = currentQ.text.split(' ').slice(0, 6).join(' ');
    setPerformanceSignals((prev) => ({
      ...prev,
      skippedQuestions: [...prev.skippedQuestions, { questionId: currentQ.id, topic: topicGuess }],
    }));
    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentQ, currentIndex, questions.length]);

  // ── Fetch AI coach suggestion ─────────────────────────────────────────────
  const fetchCoachSuggestion = async (signals, docName, questionIndex, totalQuestions) => {
    setCoachLoading(true);
    try {
      const res = await clientFetch('/api/quiz/ai-coach', {
        method: 'POST',
        body: JSON.stringify({
          signals: {
            ...signals,
            currentQuestionIndex: questionIndex,
            totalQuestions,
          },
          documentName: docName || 'your study material',
        }),
      });
      const data = await res.json();
      if (data.suggestion) setCoachSuggestion(data.suggestion);
    } catch {
      // Gracefully degrade — quiz continues without coach
    } finally {
      setCoachLoading(false);
    }
  };

  // ── Finish quiz ───────────────────────────────────────────────────────────
  const handleFinish = useCallback(async () => {
    // Fire quiz-results only for prefilled (topic-focused) quizzes
    if (userId && prefillContext?.topic && Object.keys(evaluations).length > 0) {
      const totalQ   = questions.length;
      const correctQ = questions.filter((_, i) => {
        const e = evaluations[i];
        return e && e.marksEarned >= e.totalMarks * 0.5;
      }).length;

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        fetch("/api/quiz-results", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            subject: prefillContext.subject ?? "general",
            results: [{ topic: prefillContext.topic, correct: correctQ, total: totalQ }],
          }),
        }).catch(console.error); // fire-and-forget — non-blocking
      }
    }

    clearQuizSession();
    router.push("/dashboard");
  }, [router, userId, prefillContext, evaluations, questions]);

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
  };

  // ── State: init / loading ─────────────────────────────────────────────────
  if (authLoading || activePdfLoading || quizState === 'init') {
    return <QuizSkeleton />;
  }

  // ── State: resume dialog ──────────────────────────────────────────────────
  if (quizState === 'resumeDialog' && savedSession) {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: 440,
          width: '100%',
          border: `1px solid ${COLORS.border.lighter}`,
          borderRadius: RADIUS.lg,
          padding: SPACING.xxl,
          background: COLORS.bg.card,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.lg,
        }}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>Resume Quiz?</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            You were on question {savedSession.currentIndex + 1} of {savedSession.questions.length}
            {savedSession.selectedDocument?.name ? ` in "${savedSession.selectedDocument.name}"` : ''}.
          </div>
          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button label="Resume" variant="primary" onClick={handleResume} style={{ flex: 1 }} />
            <Button label="Start Fresh" variant="secondary" onClick={handleAbandon} style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    );
  }

  // ── State: PDF selector ───────────────────────────────────────────────────
  if (quizState === 'selectingPdf') {
    return (
      <QuizPDFSelector
        activePdf={activePdf}
        documents={documents}
        onSelectPDF={handleSelectPDF}
        userId={userId}
        error={generationError}
      />
    );
  }

  // ── State: active quiz (includes streaming phase) ─────────────────────────
  const isStreaming = streamStatus === 'fetching' || streamStatus === 'revealing';

  return (
    <div style={{ ...pageStyle, display: 'flex' }}>
      <ContextualSidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <TopBar
          title={`Question ${currentIndex + 1}/${questions.length}`}
          subtitle={formatTime(sessionSeconds)}
        />

        {selectedDocument && (
          <div style={{
            padding: `${SPACING.sm} ${SPACING.lg}`,
            fontSize: TYPOGRAPHY.sizes.caption,
            color: COLORS.text.secondary,
            borderBottom: `1px solid ${COLORS.border.lighter}`,
          }}>
            {isStreaming ? 'Preparing from' : 'From'}:{' '}
            <strong>{selectedDocument.name}</strong>
            {isStreaming && (
              <span style={{ marginLeft: 8, opacity: 0.55 }}>— Your quiz is being prepared…</span>
            )}
          </div>
        )}

        <div style={{ padding: `${SPACING.sm} ${SPACING.lg}` }}>
          <ProgressBar current={answeredCount} total={questions.length} />
          <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, marginTop: SPACING.sm }}>
            {answeredCount}/{questions.length} answered
            {isStreaming && (
              <span style={{ marginLeft: 12, opacity: 0.65 }}>
                · {readyCount}/{questions.length} questions ready
              </span>
            )}
          </div>
        </div>

        {currentQ && (
          <div style={{
            padding: `0 ${SPACING.lg} ${SPACING.lg}`,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',
            gap: SPACING.xl,
            maxWidth: '1100px',
            margin: '0 auto',
          }}>
            {/* Left: Question + Answer */}
            <div>
              {currentQ._status !== 'ready' ? (
                <QuestionSkeleton
                  streamStatus={streamStatus}
                  isError={currentQ._status === 'error'}
                  errorMessage={generationError}
                />
              ) : (
                <>
                  <div style={{ border: `1px solid ${COLORS.border.lighter}`, borderRadius: RADIUS.md, padding: SPACING.lg, background: COLORS.bg.card, marginBottom: SPACING.lg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                      <span style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary }}>▲ Question</span>
                      <span style={{ fontSize: TYPOGRAPHY.sizes.caption, background: COLORS.bg.accentLight, border: `1px solid ${COLORS.border.accent}`, padding: `2px ${SPACING.sm}`, borderRadius: RADIUS.sm, color: COLORS.text.accent, fontWeight: 700 }}>
                        {currentQ.marks}M
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: COLORS.text.primary }}>{currentQ.text}</p>
                  </div>

                  <textarea
                    placeholder="Type your answer here..."
                    value={answers[currentIndex] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [currentIndex]: e.target.value }))}
                    disabled={evaluating || !!evaluations[currentIndex]}
                    style={{
                      width: '100%',
                      minHeight: '180px',
                      padding: SPACING.lg,
                      border: `1px solid ${COLORS.border.lighter}`,
                      borderRadius: RADIUS.md,
                      background: 'rgba(255,255,255,0.02)',
                      color: COLORS.text.primary,
                      fontFamily: TYPOGRAPHY.fontFamily,
                      fontSize: TYPOGRAPHY.sizes.body,
                      resize: 'vertical',
                      marginBottom: SPACING.lg,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  {evaluations[currentIndex] && (
                    <div style={{ border: `1px solid ${COLORS.border.accent}`, borderRadius: RADIUS.md, padding: SPACING.lg, background: COLORS.bg.accentLight, marginBottom: SPACING.lg }}>
                      <div style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: 700, color: COLORS.text.accent, marginBottom: SPACING.sm }}>
                        {evaluations[currentIndex].marksEarned}/{evaluations[currentIndex].totalMarks} marks
                      </div>
                      <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, margin: 0, lineHeight: 1.6 }}>
                        {evaluations[currentIndex].feedback}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: SPACING.md }}>
                    {currentIndex > 0 && (
                      <Button label="← Previous" variant="secondary" onClick={() => setCurrentIndex((i) => i - 1)} />
                    )}
                    {!evaluations[currentIndex] && (
                      <Button label="Skip" variant="ghost" onClick={handleSkip} />
                    )}
                    {!evaluations[currentIndex] ? (
                      <Button
                        label={evaluating ? 'Evaluating...' : 'Save Answer'}
                        variant="primary"
                        onClick={handleSave}
                        disabled={!answers[currentIndex] || evaluating}
                        style={{ flex: 1 }}
                      />
                    ) : (
                      <Button
                        label={currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz'}
                        variant="primary"
                        onClick={currentIndex < questions.length - 1 ? () => setCurrentIndex((i) => i + 1) : handleFinish}
                        style={{ flex: 1 }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Source + Hints + AI Coach */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
              {currentQ._status !== 'ready' ? (
                <div style={{
                  padding: SPACING.lg,
                  border: `1px solid ${COLORS.border.lighter}`,
                  borderRadius: RADIUS.md,
                  background: COLORS.bg.card,
                  fontSize: TYPOGRAPHY.sizes.caption,
                  color: COLORS.text.secondary,
                  lineHeight: 1.7,
                }}>
                  Context and hints will appear when this question is ready.
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: SPACING.sm, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Source excerpt
                    </div>
                    <div style={{ padding: SPACING.md, border: `1px solid color-mix(in srgb, var(--accent) 28%, transparent)`, borderRadius: RADIUS.md, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', fontSize: '0.78rem', color: COLORS.text.secondary, lineHeight: 1.75, wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                      {currentQ.sourceSnippet
                        ? segmentText(currentQ.sourceSnippet)
                        : 'No excerpt available for this question.'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>Answer Structure:</div>
                    <ul style={{ margin: 0, paddingLeft: SPACING.lg, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.8 }}>
                      {(currentQ.hints || []).map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>

                  <div>
                    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>AI Coach:</div>
                    <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: `1px solid color-mix(in srgb, var(--accent) 25%, transparent)`, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.6 }}>
                      {coachLoading
                        ? 'Thinking…'
                        : coachSuggestion || 'Answer a question to get coaching feedback.'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizSkeleton />}>
      <QuizContent />
    </Suspense>
  );
}
