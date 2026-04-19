'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import TimerRing from '@/components/shared/TimerRing';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const SESSION_DURATION = 25 * 60; // 25 minutes in seconds

const INITIAL_TASKS = [
  { id: '1', name: 'Review Carnot Cycle notes', status: 'current' },
  { id: '2', name: 'Read Ch.3 Thermodynamics', status: 'done' },
  { id: '3', name: 'Problem Set 1', status: 'pending' },
  { id: '4', name: 'Watch lecture video', status: 'pending' },
];

const AI_TIPS = [
  'Focus on the big picture first — details come later.',
  'Try summarizing each concept in your own words.',
  'Take notes as you study — it significantly improves retention.',
  'Break down complex problems into smaller steps.',
  "You're making real progress. Keep going!",
];

export default function FocusPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [paused, setPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (paused || timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [paused, timeLeft]);

  // Rotate AI tip every 2 minutes
  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % AI_TIPS.length), 120_000);
    return () => clearInterval(id);
  }, []);

  const currentTask = tasks.find((t) => t.status === 'current');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const doneCount = doneTasks.length;

  const handleMarkDone = useCallback(() => {
    if (!currentTask) return;
    const nextPending = pendingTasks[0];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === currentTask.id) return { ...t, status: 'done' };
        if (nextPending && t.id === nextPending.id) return { ...t, status: 'current' };
        return t;
      })
    );
  }, [currentTask, pendingTasks]);

  const handleStop = () => {
    if (window.confirm('End session? Your task progress will be saved.')) {
      router.back();
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
  };

  const panelStyle = {
    border: `1px solid ${COLORS.border.light}`,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    background: COLORS.bg.card,
  };

  return (
    <div style={pageStyle}>
      <TopBar title="Focus Session" />

      <div style={{ padding: `${SPACING.xl} ${SPACING.xxl}`, maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.xl }}>

        {/* ── Left: Timer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.xl }}>
          <TimerRing timeLeft={timeLeft} duration={SESSION_DURATION} paused={paused} size={220} />

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button
              label={paused ? '▶ Resume' : '⏸ Pause'}
              variant={paused ? 'primary' : 'secondary'}
              onClick={() => setPaused((p) => !p)}
            />
            <Button label="⏹ Stop" variant="secondary" onClick={handleStop} />
          </div>

          {/* AI Tip */}
          <div style={{ ...panelStyle, width: '100%', background: 'rgba(34,211,238,0.04)', border: `1px solid rgba(34,211,238,0.15)` }}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.label, color: COLORS.accent.cyan, fontWeight: 700, marginBottom: SPACING.sm }}>
              💡 AI Tip
            </div>
            <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, margin: 0, lineHeight: 1.7 }}>
              {AI_TIPS[tipIndex]}
            </p>
          </div>
        </div>

        {/* ── Right: Task List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          <ProgressBar
            current={doneCount}
            total={tasks.length}
            label={`Progress: ${doneCount}/${tasks.length} done`}
          />

          {/* Current task */}
          {currentTask && (
            <div style={{ ...panelStyle, border: `2px solid ${COLORS.border.accent}`, background: COLORS.bg.accentLight }}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                CURRENT
              </div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, marginBottom: SPACING.lg, lineHeight: 1.5 }}>
                {currentTask.name}
              </div>
              <Button label="✓ Mark Done" variant="primary" fullWidth onClick={handleMarkDone} />
            </div>
          )}

          {/* Done tasks */}
          {doneTasks.length > 0 && (
            <div style={panelStyle}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                DONE
              </div>
              {doneTasks.map((t) => (
                <div key={t.id} style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.disabled, textDecoration: 'line-through', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  ✔ {t.name}
                </div>
              ))}
            </div>
          )}

          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div style={panelStyle}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                PENDING
              </div>
              {pendingTasks.map((t) => (
                <div key={t.id} style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  ☐ {t.name}
                </div>
              ))}
            </div>
          )}

          {/* All done state */}
          {!currentTask && pendingTasks.length === 0 && (
            <div style={{ ...panelStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: SPACING.md }}>🎉</div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
                All tasks complete!
              </div>
              <Button label="Back to Dashboard" variant="primary" onClick={() => router.push('/dashboard')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
