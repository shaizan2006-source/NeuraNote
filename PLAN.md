# PLAN.md — Obsidian & Aurum Redesign

> Source of truth: `REDESIGN_MASTER_PROMPT.md` (§9 staged plan).
> One stage = one approval = one revert unit. Founder sign-off required before each stage's long run.

**Current stage: ✅ Stage 0 complete — awaiting founder approval for Stage 1.**

---

## Stage checklist

- [x] **Stage 0 — Verification harness** ← DONE (this session)
- [ ] **Stage 1 — Design tokens + theme foundation** (sub-steps drafted below, NOT started)
- [ ] **Stage 2 — Brand identity (logo system)**
- [ ] **Stage 3 — Idle star-field on Sage**
- [ ] **Stage 4 — Rename ask-ai → Sage**
- [ ] **Stage 5 — Sage page redesign**
- [ ] **Stage 6 — Dashboard bento redesign**
- [ ] **Stage 7 — Auth pages (Grok-style + custom logo)**
- [ ] **Stage 8 — Per-feature page upgrades** (8a–8h, one route-cluster per approval)
- [ ] **Stage 9 — Wire-up audit + polish**

---

## Stage 0 — Verification harness (DONE)

- [x] Read master prompt + skim §1 key files
- [x] `PLAN.md` / `NOTES.md` / `CLAUDE.md` design section created
- [x] `/styleguide` route — renders all active tokens + core component previews on the app canvas
- [x] `scripts/grep-gate.mjs` — baseline-aware raw-hex gate (fails on NEW hex in components; green on current UI via `grep-gate.baseline.json`)
- [x] `scripts/capture-route-screens.mjs` — Playwright screenshots, desktop 1440×900 + mobile 390×844 → `__screens__/<stage>/`
- [x] `npm run build` clean + dev start clean
- [x] Baseline screenshots captured → `__screens__/stage-0-baseline/`

**Harness commands** (no package.json changes — run directly):

```
node scripts/grep-gate.mjs                  # fail on new raw hex vs baseline
node scripts/grep-gate.mjs --update-baseline # refresh baseline (end of approved stage only)
node scripts/grep-gate.mjs --strict          # full report, no baseline (Stage 9)
node scripts/capture-route-screens.mjs <stage-name>   # dev server must be running
```

---

## Stage 1 — Design tokens + theme foundation (DRAFTED — needs founder approval)

Goal: install Obsidian & Aurum tokens (§7) as the active default. Blast radius: token file only.

1. Rewrite `src/styles/variables.css`: add the §7.1 Obsidian & Aurum palette as the new default theme values. Keep `:root.theme-gradient/.theme-dark/.theme-light` class hooks alive (ThemeContext keeps working) but point the default (`theme-gradient`, the DEFAULT_THEME) at the new black/gold palette. Keep old var names (`--color-brand`, `--bg-surface-alt`, …) as aliases to new tokens so existing inline styles don't break mid-migration.
2. Add new token names (`--bg-base/-elevated/-surface/-surface-2/-inset`, `--border-hairline/-strong`, `--text-primary/-secondary/-tertiary/-disabled`, `--accent/-bright/-dim/-grad/-glow`, semantic, `--ai-signal`) + §7.2 type scale vars + §7.3 space/radius/shadow/motion vars.
3. Map tokens into Tailwind v4 (`@theme` in globals.css or config equivalent) so utilities agree with inline styles.
4. `layout.js` → `viewport.themeColor: "#08080A"`; `manifest.json` theme/background color → `#08080A`.
5. Update `/styleguide` token list to display the new token set; tune gold hue on `/styleguide`; lock final values in `NOTES.md`.
6. Verify: build clean, grep gate green, screenshots `__screens__/stage-1-tokens/`, every route still renders (transitional look OK). Founder sign-off on the gold.

---

## Later stages

Per master prompt §9 — sub-steps to be drafted at each stage start and approved before the long run.
