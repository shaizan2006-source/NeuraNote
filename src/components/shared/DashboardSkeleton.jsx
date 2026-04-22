// src/components/shared/DashboardSkeleton.jsx
'use client';
import { SKELETON_KEYFRAMES, shimmerStyle, pulseStyle } from '@/lib/skeletonStyles';

function SkLine({ width = '100%', height = '14px', delayMs = 0, mb = '8px' }) {
  return (
    <div style={{
      ...shimmerStyle({ animationDelay: `${delayMs}ms` }),
      width,
      height,
      borderRadius: '8px',
      marginBottom: mb,
      flexShrink: 0,
    }} />
  );
}

function SkCard({ delayMs = 0, children, style = {} }) {
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '16px',
      background: 'rgba(255,255,255,0.025)',
      ...pulseStyle(delayMs),
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <>
      <style>{SKELETON_KEYFRAMES}</style>
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A2E 50%, #0F1119 100%)',
        }}
      >
        {/* Sidebar placeholder — matches DashboardSidebar expanded width (220px) */}
        <div style={{
          width: '220px',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.01)',
          ...pulseStyle(0),
        }} />

        {/* Main content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Greeting row */}
          <div style={{ marginBottom: '24px', ...pulseStyle(80) }}>
            <SkLine width="280px" height="28px" mb="10px" />
            <SkLine width="180px" height="14px" mb="0" />
          </div>

          {/* BentoGrid — mirrors BentoGrid.jsx: 1fr 1fr / 1fr 1fr, gap 6 */}
          <div
            className="sk-bento-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '6px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Hero card — gridColumn:1, gridRow:1/3 */}
            <SkCard
              delayMs={120}
              style={{
                gridColumn: 1,
                gridRow: '1 / 3',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Header row: icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                }} />
                <SkLine width="60%" height="18px" mb="0" delayMs={20} />
              </div>
              {/* Content lines */}
              <SkLine width="100%" height="12px" delayMs={40}  />
              <SkLine width="85%"  height="12px" delayMs={80}  />
              <SkLine width="70%"  height="12px" delayMs={120} mb="auto" />
              {/* Button placeholder at bottom */}
              <div style={{
                height: '36px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginTop: 'auto',
                ...pulseStyle(160),
              }} />
            </SkCard>

            {/* Bento card 1 */}
            <SkCard delayMs={150}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>

            {/* Bento card 2 */}
            <SkCard delayMs={200}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>

            {/* Bento card 3 */}
            <SkCard delayMs={250}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>

            {/* Bento card 4 */}
            <SkCard delayMs={300}>
              <SkLine width="110px" height="12px" />
              <SkLine width="75%"   height="24px" delayMs={30} mb="0" />
            </SkCard>
          </div>
        </div>
      </div>
    </>
  );
}
