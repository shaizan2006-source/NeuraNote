"use client";

import { useMemo } from "react";
import { parseAnswerSections, extractQuickSummary } from "@/lib/parseAnswerSections";
import AnswerSection from "./AnswerSection";
import QuickSummary from "./QuickSummary";

/**
 * StructuredAnswer — replaces the flat <ReactMarkdown> blob in AskAISection.
 *
 * Props:
 *   answer      {string}  — full accumulated Markdown text (streamed or complete)
 *   isStreaming {boolean} — true while the stream is in progress
 *   marks       {number}  — from classification (controls quick summary threshold)
 */
export default function StructuredAnswer({ answer, isStreaming = false, marks = 10 }) {
  // Re-parse on every render during streaming (answer grows on each chunk)
  const sections = useMemo(() => parseAnswerSections(answer), [answer]);
  const { summary, rest } = useMemo(() => extractQuickSummary(sections), [sections]);

  if (!sections.length) return null;

  // Single un-headed section → 2M / short answer, render inline without cards
  const isFlatAnswer =
    rest.length === 1 &&
    rest[0].heading === null &&
    !summary;

  if (isFlatAnswer) {
    return (
      <AnswerSection
        heading={null}
        content={rest[0].content}
        index={0}
        isStreaming={isStreaming}
      />
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Quick Summary pinned at top */}
      {summary && marks >= 10 && (
        <QuickSummary content={summary.content} />
      )}

      {/* Section cards */}
      {rest.map((section, i) => (
        <AnswerSection
          key={`${section.heading ?? 'anon'}-${i}`}
          heading={section.heading}
          content={section.content}
          index={i}
          isStreaming={isStreaming && i === rest.length - 1}
        />
      ))}
    </div>
  );
}
