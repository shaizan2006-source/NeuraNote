'use client';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

const KEYFRAMES = `
  @keyframes fmlShimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes fmlPulse {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1;   }
  }
  @keyframes fmlDot {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40%           { opacity: 1;   transform: scale(1);   }
  }
`;

const shimmer = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
  backgroundSize: '600px 100%',
  animation: 'fmlShimmer 1.8s linear infinite',
  borderRadius: RADIUS.sm,
};

export default function FocusModeLoader({ documentName }) {
  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    padding: SPACING.xxl,
  };

  return (
    <div style={pageStyle} aria-hidden="true">
      <style>{KEYFRAMES}</style>

      {/* Spinner ring placeholder */}
      <div style={{
        width: 220,
        height: 220,
        borderRadius: '50%',
        border: `6px solid ${COLORS.border.lighter}`,
        borderTopColor: 'rgba(139,92,246,0.4)',
        animation: 'fmlPulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }} />

      {/* Text block */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: SPACING.md, alignItems: 'center' }}>
        <div style={{ fontSize: TYPOGRAPHY.sizes.heading, color: COLORS.text.primary, fontWeight: 600 }}>
          Generating your focus tasks
          <span style={{ display: 'inline-flex', gap: '4px', marginLeft: '4px' }}>
            {[0, 200, 400].map((delay) => (
              <span key={delay} style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: COLORS.text.accent,
                animation: `fmlDot 1.4s ease-in-out ${delay}ms infinite`,
              }} />
            ))}
          </span>
        </div>

        {documentName && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Reading: <span style={{ color: COLORS.text.accent }}>{documentName}</span>
          </div>
        )}

        {/* Shimmer task placeholders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, width: '100%', maxWidth: 360, marginTop: SPACING.lg }}>
          {[100, 80, 90, 70, 85, 75].map((w, i) => (
            <div key={i} style={{
              ...shimmer,
              height: 36,
              width: `${w}%`,
              animation: `fmlShimmer 1.8s linear ${i * 150}ms infinite`,
              borderRadius: RADIUS.sm,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
