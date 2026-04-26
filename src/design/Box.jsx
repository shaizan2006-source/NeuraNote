import { space, color, radius, shadow as shadowScale } from './tokens';

/**
 * Box — layout primitive with token-aware spacing, background, border, radius.
 *
 * Spacing props (numbers use space scale; strings pass through):
 *   p, px, py, pt, pr, pb, pl
 *   m, mx, my, mt, mr, mb, ml
 *
 * Surface props (strings use token keys first, fall back to raw):
 *   bg          e.g. 'surface1' | 'transparent' | '#000'
 *   border      border-color token key or raw CSS color; adds 1px solid
 *   borderTop / borderBottom / borderLeft / borderRight — same
 *   radius      radius key ('sm'|'md'|'lg'|'xl'|'2xl'|'pill') or raw number
 *   shadow      shadow key or raw
 *
 * Layout props:
 *   width, height, minWidth, maxWidth, minHeight, maxHeight, flex, overflow
 *   position, top, right, bottom, left
 *
 * Everything else passes through. `style` prop merges last (wins).
 */
export function Box({
  p, px, py, pt, pr, pb, pl,
  m, mx, my, mt, mr, mb, ml,
  bg,
  border,
  borderTop,
  borderBottom,
  borderLeft,
  borderRight,
  radius: radiusKey,
  shadow: shadowKey,
  width, height, minWidth, maxWidth, minHeight, maxHeight,
  flex, overflow,
  position, top, right, bottom, left,
  as: Component = 'div',
  style,
  children,
  ...rest
}) {
  const sp = (v) => (typeof v === 'number' && v in space ? space[v] : v);
  const col = (v) => (v == null ? undefined : (color[v] ?? v));
  const rad = (v) => (v == null ? undefined
    : typeof v === 'number' ? v
    : (radius[v] ?? v));
  const shd = (v) => (v == null ? undefined : (shadowScale[v] ?? v));
  const borderStyle = (v) => (v ? `1px solid ${col(v)}` : undefined);

  return (
    <Component
      style={{
        padding:       sp(p),
        paddingInline: sp(px),
        paddingBlock:  sp(py),
        paddingTop:    sp(pt),
        paddingRight:  sp(pr),
        paddingBottom: sp(pb),
        paddingLeft:   sp(pl),

        margin:       sp(m),
        marginInline: sp(mx),
        marginBlock:  sp(my),
        marginTop:    sp(mt),
        marginRight:  sp(mr),
        marginBottom: sp(mb),
        marginLeft:   sp(ml),

        background:   col(bg),
        border:       borderStyle(border),
        borderTop:    borderStyle(borderTop),
        borderBottom: borderStyle(borderBottom),
        borderLeft:   borderStyle(borderLeft),
        borderRight:  borderStyle(borderRight),
        borderRadius: rad(radiusKey),
        boxShadow:    shd(shadowKey),

        width, height, minWidth, maxWidth, minHeight, maxHeight,
        flex, overflow,
        position, top, right, bottom, left,

        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
