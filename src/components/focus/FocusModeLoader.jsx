'use client';
import { COLORS, TYPOGRAPHY } from '@/lib/styles';

const KEYFRAMES = `
  @keyframes fmlSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes fmlPulseRing {
    0%, 100% { transform: scale(1);   opacity: 0.6; }
    50%       { transform: scale(1.08); opacity: 1;   }
  }
  @keyframes fmlShimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes fmlDot {
    0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
    40%           { opacity: 1;   transform: translateY(-3px); }
  }
  @keyframes fmlFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(139,92,246,0.12) 50%, rgba(255,255,255,0.03) 100%)',
  backgroundSize: '400px 100%',
  animation: 'fmlShimmer 1.6s ease-in-out infinite',
};

function TaskSkeleton({ delay = 0, wide = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: 'rgba(255,255,255,0.025)',
      borderRadius: 12,
      border: '1px solid rgba(139,92,246,0.08)',
      animation: `fmlFadeUp 0.4s ease ${delay}ms both`,
    }}>
      {/* Checkbox placeholder */}
      <div style={{
        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
        border: '2px solid rgba(139,92,246,0.25)',
        background: 'rgba(139,92,246,0.05)',
      }} />
      {/* Text lines */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          ...shimmerStyle,
          height: 10, borderRadius: 5,
          width: wide ? '85%' : '60%',
          animation: `fmlShimmer 1.6s ease-in-out ${delay}ms infinite`,
        }} />
        <div style={{
          ...shimmerStyle,
          height: 8, borderRadius: 5,
          width: wide ? '55%' : '40%',
          opacity: 0.6,
          animation: `fmlShimmer 1.6s ease-in-out ${delay + 200}ms infinite`,
        }} />
      </div>
    </div>
  );
}

export default function FocusModeLoader({ documentName }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      boxSizing: 'border-box',
      fontFamily: TYPOGRAPHY.fontFamily,
      overflowY: 'auto',
    }}>
      <style>{KEYFRAMES}</style>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        animation: 'fmlFadeUp 0.5s ease both',
      }}>

        {/* Spinner + glow */}
        <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
          {/* Outer pulsing glow ring */}
          <div style={{
            position: 'absolute', inset: -10,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
            animation: 'fmlPulseRing 2s ease-in-out infinite',
          }} />
          {/* Background circle */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.18)',
          }} />
          {/* Spinning arc */}
          <div style={{
            position: 'absolute', inset: 6,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#8B5CF6',
            borderRightColor: 'rgba(139,92,246,0.35)',
            animation: 'fmlSpin 1s linear infinite',
          }} />
          {/* Icon center */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            ⚡
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{
              fontSize: 20, fontWeight: 700,
              color: COLORS.text.primary,
              letterSpacing: '-0.3px',
            }}>
              Generating your focus tasks
            </span>
            <span style={{ display: 'inline-flex', gap: 3, paddingTop: 2 }}>
              {[0, 160, 320].map(delay => (
                <span key={delay} style={{
                  display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
                  background: '#8B5CF6',
                  animation: `fmlDot 1.2s ease-in-out ${delay}ms infinite`,
                }} />
              ))}
            </span>
          </div>

          {documentName && (
            <p style={{
              margin: 0, fontSize: 13, color: '#52525b',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              Reading:&nbsp;
              <span style={{
                color: '#a78bfa', fontWeight: 500,
                maxWidth: 240,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'inline-block',
              }}>
                {documentName}
              </span>
            </p>
          )}
        </div>

        {/* Task skeleton cards */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{
            margin: '0 0 4px', fontSize: 11, fontWeight: 600,
            color: '#3f3f46', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Preparing tasks
          </p>
          <TaskSkeleton delay={0}   wide={true}  />
          <TaskSkeleton delay={80}  wide={false} />
          <TaskSkeleton delay={160} wide={true}  />
          <TaskSkeleton delay={240} wide={false} />
        </div>

        {/* Footer hint */}
        <p style={{
          margin: 0, fontSize: 11, color: '#27272a', textAlign: 'center',
        }}>
          This takes a few seconds — your session starts automatically
        </p>
      </div>
    </div>
  );
}
