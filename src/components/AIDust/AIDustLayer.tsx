// src/components/AIDust/AIDustLayer.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIdleDetection } from './useIdleDetection';
import { AI_DUST_CONFIG } from './ai-dust.config';
import { useTheme } from '@/hooks/useTheme';
import './ai-dust.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  isGlow: boolean;
  age: number;
}

interface AIDustLayerProps {
  disabled?: boolean;
}

export default function AIDustLayer({ disabled = false }: AIDustLayerProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  const glowColor = theme === 'dark' ? AI_DUST_CONFIG.TEAL_COLOR : AI_DUST_CONFIG.CYAN_COLOR;
  const glowShadow = theme === 'dark' ? AI_DUST_CONFIG.TEAL_GLOW : AI_DUST_CONFIG.CYAN_GLOW;

  useEffect(() => {
    const isMobile = /iPhone|iPad|Android|Mobile/.test(navigator.userAgent);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowEnd = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 2;
    setIsEnabled(!isMobile && !prefersReduced && !isLowEnd);
  }, []);

  const isRouteDisabled = AI_DUST_CONFIG.DISABLED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const shouldRun = isEnabled && !disabled && !isRouteDisabled;

  const isIdle = useIdleDetection({
    timeout: AI_DUST_CONFIG.IDLE_TIMEOUT,
    enabled: shouldRun,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!isIdle || !shouldRun) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      particlesRef.current = [];
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scopeEl: Element | null = null;
    for (const sel of AI_DUST_CONFIG.SCOPE_SELECTORS) {
      scopeEl = document.querySelector(sel);
      if (scopeEl) break;
    }
    if (!scopeEl) scopeEl = document.body;

    const rect = scopeEl.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
    canvas.style.left = `${rect.left}px`;
    canvas.style.top  = `${rect.top}px`;

    let lastCreation = 0;

    const spawnParticle = () => {
      if (particlesRef.current.length >= AI_DUST_CONFIG.MAX_PARTICLES) return;
      particlesRef.current.push({
        x:       Math.random() * canvas.width,
        y:       -10,
        vx:      (Math.random() - 0.5) * AI_DUST_CONFIG.DRIFT_VELOCITY_X,
        vy:      AI_DUST_CONFIG.DRIFT_VELOCITY_Y.min +
                 Math.random() * (AI_DUST_CONFIG.DRIFT_VELOCITY_Y.max - AI_DUST_CONFIG.DRIFT_VELOCITY_Y.min),
        opacity: AI_DUST_CONFIG.MIN_OPACITY +
                 Math.random() * (AI_DUST_CONFIG.MAX_OPACITY - AI_DUST_CONFIG.MIN_OPACITY),
        isGlow:  Math.random() < AI_DUST_CONFIG.GLOW_PARTICLE_RATIO,
        age:     0,
      });
    };

    const animate = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (now - lastCreation > AI_DUST_CONFIG.CREATION_RATE) {
        spawnParticle();
        lastCreation = now;
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.age++;
        p.x += p.vx;
        p.y += p.vy;

        const fade = 1 - p.age / AI_DUST_CONFIG.PARTICLE_LIFETIME;
        const alpha = p.opacity * fade;

        ctx.beginPath();
        if (p.isGlow) {
          ctx.fillStyle   = glowColor;
          ctx.shadowColor = glowShadow;
          ctx.shadowBlur  = AI_DUST_CONFIG.GLOW_SHADOW_BLUR;
        } else {
          ctx.fillStyle   = `rgba(255,255,255,${alpha})`;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur  = 0;
        }
        ctx.arc(p.x, p.y, AI_DUST_CONFIG.PARTICLE_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        return p.age < AI_DUST_CONFIG.PARTICLE_LIFETIME;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      particlesRef.current = [];
    };
  }, [isIdle, shouldRun, glowColor, glowShadow]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`ai-dust-canvas${isIdle && shouldRun ? ' visible' : ''}`}
      aria-hidden="true"
    />
  );
}
