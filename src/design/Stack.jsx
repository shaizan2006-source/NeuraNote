import { space } from './tokens';

/**
 * Stack — flex container with token-aware gap.
 *
 * Props:
 *   direction  'column' | 'row'           (default 'column')
 *   gap        space key (0..12) or raw   (default 0)
 *   align      CSS align-items
 *   justify    CSS justify-content
 *   wrap       boolean → flex-wrap: wrap
 *   inline     boolean → display: inline-flex
 *   as         element name               (default 'div')
 *
 * Everything else passes through to the element. `style` prop merges last.
 */
export function Stack({
  direction = 'column',
  gap = 0,
  align,
  justify,
  wrap,
  inline,
  as: Component = 'div',
  style,
  children,
  ...rest
}) {
  const resolvedGap = typeof gap === 'number' && gap in space ? space[gap] : gap;

  return (
    <Component
      style={{
        display:        inline ? 'inline-flex' : 'flex',
        flexDirection:  direction,
        gap:            resolvedGap,
        alignItems:     align,
        justifyContent: justify,
        flexWrap:       wrap ? 'wrap' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
