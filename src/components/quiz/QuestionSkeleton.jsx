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
        border: `1px solid color-mix(in srgb, var(--error) 30%, transparent)`,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        background: 'color-mix(in srgb, var(--error) 5%, transparent)',
        color: 'var(--error)',
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
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
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
        background: 'var(--bg-surface)',
        marginBottom: SPACING.lg,
        ...pulseStyle(120),
      }} />

      {/* Button row skeleton */}
      <div style={{ display: 'flex', gap: SPACING.md, ...pulseStyle(220) }}>
        <div style={{ height: '38px', flex: 1, background: COLORS.bg.card, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.lighter}` }} />
        <div style={{ height: '38px', flex: 2, background: 'color-mix(in srgb, var(--accent) 4%, transparent)', borderRadius: RADIUS.md, border: `1px solid color-mix(in srgb, var(--accent) 25%, transparent)` }} />
      </div>
    </>
  );
}
