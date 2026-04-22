'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import TopBar from '@/components/shared/TopBar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import TimerRing from '@/components/shared/TimerRing';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AI_TIPS = [
  'Focus on the big picture first — details come later.',
  'Try summarising each concept in your own words.',
  'Take notes as you study — it significantly improves retention.',
  'Break down complex problems into smaller steps.',
  "You're making real progress. Keep going!",
];

export default function FocusSessionActive({
  tasks,
  setTasks,
  durationSeconds,
  documentId,
  documentName,
  userId,
  onSessionEnd,
}) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [paused, setPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (paused || timeLeft <= 0) {
      if (timeLeft <= 0) setTimeUp(true);
      return;
    }
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
  const allDone = !currentTask && pendingTasks.length === 0;

  const handleMarkDone = useCallback(async () => {
    if (!currentTask) return;
    const nextPending = pendingTasks[0];
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === currentTask.id) return { ...t, status: 'done' };
        if (nextPending && t.id === nextPending.id) return { ...t, status: 'current' };
        return t;
      })
    );

    // Log to focus_progress (non-critical)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/focus-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          task: currentTask.name,
          task_index: doneTasks.length,
          difficulty: 'medium',
          completed: true,
          document_id: documentId || null,
          document_name: documentName || null,
        }),
      });
    } catch {
      // Non-critical: logging failure does not break the session
    }
  }, [currentTask, pendingTasks, doneTasks.length, userId, documentId, documentName, setTasks]);

  const handleStop = () => {
    if (window.confirm('End session? Your task progress will be saved.')) {
      onSessionEnd();
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

  // ── Time's up state ───────────────────────────────────────────────
  if (timeUp && !allDone) {
    return (
      <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, padding: SPACING.xxl }}>
        <TopBar title="Time's Up" />
        <div style={{ ...panelStyle, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '32px', marginBottom: SPACING.md }}>⏰</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
            Time's up!
          </div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>
            {pendingTasks.length + (currentTask ? 1 : 0)} task{(pendingTasks.length + (currentTask ? 1 : 0)) > 1 ? 's' : ''} remaining. Continue?
          </div>
          <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
            <Button label="Keep Going" variant="primary" onClick={() => { setTimeLeft(900); setTimeUp(false); }} />
            <Button label="End Session" variant="secondary" onClick={onSessionEnd} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={documentName ? `Focus: ${documentName.length > 24 ? documentName.slice(0, 24) + '…' : documentName}` : 'Focus Session'}
      />

      <div style={{ padding: `${SPACING.xl} ${SPACING.xxl}`, maxWidth: '900px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.xl }}>

        {/* ── Left: Timer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.xl }}>
          <TimerRing timeLeft={timeLeft} duration={durationSeconds} paused={paused} size={220} />

          {documentName && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
              Est. {Math.round(durationSeconds / 60)} min session
            </div>
          )}

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
            current={doneTasks.length}
            total={tasks.length}
            label={`Progress: ${doneTasks.length}/${tasks.length} done`}
          />

          {/* Current task */}
          {currentTask && (
            <div style={{ ...panelStyle, border: `2px solid ${COLORS.border.accent}`, background: COLORS.bg.accentLight }}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
                CURRENT
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg }}>
                <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, lineHeight: 1.5, flex: 1 }}>
                  {currentTask.name}
                </div>
                {currentTask.estimatedMinutes && (
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginLeft: SPACING.md, flexShrink: 0 }}>
                    ⏱ {currentTask.estimatedMinutes} min
                  </div>
                )}
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
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                    ☐ {t.name}
                  </div>
                  {t.estimatedMinutes && (
                    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, opacity: 0.6 }}>
                      {t.estimatedMinutes}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All done — early completion */}
          {allDone && (
            <div style={{ ...panelStyle, textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: SPACING.md }}>🎉</div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
                All tasks complete! Great focus session.
              </div>
              <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
                <Button label="Keep Going" variant="secondary" onClick={() => setPaused(false)} />
                <Button label="End Session" variant="primary" onClick={onSessionEnd} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
