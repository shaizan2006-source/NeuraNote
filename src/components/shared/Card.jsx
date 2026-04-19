'use client';
import { COLORS, SPACING, RADIUS } from '@/lib/styles';

export default function Card({
  icon,
  title,
  subtitle,
  active = false,
  dashed = false,
  onClick,
  children,
  style = {},
}) {
  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: dashed
      ? `1px dashed rgba(255,255,255,0.1)`
      : `1px solid ${COLORS.border.light}`,
    background: dashed ? 'rgba(255,255,255,0.015)' : COLORS.bg.card,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.15s ease-out',
    ...(active && !dashed ? {
      background: COLORS.bg.accentLight,
      borderColor: COLORS.border.accent,
    } : {}),
    ...style,
  };

  return (
    <div
      onClick={onClick}
      style={base}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = COLORS.border.accent;
          e.currentTarget.style.background = active ? COLORS.bg.accentHover : COLORS.bg.cardHover;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = active ? COLORS.border.accent : (dashed ? 'rgba(255,255,255,0.1)' : COLORS.border.light);
          e.currentTarget.style.background = active ? COLORS.bg.accentLight : (dashed ? 'rgba(255,255,255,0.015)' : COLORS.bg.card);
        }
      }}
      onMouseDown={(e) => { if (onClick) e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={(e) => { if (onClick) e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {icon && <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>}
      {children ?? (
        <div>
          {title && (
            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: active ? COLORS.text.accent : COLORS.text.primary }}>
              {title}
            </h4>
          )}
          {subtitle && (
            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: COLORS.text.secondary }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
