'use client';

import { useEffect, useRef } from 'react';
import { COLORS } from '@/lib/styles';

export default function TimerRing({ timeLeft = 900, duration = 1500, paused = false, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 18;
    const progress = Math.max(0, Math.min(1, (duration - timeLeft) / duration));

    ctx.clearRect(0, 0, size, size);

    // Track ring (background)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139,92,246,0.12)';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Progress arc (purple → cyan gradient via color interpolation)
    if (progress > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.strokeStyle = COLORS.accent.purple;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Center time text
    const mins = Math.floor(timeLeft / 60);
    const secs = String(timeLeft % 60).padStart(2, '0');
    ctx.fillStyle = paused ? COLORS.text.secondary : COLORS.text.primary;
    ctx.font = `bold ${Math.round(size * 0.18)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${mins}:${secs}`, cx, cy);

    // Paused label
    if (paused) {
      ctx.fillStyle = COLORS.text.secondary;
      ctx.font = `${Math.round(size * 0.08)}px Inter, sans-serif`;
      ctx.fillText('PAUSED', cx, cy + size * 0.17);
    }
  }, [timeLeft, paused, size, duration]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}
