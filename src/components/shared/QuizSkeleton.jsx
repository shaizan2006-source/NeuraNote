'use client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import ContextualSidebar from '@/components/shared/ContextualSidebar';
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from '@/lib/skeletonStyles';

function SkLine({ width = '100%', height = '14px', delayMs = 0, mb = SPACING.sm }) {
  return (
    <div style={{
      ...shimmerStyle({ animationDelay: `${delayMs}ms` }),
      width,
      height,
      borderRadius: RADIUS.sm,
      marginBottom: mb,
      flexShrink: 0,
    }} />
  );
}

function SkCard({ delayMs = 0, children, style = {} }) {
  return (
    <div style={{
      border: `1px solid ${COLORS.border.lighter}`,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      background: COLORS.bg.card,
      ...pulseStyle(delayMs),
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function QuizSkeleton() {
  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>
      <div style={{
        display: 'flex',
        background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
        minHeight: '100vh',
        color: COLORS.text.primary,
        fontFamily: TYPOGRAPHY.fontFamily,
      }}>
        <ContextualSidebar />

        <div
          aria-hidden="true"
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}
        >
          {/* TopBar skeleton */}
          <div style={{
            padding: SPACING.lg,
            borderBottom: `1px solid ${COLORS.border.light}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            ...pulseStyle(100),
          }}>
            <SkLine width="200px" height="20px" mb="0" />
            <SkLine width="72px" height="16px" mb="0" />
          </div>

          {/* Progress section */}
          <div style={{ padding: `${SPACING.sm} ${SPACING.lg}`, ...pulseStyle(150) }}>
            <div style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: SPACING.sm,
            }}>
              <div style={{
                height: '100%',
                background: `linear-gradient(90deg, ${COLORS.accent.purple}, ${COLORS.accent.cyan})`,
                animation: 'skeletonProgressBuild 1.8s ease-in-out infinite',
              }} />
            </div>
            <SkLine width="100px" height="11px" mb="0" />
          </div>

          {/* Two-column grid — mirrors quiz/page.jsx line 114 */}
          <div
            className="sk-quiz-grid"
            style={{
              padding: `0 ${SPACING.lg} ${SPACING.lg}`,
              display: 'grid',
              gridTemplateColumns: '3fr 2fr',
              gap: SPACING.xl,
              maxWidth: '1100px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>

              {/* Question card */}
              <SkCard delayMs={200}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md }}>
                  <SkLine width="80px" height="11px" mb="0" />
                  <div style={{
                    width: '48px', height: '22px', flexShrink: 0,
                    background: 'rgba(139,92,246,0.1)',
                    border: `1px solid ${COLORS.border.accent}`,
                    borderRadius: RADIUS.sm,
                  }} />
                </div>
                <SkLine width="100%" height="16px" delayMs={50} />
                <SkLine width="100%" height="16px" delayMs={100} />
                <SkLine width="60%"  height="16px" delayMs={150} mb="0" />
              </SkCard>

              {/* Textarea */}
              <SkCard delayMs={250} style={{ minHeight: '180px' }}>
                <SkLine width="95%" height="13px" delayMs={0}   />
                <SkLine width="85%" height="13px" delayMs={50}  />
                <SkLine width="95%" height="13px" delayMs={100} />
                <SkLine width="85%" height="13px" delayMs={150} />
                <SkLine width="60%" height="13px" delayMs={200} mb="0" />
              </SkCard>

              {/* Button row */}
              <div style={{ display: 'flex', gap: SPACING.md, ...pulseStyle(300) }}>
                <div style={{ height: '38px', flex: 1, background: COLORS.bg.card, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.lighter}` }} />
                <div style={{ height: '38px', flex: 1, background: COLORS.bg.card, borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.lighter}` }} />
                <div style={{ height: '38px', flex: 2, background: 'rgba(139,92,246,0.08)', borderRadius: RADIUS.md, border: `1px solid ${COLORS.border.accent}` }} />
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
              {/* Source snippet */}
              <SkCard delayMs={200}>
                <SkLine width="130px" height="11px" />
                <SkLine width="100%" height="11px" delayMs={30} />
                <SkLine width="90%"  height="11px" delayMs={60} />
                <SkLine width="80%"  height="11px" delayMs={90} mb="0" />
              </SkCard>

              {/* Answer structure */}
              <SkCard delayMs={250}>
                <SkLine width="130px" height="11px" />
                <SkLine width="100%" height="11px" delayMs={30} />
                <SkLine width="85%"  height="11px" delayMs={60} />
                <SkLine width="70%"  height="11px" delayMs={90} mb="0" />
              </SkCard>

              {/* AI coach */}
              <SkCard delayMs={300}>
                <SkLine width="100px" height="11px" />
                <SkLine width="100%" height="11px" delayMs={30} />
                <SkLine width="75%"  height="11px" delayMs={60} mb="0" />
              </SkCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
