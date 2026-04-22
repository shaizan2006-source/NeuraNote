'use client';
import { COLORS, SPACING } from '@/lib/styles';

export default function ProgressBar({ current, total, label = '', style = {} }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div style={{ width: '100%', ...style }}>
      {label && (
        <div style={{ fontSize: '11px', color: COLORS.text.secondary, marginBottom: SPACING.sm, fontWeight: 600 }}>
          {label}
        </div>
      )}
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${COLORS.accent.purple}, ${COLORS.accent.cyan})`,
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
    </div>
  );
}
