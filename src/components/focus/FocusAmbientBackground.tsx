'use client';

import { useEffect, useRef } from 'react';
import { AMBIENT_CONFIG } from './ambient-background.config';
import './ambient-background.css';

export default function FocusAmbientBackground() {
  const farWrapRef = useRef<HTMLDivElement>(null);
  const midWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = document.querySelector(
      AMBIENT_CONFIG.SCROLL_SELECTOR
    ) as HTMLElement | null;

    if (!scrollEl) return;

    let targetY  = 0;
    let currentY = 0;
    let rafId    = 0;
    let running  = false;

    const tick = () => {
      currentY += (targetY - currentY) * AMBIENT_CONFIG.LERP;

      if (farWrapRef.current) {
        farWrapRef.current.style.transform =
          `translate3d(0, ${currentY * -AMBIENT_CONFIG.FAR_PARALLAX}px, 0)`;
      }
      if (midWrapRef.current) {
        midWrapRef.current.style.transform =
          `translate3d(0, ${currentY * -AMBIENT_CONFIG.MID_PARALLAX}px, 0)`;
      }

      if (Math.abs(targetY - currentY) > 0.1) {
        rafId = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const onScroll = () => {
      targetY = scrollEl.scrollTop;
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="amb-root"
      aria-hidden="true"
      style={{
        '--amb-far-duration': AMBIENT_CONFIG.FAR_BREATHE_DURATION,
        '--amb-mid-duration': AMBIENT_CONFIG.MID_BREATHE_DURATION,
        '--amb-mid-delay':    AMBIENT_CONFIG.MID_BREATHE_DELAY,
      } as React.CSSProperties}
    >
      <div className="amb-layer-base" />
      <div ref={farWrapRef} className="amb-layer-far-wrap">
        <div className="amb-layer-far-inner" />
      </div>
      <div ref={midWrapRef} className="amb-layer-mid-wrap">
        <div className="amb-layer-mid-inner" />
      </div>
      <div className="amb-layer-vignette" />
    </div>
  );
}
