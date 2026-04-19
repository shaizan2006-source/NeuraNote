'use client';
import { useState } from 'react';
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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: dashed ? '1px dashed rgba(255,255,255,0.1)' : active || hovered ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
    background: dashed ? 'rgba(255,255,255,0.015)' : active ? 'rgba(139,92,246,0.1)' : hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.15s ease-out',
    transform: pressed ? 'scale(0.98)' : 'scale(1)',
    ...style,
  };

  return (
    <div
      onClick={onClick}
      style={base}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => { if (onClick) setPressed(true); }}
      onMouseUp={() => setPressed(false)}
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
