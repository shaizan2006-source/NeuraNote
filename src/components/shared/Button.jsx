'use client';
import { useState } from 'react';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/styles';

export default function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style = {},
}) {
  const [pressed, setPressed] = useState(false);

  const base = {
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.bold,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease-out',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    color: '#fff',
  };

  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${COLORS.accent.purple}, ${COLORS.accent.purpleDark})`,
      boxShadow: SHADOWS.button,
    },
    secondary: {
      background: 'transparent',
      color: COLORS.text.accent,
      border: `1px solid ${COLORS.border.accent}`,
    },
    ghost: {
      background: 'transparent',
      color: COLORS.text.primary,
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], transform: pressed ? 'scale(0.98)' : 'scale(1)', ...style }}
      onMouseDown={() => { if (!disabled) setPressed(true); }}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      {label}
    </button>
  );
}
