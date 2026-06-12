
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
          background:   "var(--bg-inset)",
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
          background:   "var(--bg-inset)",
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
    color:  "var(--success)",
    bg:     "color-mix(in srgb, var(--success) 10%, transparent)",
    border: "color-mix(in srgb, var(--success) 30%, transparent)",
  },
  medium: {
    icon:   "~",
    label:  "Check marked claims",
    color:  "var(--warning)",
    bg:     "color-mix(in srgb, var(--warning) 10%, transparent)",
    border: "color-mix(in srgb, var(--warning) 30%, transparent)",
  },
  low: {
    icon:   "!",
    label:  "Verify before exam",
    color:  "var(--error)",
    bg:     "color-mix(in srgb, var(--error) 10%, transparent)",
    border: "color-mix(in srgb, var(--error) 30%, transparent)",
  },
};

function buildTooltip({ wordCount, missingSections, diagramMissing, verifyCount }) {
  const parts = [`${wordCount} words`];
  if (verifyCount > 0)          parts.push(`${verifyCount} claim(s) need verification`);
  if (missingSections.length)   parts.push(`Missing: ${missingSections.join(", ")}`);
  if (diagramMissing)           parts.push("Diagram expected but not found");
  return parts.join(" · ");
}
