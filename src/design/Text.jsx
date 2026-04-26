import { type, color as colorTokens, fontFamily } from './tokens';

/**
 * Text — typography primitive.
 *
 * Props:
 *   variant   one of: display | title | prompt | body | bodyEmphasis |
 *             bodySmall | cta | meta | micro | eyebrow   (default 'body')
 *   color     color token key or raw CSS color
 *   align     text-align
 *   truncate  boolean — single-line ellipsis
 *   mono      boolean — use mono font family
 *   as        element name (default inferred from variant)
 *
 * Everything else passes through. `style` merges last.
 */
const defaultElement = {
  display: 'h1',
  title:   'h2',
  prompt:  'h3',
  body:    'p',
  bodyEmphasis: 'p',
  bodySmall: 'p',
  cta:     'span',
  meta:    'span',
  micro:   'span',
  eyebrow: 'span',
};

export function Text({
  variant = 'body',
  color,
  align,
  truncate,
  mono,
  as,
  style,
  children,
  ...rest
}) {
  const spec = type[variant] ?? type.body;
  const Component = as ?? defaultElement[variant] ?? 'span';
  const resolvedColor = color == null ? (spec.color ?? colorTokens.textPrimary)
    : (colorTokens[color] ?? color);

  return (
    <Component
      style={{
        fontFamily:     mono ? fontFamily.mono : fontFamily.ui,
        fontSize:       spec.fontSize,
        lineHeight:     spec.lineHeight,
        fontWeight:     spec.fontWeight,
        letterSpacing:  spec.letterSpacing,
        textTransform:  spec.textTransform,
        color:          resolvedColor,
        textAlign:      align,
        margin:         0,              // reset default browser margins on h1/p/etc.
        ...(truncate && {
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          maxWidth:     '100%',
        }),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
