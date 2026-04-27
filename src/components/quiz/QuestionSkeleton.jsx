'use client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from '@/lib/skeletonStyles';

function SkLine({ width = '100%', height = '14px', delayMs = 0 }) {
  return (
    <div style={{
      ...shimmerStyle({ animationDelay: `${delayMs}ms` }),
      width,
      height,
      borderRadius: RADIUS.sm,
      marginBottom: SPACING.sm,
      flexShrink: 0,
    }} />
  );
}

// Inline skeleton for a single question slot — shown while that question is still loading.
// Different from QuizSkeleton (full-page auth/init skeleton).
export default function QuestionSkeleton({ streamStatus = 'fetching', isError = false, errorMessage = null }) {
  if (isError) {
    return (
      <div style={{
        border: `1px solid rgba(248,113,113,0.3)`,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        background: 'rgba(248,113,113,0.05)',
        color: '#f87171',
        fontSize: TYPOGRAPHY.sizes.body,
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, marginBottom: SPACING.sm }}>Could not load this question.</div>
        {errorMessage && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.caption, opacity: 0.8 }}>{errorMessage}</div>
        )}
        <div style={{ fontSize: TYPOGRAPHY.sizes.caption, marginTop: SPACING.md, color: COLORS.text.secondary }}>
          Questions that loaded successfully are still usable.
        </div>
      </div>
    );
  }

  const label = streamStatus === 'fetching'
    ? 'Your quiz is being prepared…'
    : 'More questions coming…';

  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>

      {/* Question card skeleton */}
      <div style={{
        border: `1px solid ${COLORS.border.lighter}`,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        background: COLORS.bg.card,
        marginBottom: SPACING.lg,
        ...pulseStyle(0),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
          <SkLine width="80px" height="11px" />
          <div style={{
            width: '48px', height: '22px', flexShrink: 0,
            background: 'rgba(139,92,246,0.1)',
            border: `1px solid ${COLORS.border.accent}`,
            borderRadius: RADIUS.sm,
          }} />
        </div>
        <SkLine width="100%" height="16px" delayMs={50} />
        <SkLine width="100%" height="16px" delayMs={100} />
        <SkLine width="60%" height="16px" delayMs={150} />
        <div style={{ marginTop: SPACING.md, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, opacity: 0.6 }}>
          {label}
        </div>
      </div>

      {/* Answer textarea skeleton */}
      <div style={{
        width: '100%',
        minHeight: '180px',
        border: `1px solid ${COLORS.border.lighter}`,
        borderRadius: RADIUS.md,
        background: 'rgba(255,255,255,0.01)',
        marginBottom: SPACING.lg,
        ...pulseStyle(120),
      }} />

      {/* Button row skeleton */}
      <div style={{ display: 'flex', gap: SPACING.md, ...pulseStyle(220) }}>
        <div style={{ height: '38px', flex: 1, background: COLORS.bg.card, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.lighter}` }} />
        <div style={{ height: '38px', flex: 2, background: 'rgba(139,92,246,0.04)', borderRadius: RADIUS.md, border: `1px solid rgba(139,92,246,0.1)` }} />
      </div>
    </>
  );
}
