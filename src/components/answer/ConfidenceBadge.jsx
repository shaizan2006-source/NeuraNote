"use client";

import { useMemo } from "react";
import { validateAnswer, scoreAnswer } from "@/lib/postProcessor";
import { getTemplate } from "@/lib/answerTemplates";

/**
 * ConfidenceBadge — shows answer completeness based on [Verify] markers
 * and required section coverage.
 *
 * Props:
 *   answer         {string}
 *   classification {object}  — from askmynotes:classification event
 *   isStreaming    {boolean} — hide while streaming
 */
export default function ConfidenceBadge({ answer, classification, isStreaming }) {
  const { validation, quality } = useMemo(() => {
    if (!answer || isStreaming) return { validation: null, quality: null };

    const templateMeta = classification
      ? getTemplate(classification.marks ?? 10, classification.questionType ?? "theory")
      : { requiredSections: [], diagramRequired: false, wordRange: [0, Infinity] };

    return {
      validation: validateAnswer(answer, templateMeta),
      quality:    scoreAnswer(answer, templateMeta),
    };
  }, [answer, classification, isStreaming]);

  if (!validation || isStreaming) return null;

  const { confidence, verifyCount, missingSections, wordCount } = validation;
  const score = quality?.score ?? null;

  const config = CONFIDENCE_CONFIG[confidence];

  return (
    <div
      title={buildTooltip(validation)}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        gap:          5,
        padding:      "3px 10px",
        borderRadius: 20,
        background:   config.bg,
        border:       `1px solid ${config.border}`,
        fontSize:     11,
        fontWeight:   700,
        color:        config.color,
        letterSpacing: "0.3px",
        cursor:       "default",
        userSelect:   "none",
      }}
    >
      <span style={{ fontSize: 10 }}>{config.icon}</span>
      {config.label}
      {score !== null && (
        <span style={{
          background:   "rgba(0,0,0,0.25)",
          borderRadius: 10,
          padding:      "1px 6px",
          fontSize:     10,
          fontVariantNumeric: "tabular-nums",
        }}>
          {score}/10
        </span>
      )}
      {verifyCount > 0 && (
        <span style={{
          background:   "rgba(0,0,0,0.25)",
          borderRadius: 10,
          padding:      "1px 6px",
          fontSize:     10,
        }}>
          {verifyCount} verify
        </span>
      )}
    </div>
  );
}

const CONFIDENCE_CONFIG = {
  high: {
    icon:   "✓",
    label:  "Complete",
    color:  "#4ade80",
    bg:     "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.3)",
  },
  medium: {
    icon:   "~",
    label:  "Check marked claims",
    color:  "#fbbf24",
    bg:     "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.3)",
  },
  low: {
    icon:   "!",
    label:  "Verify before exam",
    color:  "#f87171",
    bg:     "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.3)",
  },
};

function buildTooltip({ wordCount, missingSections, diagramMissing, verifyCount }) {
  const parts = [`${wordCount} words`];
  if (verifyCount > 0)          parts.push(`${verifyCount} claim(s) need verification`);
  if (missingSections.length)   parts.push(`Missing: ${missingSections.join(", ")}`);
  if (diagramMissing)           parts.push("Diagram expected but not found");
  return parts.join(" · ");
}
