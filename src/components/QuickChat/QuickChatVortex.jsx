"use client";

import { useState, useEffect, useRef } from "react";

export default function QuickChatVortex() {
  const [showText, setShowText]   = useState(false);
  const [step,     setStep]       = useState(0);
  const [textKey,  setTextKey]    = useState(0);

  const messages = ["Thinking…", "Processing…"];

  const showTextTimerRef = useRef(null);
  const intervalRef      = useRef(null);

  useEffect(() => {
    setStep(0);
    setTextKey(k => k + 1);
    setShowText(false);

    clearTimeout(showTextTimerRef.current);
    clearInterval(intervalRef.current);

    showTextTimerRef.current = setTimeout(() => setShowText(true), 3000);

    intervalRef.current = setInterval(() => {
      setStep(prev => (prev + 1) % messages.length);
      setTextKey(k => k + 1);
    }, 1300);

    return () => {
      clearTimeout(showTextTimerRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 0 }}>

      {/* ── Vortex SVG (14×14px) ── */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 56 56"
        width={14}
        height={14}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Background dots — 5×5 grid, dim */}
        <circle r="2.4" cx="6"  cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="6"  fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="17" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="28" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="39" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="6"  cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="17" cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="28" cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="39" cy="50" fill="#fff" opacity="0.07"/>
        <circle r="2.4" cx="50" cy="50" fill="#fff" opacity="0.07"/>

        {/* Lit dots — animated vortex sweep */}
        <circle className="qcv-vl qcv-d00" r="3.1" cx="6"  cy="6" />
        <circle className="qcv-vl qcv-d01" r="3.1" cx="17" cy="6" />
        <circle className="qcv-vl qcv-d02" r="3.1" cx="28" cy="6" />
        <circle className="qcv-vl qcv-d03" r="3.1" cx="39" cy="6" />
        <circle className="qcv-vl qcv-d04" r="3.1" cx="50" cy="6" />
        <circle className="qcv-vl qcv-d10" r="3.1" cx="6"  cy="17"/>
        <circle className="qcv-vl qcv-d11" r="3.1" cx="17" cy="17"/>
        <circle className="qcv-vl qcv-d12" r="3.1" cx="28" cy="17"/>
        <circle className="qcv-vl qcv-d13" r="3.1" cx="39" cy="17"/>
        <circle className="qcv-vl qcv-d14" r="3.1" cx="50" cy="17"/>
        <circle className="qcv-vl qcv-d20" r="3.1" cx="6"  cy="28"/>
        <circle className="qcv-vl qcv-d21" r="3.1" cx="17" cy="28"/>
        <circle className="qcv-vl qcv-d22" r="3.1" cx="28" cy="28"/>
        <circle className="qcv-vl qcv-d23" r="3.1" cx="39" cy="28"/>
        <circle className="qcv-vl qcv-d24" r="3.1" cx="50" cy="28"/>
        <circle className="qcv-vl qcv-d30" r="3.1" cx="6"  cy="39"/>
        <circle className="qcv-vl qcv-d31" r="3.1" cx="17" cy="39"/>
        <circle className="qcv-vl qcv-d32" r="3.1" cx="28" cy="39"/>
        <circle className="qcv-vl qcv-d33" r="3.1" cx="39" cy="39"/>
        <circle className="qcv-vl qcv-d34" r="3.1" cx="50" cy="39"/>
        <circle className="qcv-vl qcv-d40" r="3.1" cx="6"  cy="50"/>
        <circle className="qcv-vl qcv-d41" r="3.1" cx="17" cy="50"/>
        <circle className="qcv-vl qcv-d42" r="3.1" cx="28" cy="50"/>
        <circle className="qcv-vl qcv-d43" r="3.1" cx="39" cy="50"/>
        <circle className="qcv-vl qcv-d44" r="3.1" cx="50" cy="50"/>
      </svg>

      {/* ── Shimmer text — fades in after 3s ── */}
      <span
        key={textKey}
        style={{
          fontSize:               11,
          fontWeight:             600,
          opacity:                showText ? 1 : 0,
          transition:             "opacity 0.35s ease",
          background:             "linear-gradient(90deg,#4a4a5a 0%,#4a4a5a 20%,#c4b5fd 40%,#f0f0f5 55%,#c4b5fd 70%,#4a4a5a 80%,#4a4a5a 100%)",
          backgroundSize:         "200% 100%",
          WebkitBackgroundClip:   "text",
          WebkitTextFillColor:    "transparent",
          backgroundClip:         "text",
          animation:              showText
            ? "qcvShimmer 2s linear infinite, qcvFadeSlide 0.35s ease"
            : "none",
          whiteSpace:             "nowrap",
        }}
      >
        {messages[step]}
      </span>

      <style>{`
        /* Vortex dot animation */
        .qcv-vl {
          fill: #ffffff;
          opacity: 0;
          animation: qcvVortex 2400ms linear infinite both;
        }

        /* Animation delay classes */
        .qcv-d00, .qcv-d11, .qcv-d22 { animation-delay:    0ms; }
        .qcv-d01                      { animation-delay:  150ms; }
        .qcv-d02, .qcv-d21            { animation-delay:  300ms; }
        .qcv-d03                      { animation-delay:  450ms; }
        .qcv-d04, .qcv-d31            { animation-delay:  600ms; }
        .qcv-d14                      { animation-delay:  750ms; }
        .qcv-d24, .qcv-d32            { animation-delay:  900ms; }
        .qcv-d34                      { animation-delay: 1050ms; }
        .qcv-d33, .qcv-d44            { animation-delay: 1200ms; }
        .qcv-d43                      { animation-delay: 1350ms; }
        .qcv-d23, .qcv-d42            { animation-delay: 1500ms; }
        .qcv-d41                      { animation-delay: 1650ms; }
        .qcv-d13, .qcv-d40            { animation-delay: 1800ms; }
        .qcv-d30                      { animation-delay: 1950ms; }
        .qcv-d12, .qcv-d20            { animation-delay: 2100ms; }
        .qcv-d10                      { animation-delay: 2250ms; }

        @keyframes qcvVortex {
          0%   { opacity: 0;    }
          4%   { opacity: 1;    }
          26%  { opacity: 0.08; }
          100% { opacity: 0;    }
        }
        @keyframes qcvShimmer {
          0%   { background-position: 200% center;  }
          100% { background-position: -200% center; }
        }
        @keyframes qcvFadeSlide {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
