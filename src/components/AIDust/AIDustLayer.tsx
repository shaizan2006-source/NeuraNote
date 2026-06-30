// src/components/AIDust/AIDustLayer.tsx
//
// "Constellation Notes" — the Sage idle effect (Stage 3).
// Platinum stars drift on the obsidian canvas; every few seconds nearby stars
// link into a brief gold constellation ("your notes connecting"); a rare gold
// comet streaks across and seeds a new cluster.
//
// Infrastructure (idle detection, mobile/reduced-motion/low-end guards, route
// scoping, canvas lifecycle) is inherited from the original AI-dust layer —
// only the paint changed. Component/file names kept for import stability.

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIdleDetection } from './useIdleDetection';
import { AI_DUST_CONFIG as C } from './ai-dust.config';
import './ai-dust.css';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface Constellation {
  starIdx: number[];
  born: number;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  seeded: boolean;
}

interface AIDustLayerProps {
  disabled?: boolean;
}

type RGB = readonly [number, number, number];

function parseColorToRgb(value: string, fallback: RGB): RGB {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return fallback;
}

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function AIDustLayer({ disabled = false }: AIDustLayerProps) {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEnd = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
    setIsEnabled(!isMobile && !prefersReduced && !isLowEnd);
  }, []);

  const isRouteEnabled = C.ENABLED_ROUTES.some((route) => pathname.startsWith(route));
  const shouldRun = isEnabled && !disabled && isRouteEnabled;
  // Some routes (e.g. the dashboard) show the constellation continuously rather
  // than only after the idle timeout.
  const alwaysOn = C.ALWAYS_ON_ROUTES.some((route) => pathname.startsWith(route));

  const isIdle = useIdleDetection({
    timeout: C.IDLE_TIMEOUT,
    enabled: shouldRun && !alwaysOn,
  });

  const active = shouldRun && (alwaysOn || isIdle);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!active) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Obsidian & Aurum tokens, read live so the effect inherits theme
    const css = getComputedStyle(document.documentElement);
    const gold = parseColorToRgb(css.getPropertyValue('--accent'), C.GOLD_FALLBACK_RGB);
    const platinum = parseColorToRgb(css.getPropertyValue('--text-primary'), C.PLATINUM_FALLBACK_RGB);

    let scopeEl: Element | null = null;
    for (const sel of C.SCOPE_SELECTORS) {
      scopeEl = document.querySelector(sel);
      if (scopeEl) break;
    }
    if (!scopeEl) scopeEl = document.body;

    const rect = scopeEl.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top = `${rect.top}px`;
    const W = canvas.width;
    const H = canvas.height;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const stars: Star[] = Array.from({ length: C.STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: rand(-C.STAR_DRIFT, C.STAR_DRIFT),
      vy: rand(-C.STAR_DRIFT, C.STAR_DRIFT),
      r: rand(C.STAR_RADIUS.min, C.STAR_RADIUS.max),
      baseAlpha: rand(C.STAR_ALPHA.min, C.STAR_ALPHA.max),
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: rand(C.TWINKLE_SPEED.min, C.TWINKLE_SPEED.max),
    }));

    let constellations: Constellation[] = [];
    let comet: Comet | null = null;
    let nextConstellationAt = performance.now() + C.CONSTELLATION_EVERY;
    let nextCometAt = performance.now() + C.COMET_EVERY;

    const CONST_TOTAL = C.CONSTELLATION_FADE_IN + C.CONSTELLATION_HOLD + C.CONSTELLATION_FADE_OUT;

    // Build a constellation from the stars nearest to (px, py)
    const formConstellation = (px: number, py: number, now: number) => {
      if (constellations.length >= C.MAX_CONSTELLATIONS) return;
      const count = Math.round(rand(C.LINK_STARS.min, C.LINK_STARS.max));
      const linked = new Set(constellations.flatMap((c) => c.starIdx));
      const byDist = stars
        .map((s, i) => ({ i, d: Math.hypot(s.x - px, s.y - py) }))
        .filter(({ i, d }) => !linked.has(i) && d < C.LINK_RADIUS * 2)
        .sort((a, b) => a.d - b.d)
        .slice(0, count)
        .map(({ i }) => i);
      if (byDist.length < 2) return;
      constellations.push({ starIdx: byDist, born: now });
    };

    const constellationAlpha = (age: number) => {
      if (age < C.CONSTELLATION_FADE_IN) return age / C.CONSTELLATION_FADE_IN;
      if (age < C.CONSTELLATION_FADE_IN + C.CONSTELLATION_HOLD) return 1;
      const fadeAge = age - C.CONSTELLATION_FADE_IN - C.CONSTELLATION_HOLD;
      return Math.max(0, 1 - fadeAge / C.CONSTELLATION_FADE_OUT);
    };

    const spawnComet = () => {
      // Enter from the top or left edge, travel diagonally across
      const fromTop = Math.random() < 0.5;
      const angle = fromTop
        ? rand(Math.PI * 0.2, Math.PI * 0.35) // down-right-ish
        : rand(-Math.PI * 0.12, Math.PI * 0.12); // rightwards
      comet = {
        x: fromTop ? rand(W * 0.1, W * 0.7) : -10,
        y: fromTop ? -10 : rand(H * 0.1, H * 0.5),
        vx: Math.cos(angle) * C.COMET_SPEED,
        vy: Math.sin(angle) * C.COMET_SPEED,
        seeded: false,
      };
    };

    let last = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - last, 50); // clamp tab-switch jumps
      last = now;
      ctx.clearRect(0, 0, W, H);

      // ── Stars: drift + twinkle ──
      const goldenIdx = new Set(constellations.flatMap((c) => c.starIdx));
      stars.forEach((s, i) => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < -5) s.x = W + 5; else if (s.x > W + 5) s.x = -5;
        if (s.y < -5) s.y = H + 5; else if (s.y > H + 5) s.y = -5;

        const twinkle = 0.75 + 0.25 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
        const alpha = s.baseAlpha * twinkle;

        ctx.beginPath();
        if (goldenIdx.has(i)) {
          ctx.fillStyle = rgba(gold, Math.min(1, alpha + 0.3));
          ctx.shadowColor = rgba(gold, 0.5);
          ctx.shadowBlur = 5;
        } else {
          ctx.fillStyle = rgba(platinum, alpha);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // ── Constellations: gold hairline paths between linked stars ──
      constellations = constellations.filter((c) => now - c.born < CONST_TOTAL);
      for (const c of constellations) {
        const a = constellationAlpha(now - c.born) * C.LINE_ALPHA;
        ctx.strokeStyle = rgba(gold, a);
        ctx.lineWidth = C.LINE_WIDTH;
        ctx.beginPath();
        c.starIdx.forEach((idx, k) => {
          const s = stars[idx];
          if (k === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        });
        ctx.stroke();
      }
      if (now >= nextConstellationAt) {
        formConstellation(rand(W * 0.15, W * 0.85), rand(H * 0.15, H * 0.85), now);
        nextConstellationAt = now + C.CONSTELLATION_EVERY + rand(0, C.CONSTELLATION_JITTER);
      }

      // ── Comet: gold streak with fading trail; seeds a constellation ──
      if (comet) {
        comet.x += comet.vx * dt;
        comet.y += comet.vy * dt;

        const speed = Math.hypot(comet.vx, comet.vy);
        const tx = comet.x - (comet.vx / speed) * C.COMET_TRAIL;
        const ty = comet.y - (comet.vy / speed) * C.COMET_TRAIL;
        const grad = ctx.createLinearGradient(comet.x, comet.y, tx, ty);
        grad.addColorStop(0, rgba(gold, 0.85));
        grad.addColorStop(1, rgba(gold, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(comet.x, comet.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = rgba(gold, 0.95);
        ctx.shadowColor = rgba(gold, 0.7);
        ctx.shadowBlur = C.COMET_GLOW_BLUR;
        ctx.arc(comet.x, comet.y, C.COMET_HEAD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (!comet.seeded && (comet.x > W * 0.55 || comet.y > H * 0.55)) {
          comet.seeded = true;
          formConstellation(comet.x, comet.y, now);
        }
        if (comet.x > W + C.COMET_TRAIL || comet.y > H + C.COMET_TRAIL) comet = null;
      } else if (now >= nextCometAt) {
        spawnComet();
        nextCometAt = now + C.COMET_EVERY + rand(0, C.COMET_JITTER);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`ai-dust-canvas${active ? ' visible' : ''}`}
      aria-hidden="true"
    />
  );
}
