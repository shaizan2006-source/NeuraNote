import { COLORS } from '@/lib/styles';

const SIZE_MAP = { sm: 40, md: 56, lg: 60, xl: 80 };

export default function Avatar({ size = 'lg', icon = '✦', style = {} }) {
  const sz = SIZE_MAP[size] ?? size;

  return (
    <div
      style={{
        width: `${sz}px`,
        height: `${sz}px`,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${COLORS.accent.purpleDark}, ${COLORS.accent.cyan})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(sz * 0.37)}px`,
        boxShadow: `0 0 0 8px rgba(109,40,217,0.1), 0 0 40px rgba(109,40,217,0.25)`,
        flexShrink: 0,
        ...style,
      }}
    >
      {icon}
    </div>
  );
}
