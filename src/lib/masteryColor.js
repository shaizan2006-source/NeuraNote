// Mastery → Obsidian & Aurum color ramp (Stage 8d).
// RGB triplets mirror src/styles/variables.css tokens. We return concrete rgb()
// strings (not var(--token)) because these colors are used both as inline-style
// backgrounds AND as SVG fills in the reactflow MiniMap, where CSS variables in
// the `fill` attribute do not resolve. Gold = gold-standard mastery (master prompt §2.2).
export const MASTERY_TIERS = [
  { min: 0.8, label: "Mastered", rgb: [212, 175, 110] }, // --accent (gold)
  { min: 0.6, label: "Strong",   rgb: [52, 211, 153] },  // --success
  { min: 0.3, label: "Shaky",    rgb: [245, 181, 68] },  // --warning
  { min: 0,   label: "Unknown",  rgb: [107, 107, 112] }, // --text-tertiary
];

export function masteryTier(score = 0) {
  return MASTERY_TIERS.find((t) => score >= t.min) ?? MASTERY_TIERS[MASTERY_TIERS.length - 1];
}

export function masteryColor(score = 0) {
  const c = masteryTier(score).rgb;
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function masteryColorAlpha(score = 0, a = 1) {
  const c = masteryTier(score).rgb;
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

export function masteryLabel(score = 0) {
  return masteryTier(score).label;
}

// Dark text reads best on the light gold/green/amber tiers; light text on the gray "Unknown".
export function masteryTextColor(score = 0) {
  return score >= 0.3 ? "var(--bg-base)" : "var(--text-primary)";
}
