'use client';
import { useRouter } from 'next/navigation';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/styles';

export default function TopBar({ title = '', subtitle = '', showLiveStatus = true, onBack, style = {} }) {
  const router = useRouter();

  return (
    <div
      style={{
        padding: `${SPACING.md} ${SPACING.lg}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${COLORS.border.light}`,
        background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
        ...style,
      }}
    >
      <div
        onClick={() => (onBack ? onBack() : router.back())}
        style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.disabled, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        ← Back
      </div>

      <div style={{ textAlign: 'center', flex: 1, padding: `0 ${SPACING.lg}` }}>
        {title && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.label, color: COLORS.text.primary, fontWeight: TYPOGRAPHY.weights.bold }}>
            {title}
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginTop: '2px' }}>
            {subtitle}
          </div>
        )}
      </div>

      {showLiveStatus ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, whiteSpace: 'nowrap' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS.accent.green, boxShadow: `0 0 8px ${COLORS.accent.green}` }} />
          <span style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.disabled, fontWeight: TYPOGRAPHY.weights.semibold }}>
            Aria · ready
          </span>
        </div>
      ) : <div style={{ width: '80px' }} />}
    </div>
  );
}
