'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { track } from '@/lib/track';
import { EVENT_TYPES } from '@/lib/eventRegistry';
import { createClient } from '@supabase/supabase-js';
import TopBar from '@/components/shared/TopBar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import TimerRing from '@/components/shared/TimerRing';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import FocusAmbience from './FocusAmbience';

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

const EXAM_WEIGHT_BADGE = {
  high:   { label: 'HIGH YIELD', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.40)',   color: '#ef4444' },
  medium: { label: 'MUST KNOW',  bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)',  color: '#f59e0b' },
};

const TASK_TYPE_PILL = {
  conceptual:   { label: 'conceptual',   bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.30)', color: '#a78bfa' },
  memorisation: { label: 'memorise',     bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)', color: '#f59e0b' },
  derivation:   { label: 'derivation',   bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.30)', color: '#60a5fa' },
  practice:     { label: 'practice',     bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.25)', color: '#22d3ee' },
  revision:     { label: 'revision',     bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  color: '#4ade80' },
};

function ExamWeightBadge({ examWeight }) {
  const cfg = EXAM_WEIGHT_BADGE[examWeight];
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      borderRadius: '4px',
      padding: '2px 7px',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.5px',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

function TaskTypePill({ taskType }) {
  const cfg = TASK_TYPE_PILL[taskType];
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      borderRadius: '4px',
      padding: '2px 7px',
      fontSize: '9px',
      fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  );
}

export default function FocusSessionActive({
  tasks,
  setTasks,
  durationSeconds,
  initialTimeLeft,
  documentId,
  documentName,
  userId,
  onSessionEnd,
  onAskAI,
}) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft ?? durationSeconds);
  const [paused, setPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const focusStartRef = useRef(Date.now());

  // Fire focus_started once on mount
  useEffect(() => {
    focusStartRef.current = Date.now();
    track(EVENT_TYPES.FOCUS_STARTED, { surface: 'focus_mode' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setTasks((prev) => {
      const current = prev.find((t) => t.status === 'current');
      const nextPending = prev.find((t) => t.status === 'pending');
      if (!current) return prev;
      return prev.map((t) => {
        if (t.id === current.id) return { ...t, status: 'done' };
        if (nextPending && t.id === nextPending.id) return { ...t, status: 'current' };
        return t;
      });
    });

    // Log to focus_progress (non-critical)
    const current = tasks.find((t) => t.status === 'current');
    const doneCount = tasks.filter((t) => t.status === 'done').length;
    if (!current) return;
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
          task: current.name,
          task_index: doneCount,
          difficulty: 'medium',
          completed: true,
          document_id: documentId || null,
          document_name: documentName || null,
        }),
      });
    } catch {
      // Non-critical: logging failure does not break the session
    }
  }, [tasks, userId, documentId, documentName, setTasks]);

  const handleStop = () => {
    if (window.confirm('End session? Your task progress will be saved.')) {
      track(EVENT_TYPES.FOCUS_ENDED, {
        surface: 'focus_mode',
        durationMs: Date.now() - focusStartRef.current,
      });
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
      <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <FocusAmbience />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, padding: SPACING.xxl }}>
          <TopBar title="Time's Up" />
          <div style={{ ...panelStyle, textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '32px', marginBottom: SPACING.md }}>⏰</div>
            <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 700, color: COLORS.text.primary, marginBottom: SPACING.sm }}>
              Time's up!
            </div>
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary, marginBottom: SPACING.lg }}>
              {pendingTasks.length + (currentTask ? 1 : 0)} task{(pendingTasks.length + (currentTask ? 1 : 0)) > 1 ? 's' : ''} completed.
            </div>
            <div style={{ display: 'flex', gap: SPACING.md, justifyContent: 'center' }}>
              <Button label="End Session" variant="primary" onClick={onSessionEnd} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <FocusAmbience />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
                <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px' }}>
                  CURRENT
                </div>
                <ExamWeightBadge examWeight={currentTask.examWeight} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, lineHeight: 1.5, marginBottom: SPACING.xs }}>
                    {currentTask.name}
                  </div>
                  <TaskTypePill taskType={currentTask.taskType} />
                </div>
                {currentTask.estimatedMinutes && (
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginLeft: SPACING.md, flexShrink: 0 }}>
                    ⏱ {currentTask.estimatedMinutes} min
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: SPACING.sm }}>
                <Button
                  label="✓ Mark Done"
                  variant="primary"
                  style={{ flex: 1 }}
                  onClick={handleMarkDone}
                />
                {onAskAI && (
                  <button
                    onClick={() => onAskAI(currentTask.name)}
                    title="Ask AI about this task"
                    style={{
                      flexShrink: 0,
                      background: 'rgba(34,211,238,0.08)',
                      border: `1px solid rgba(34,211,238,0.25)`,
                      borderRadius: RADIUS.md,
                      color: '#22D3EE',
                      fontSize: TYPOGRAPHY.sizes.label,
                      fontWeight: TYPOGRAPHY.weights.semibold,
                      cursor: 'pointer',
                      padding: `${SPACING.md} ${SPACING.lg}`,
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'background 0.15s, border-color 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(34,211,238,0.14)';
                      e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(34,211,238,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(34,211,238,0.25)';
                    }}
                  >
                    ✦ Ask AI
                  </button>
                )}
              </div>
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
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, flex: 1 }}>
                    ☐ {t.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexShrink: 0 }}>
                    <ExamWeightBadge examWeight={t.examWeight} />
                    {t.estimatedMinutes && (
                      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, opacity: 0.6 }}>
                        {t.estimatedMinutes}m
                      </div>
                    )}
                  </div>
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
                <Button label="End Session" variant="primary" onClick={onSessionEnd} />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
