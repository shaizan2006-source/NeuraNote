/**
 * Ask My Notes logo system — Obsidian & Aurum (REDESIGN_MASTER_PROMPT.md §8).
 *
 * The mark reads simultaneously as a folded notebook page and an upward
 * spark/peak — "your notes that answer back". Monoline platinum strokes
 * (currentColor) with a single gold spark (var(--accent)).
 *
 * This file is an allowed raw-hex location for the grep gate, but the mark
 * itself is fully token-driven — keep it that way so it inherits theme.
 */

export const MARK = {
  viewBox: "0 0 32 32",
  page: "M8 26V8a2 2 0 0 1 2-2h9l5 5v9",
  fold: "M19 6v5h5",
  peak: "M12 26l4-7.5 4 7.5",
  spark: { cx: 16, cy: 13.75, r: 1.7 },
};

const NAMED_SIZES = { sm: 16, md: 28, lg: 96 };

export function LogoMark({ size = 28, strokeWidth = 1.6, sparkColor = "var(--accent)", style, ...props }) {
  const px = NAMED_SIZES[size] ?? size;
  return (
    <svg
      width={px}
      height={px}
      viewBox={MARK.viewBox}
      fill="none"
      aria-hidden="true"
      style={style}
      {...props}
    >
      <path d={MARK.page} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK.fold} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d={MARK.peak} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={MARK.spark.cx} cy={MARK.spark.cy} r={MARK.spark.r} fill={sparkColor} />
    </svg>
  );
}

export default function Logo({ size = "md", withWordmark = false, style }) {
  const px = NAMED_SIZES[size] ?? size;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.max(6, Math.round(px * 0.3)),
        color: "var(--text-primary)",
        ...style,
      }}
    >
      <LogoMark size={px} strokeWidth={px <= 20 ? 2 : 1.6} />
      {withWordmark && (
        <span
          style={{
            fontSize: Math.max(13, Math.round(px * 0.55)),
            fontWeight: 600,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            color: "var(--text-primary)",
          }}
        >
          Ask My Notes
        </span>
      )}
    </span>
  );
}
