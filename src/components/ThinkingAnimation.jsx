"use client";

import { useState, useEffect, useRef } from "react";

const DOMAIN_STEPS = {
  cs:         ["Parsing algorithm…",        "Checking complexity…",   "Structuring answer…"],
  law:        ["Finding relevant sections…", "Checking case law…",     "Structuring answer…"],
  finance:    ["Preparing ledger format…",   "Calculating figures…",   "Structuring answer…"],
  physics:    ["Setting up equations…",      "Tracking units…",        "Structuring answer…"],
  chemistry:  ["Balancing equations…",       "Checking mechanisms…",   "Structuring answer…"],
  math:       ["Setting up proof…",          "Working through steps…", "Structuring answer…"],
  biology:    ["Mapping pathways…",          "Checking taxonomy…",     "Structuring answer…"],
  mechanical: ["Drawing FBD…",               "Checking units…",        "Structuring answer…"],
  electrical: ["Applying KVL/KCL…",          "Reducing circuit…",      "Structuring answer…"],
  general:    ["Thinking…",                  "Analysing question…",    "Structuring answer…"],
};

const UPLOAD_STEPS = ["Reading your PDF…", "Extracting content…", "Almost ready…"];

export default function ThinkingAnimation({ domain, uploadPending }) {
  const [showText, setShowText]   = useState(false);
  const [step,     setStep]       = useState(0);
  const [textKey,  setTextKey]    = useState(0);

  const steps = uploadPending ? UPLOAD_STEPS : (DOMAIN_STEPS[domain] || DOMAIN_STEPS.general);

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
      setStep(prev => (prev + 1) % steps.length);
      setTextKey(k => k + 1);
    }, 1300);

    return () => {
      clearTimeout(showTextTimerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [steps]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>

      {/* ── Vortex SVG ── */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 56 56"
        width={20}
        height={20}
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
        <circle className="amn-vl amn-d00" r="3.1" cx="6"  cy="6" />
        <circle className="amn-vl amn-d01" r="3.1" cx="17" cy="6" />
        <circle className="amn-vl amn-d02" r="3.1" cx="28" cy="6" />
        <circle className="amn-vl amn-d03" r="3.1" cx="39" cy="6" />
        <circle className="amn-vl amn-d04" r="3.1" cx="50" cy="6" />
        <circle className="amn-vl amn-d10" r="3.1" cx="6"  cy="17"/>
        <circle className="amn-vl amn-d11" r="3.1" cx="17" cy="17"/>
        <circle className="amn-vl amn-d12" r="3.1" cx="28" cy="17"/>
        <circle className="amn-vl amn-d13" r="3.1" cx="39" cy="17"/>
        <circle className="amn-vl amn-d14" r="3.1" cx="50" cy="17"/>
        <circle className="amn-vl amn-d20" r="3.1" cx="6"  cy="28"/>
        <circle className="amn-vl amn-d21" r="3.1" cx="17" cy="28"/>
        <circle className="amn-vl amn-d22" r="3.1" cx="28" cy="28"/>
        <circle className="amn-vl amn-d23" r="3.1" cx="39" cy="28"/>
        <circle className="amn-vl amn-d24" r="3.1" cx="50" cy="28"/>
        <circle className="amn-vl amn-d30" r="3.1" cx="6"  cy="39"/>
        <circle className="amn-vl amn-d31" r="3.1" cx="17" cy="39"/>
        <circle className="amn-vl amn-d32" r="3.1" cx="28" cy="39"/>
        <circle className="amn-vl amn-d33" r="3.1" cx="39" cy="39"/>
        <circle className="amn-vl amn-d34" r="3.1" cx="50" cy="39"/>
        <circle className="amn-vl amn-d40" r="3.1" cx="6"  cy="50"/>
        <circle className="amn-vl amn-d41" r="3.1" cx="17" cy="50"/>
        <circle className="amn-vl amn-d42" r="3.1" cx="28" cy="50"/>
        <circle className="amn-vl amn-d43" r="3.1" cx="39" cy="50"/>
        <circle className="amn-vl amn-d44" r="3.1" cx="50" cy="50"/>
      </svg>

      {/* ── Shimmer text — fades in after 3s ── */}
      <span
        key={textKey}
        style={{
          fontSize:               15,
          fontWeight:             600,
          opacity:                showText ? 1 : 0,
          transition:             "opacity 0.35s ease",
          background:             "linear-gradient(90deg,#4a4a5a 0%,#4a4a5a 20%,#c4b5fd 40%,#f0f0f5 55%,#c4b5fd 70%,#4a4a5a 80%,#4a4a5a 100%)",
          backgroundSize:         "200% 100%",
          WebkitBackgroundClip:   "text",
          WebkitTextFillColor:    "transparent",
          backgroundClip:         "text",
          animation:              showText
            ? "amnShimmer 2s linear infinite, amnFadeSlide 0.35s ease"
            : "none",
          whiteSpace:             "nowrap",
        }}
      >
        {steps[step]}
      </span>

      <style>{`
        /* Vortex dot animation */
        .amn-vl {
          fill: #ffffff;
          opacity: 0;
          animation: amnVortex 2400ms linear infinite both;
        }
        @media (prefers-reduced-motion: reduce) {
          .amn-vl { animation: none; opacity: 0.45; }
        }

        /* Animation delay classes */
        .amn-d00, .amn-d11, .amn-d22 { animation-delay:    0ms; }
        .amn-d01                      { animation-delay:  150ms; }
        .amn-d02, .amn-d21            { animation-delay:  300ms; }
        .amn-d03                      { animation-delay:  450ms; }
        .amn-d04, .amn-d31            { animation-delay:  600ms; }
        .amn-d14                      { animation-delay:  750ms; }
        .amn-d24, .amn-d32            { animation-delay:  900ms; }
        .amn-d34                      { animation-delay: 1050ms; }
        .amn-d33, .amn-d44            { animation-delay: 1200ms; }
        .amn-d43                      { animation-delay: 1350ms; }
        .amn-d23, .amn-d42            { animation-delay: 1500ms; }
        .amn-d41                      { animation-delay: 1650ms; }
        .amn-d13, .amn-d40            { animation-delay: 1800ms; }
        .amn-d30                      { animation-delay: 1950ms; }
        .amn-d12, .amn-d20            { animation-delay: 2100ms; }
        .amn-d10                      { animation-delay: 2250ms; }

        @keyframes amnVortex {
          0%   { opacity: 0;    }
          4%   { opacity: 1;    }
          26%  { opacity: 0.08; }
          100% { opacity: 0;    }
        }
        @keyframes amnShimmer {
          0%   { background-position: 200% center;  }
          100% { background-position: -200% center; }
        }
        @keyframes amnFadeSlide {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
