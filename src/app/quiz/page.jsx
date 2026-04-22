'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TopBar from '@/components/shared/TopBar';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import QuizSkeleton from '@/components/shared/QuizSkeleton';

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load questions
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId, count: 12, marks: [5, 10, 20] }),
        });
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch {
        setQuestions([
          { id: 'q1', text: 'Explain the Carnot Cycle and why no real engine can achieve 100% efficiency.', marks: 10, hints: ['Define Carnot Cycle (3M)', 'Explain max efficiency (4M)', 'Compare to real engines (3M)'], sourceSnippet: 'The Carnot Cycle is the most efficient theoretical heat engine — Ch.3, p.42' },
          { id: 'q2', text: 'What is entropy and how does it relate to the second law of thermodynamics?', marks: 10, hints: ['Define entropy (3M)', 'State second law (2M)', 'Provide example (5M)'], sourceSnippet: 'Entropy measures disorder in a system — Ch.4, p.51' },
          { id: 'q3', text: 'Describe the differences between isothermal and adiabatic processes.', marks: 5, hints: ['Define isothermal (2M)', 'Define adiabatic (3M)'], sourceSnippet: 'In an isothermal process, temperature remains constant — Ch.2, p.28' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [topicId]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(evaluations).length;

  const handleSave = useCallback(async () => {
    if (!answers[currentIndex] || !currentQ) return;
    setEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQ.text, answer: answers[currentIndex], hints: currentQ.hints, totalMarks: currentQ.marks }),
      });
      const data = await res.json();
      setEvaluations((prev) => ({ ...prev, [currentIndex]: data }));
      if (currentIndex < questions.length - 1) {
        setTimeout(() => { setCurrentIndex((i) => i + 1); setEvaluating(false); }, 1200);
      } else {
        setEvaluating(false);
      }
    } catch {
      setEvaluations((prev) => ({ ...prev, [currentIndex]: { marksEarned: 0, totalMarks: currentQ.marks, feedback: 'Evaluation failed — please try again.' } }));
      setEvaluating(false);
    }
  }, [answers, currentIndex, currentQ, questions.length]);

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
  };

  if (loading) return <QuizSkeleton />;

  return (
    <div style={{ ...pageStyle, display: 'flex' }}>
      <ContextualSidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <TopBar title={`Question ${currentIndex + 1}/${questions.length}`} subtitle={formatTime(sessionSeconds)} />

      <div style={{ padding: `${SPACING.sm} ${SPACING.lg}` }}>
        <ProgressBar current={answeredCount} total={questions.length} />
        <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, marginTop: SPACING.sm }}>
          {answeredCount}/{questions.length} answered
        </div>
      </div>

      {currentQ && (
        <div style={{ padding: `0 ${SPACING.lg} ${SPACING.lg}`, display: 'grid', gridTemplateColumns: '3fr 2fr', gap: SPACING.xl, maxWidth: '1100px', margin: '0 auto' }}>
          {/* Left: Question + Answer */}
          <div>
            {/* Question Card */}
            <div style={{ border: `1px solid ${COLORS.border.lighter}`, borderRadius: RADIUS.md, padding: SPACING.lg, background: COLORS.bg.card, marginBottom: SPACING.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                <span style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary }}>▲ Question</span>
                <span style={{ fontSize: TYPOGRAPHY.sizes.caption, background: COLORS.bg.accentLight, border: `1px solid ${COLORS.border.accent}`, padding: `2px ${SPACING.sm}`, borderRadius: RADIUS.sm, color: COLORS.text.accent, fontWeight: 700 }}>
                  {currentQ.marks}M
                </span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, margin: 0, color: COLORS.text.primary }}>{currentQ.text}</p>
            </div>

            {/* Answer textarea */}
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

            {/* Evaluation result */}
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

            {/* Buttons */}
            <div style={{ display: 'flex', gap: SPACING.md }}>
              {currentIndex > 0 && (
                <Button label="← Previous" variant="secondary" onClick={() => setCurrentIndex((i) => i - 1)} />
              )}
              {!evaluations[currentIndex] && (
                <Button label="Skip" variant="ghost" onClick={() => { if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1); }} />
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
                  onClick={() => {
                    if (currentIndex < questions.length - 1) setCurrentIndex((i) => i + 1);
                    else router.push('/dashboard');
                  }}
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </div>

          {/* Right: Source + Hints + Tip */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
            {/* Source snippet */}
            <div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>📚 From your notes:</div>
              <div style={{ padding: SPACING.md, border: `1px solid rgba(34,211,238,0.2)`, borderRadius: RADIUS.md, background: 'rgba(34,211,238,0.04)', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.6, fontStyle: 'italic' }}>
                {currentQ.sourceSnippet || 'No excerpt available for this question.'}
              </div>
            </div>

            {/* Structure hints */}
            <div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>💡 Answer Structure:</div>
              <ul style={{ margin: 0, paddingLeft: SPACING.lg, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.8 }}>
                {(currentQ.hints || []).map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>

            {/* AI tip */}
            <div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: 700, marginBottom: SPACING.sm }}>🤖 AI Coach:</div>
              <div style={{ padding: SPACING.md, borderRadius: RADIUS.md, background: 'rgba(139,92,246,0.05)', border: `1px solid rgba(139,92,246,0.1)`, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.6 }}>
                Take your time with the structure — that's where most students lose marks.
              </div>
            </div>
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
