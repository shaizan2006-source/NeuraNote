"use client";

import { useState, useEffect } from "react";

const DOMAIN_STEPS = {
  cs:         ["Parsing algorithm…",       "Checking complexity…",   "Structuring answer…"],
  law:        ["Finding relevant sections…","Checking case law…",     "Structuring answer…"],
  finance:    ["Preparing ledger format…",  "Calculating figures…",   "Structuring answer…"],
  physics:    ["Setting up equations…",     "Tracking units…",        "Structuring answer…"],
  chemistry:  ["Balancing equations…",      "Checking mechanisms…",   "Structuring answer…"],
  math:       ["Setting up proof…",         "Working through steps…", "Structuring answer…"],
  biology:    ["Mapping pathways…",         "Checking taxonomy…",     "Structuring answer…"],
  mechanical: ["Drawing FBD…",              "Checking units…",        "Structuring answer…"],
  electrical: ["Applying KVL/KCL…",         "Reducing circuit…",      "Structuring answer…"],
  general:    ["Thinking…",                 "Analysing question…",    "Structuring answer…"],
};

const UPLOAD_STEPS = ["Reading your PDF…", "Extracting content…", "Almost ready…"];

export default function ThinkingAnimation({ domain, uploadPending }) {
  const [step, setStep] = useState(0);
  const steps = uploadPending ? UPLOAD_STEPS : (DOMAIN_STEPS[domain] || DOMAIN_STEPS.general);

  useEffect(() => {
    setStep(0);
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % steps.length);
    }, 1300);
    return () => clearInterval(interval);
  }, [steps]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width:        7,
              height:       7,
              borderRadius: "50%",
              background:   "#7c3aed",
              animation:    `thinkBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{
        color:      "#a78bfa",
        fontSize:   13,
        fontWeight: 600,
        animation:  "thinkFade 0.35s ease",
        key:        step,
      }}>
        {steps[step]}
      </span>
      <style>{`
        @keyframes thinkBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes thinkFade {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
