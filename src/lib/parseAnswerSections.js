// ──────────────────────────────────────────────────────────────
// parseAnswerSections
// Splits a streamed Markdown answer into named sections so the
// frontend can render each one as a distinct visual card.
// ──────────────────────────────────────────────────────────────

import { normalizeMarkdownTables } from './normalizeMarkdownTables.js';

/**
 * Split Markdown into { heading, content, isQuickSummary } objects.
 *
 * Recognised heading formats:
 *   ## Heading Name
 *   ### Heading Name
 *   **Heading Name**   (bold-only line, ends the line)
 *
 * Special sections:
 *   QUICK SUMMARY block (--- followed by **QUICK SUMMARY**) → isQuickSummary: true
 *
 * @param {string} markdown
 * @returns {Array<{ heading: string|null, content: string, isQuickSummary: boolean }>}
 */
export function parseAnswerSections(markdown) {
  if (!markdown) return [];

  // Repair AI-generated tables (missing separator row, ragged rows,
  // missing S.No. column) before any section parsing happens.
  markdown = normalizeMarkdownTables(markdown);

  const lines = markdown.split('\n');
  const sections = [];
  let currentHeading = null;
  let currentLines = [];
  let inQuickSummary = false;

  const pushSection = () => {
    const content = currentLines.join('\n').trim();
    if (!content && currentHeading === null) return; // skip leading empty
    sections.push({
      heading:        currentHeading,
      content,
      isQuickSummary: inQuickSummary,
    });
  };

  for (const line of lines) {
    // ── QUICK SUMMARY separator ───────────────────────────────
    if (line.trim() === '---') {
      // Could be the divider before QUICK SUMMARY — peek ahead handled
      // by checking next line in the loop. Push current section first.
      pushSection();
      currentHeading = null;
      currentLines = [];
      inQuickSummary = false;
      continue;
    }

    // ── ## / ### heading ─────────────────────────────────────
    const hashMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (hashMatch) {
      pushSection();
      const heading = hashMatch[1].trim();
      inQuickSummary = heading.toUpperCase() === 'QUICK SUMMARY';
      currentHeading = heading;
      currentLines   = [];
      continue;
    }

    // ── **Heading** bold-only line ────────────────────────────
    // Must be the ENTIRE line (no other text beside it)
    const boldMatch = line.match(/^\*\*([^*]+)\*\*\s*$/);
    if (boldMatch) {
      const candidate = boldMatch[1].trim();
      // Treat as heading only if it looks like a section title:
      // capitalised, ≤ 6 words, no trailing punctuation, no mid-sentence comma
      const words = candidate.split(/\s+/);
      const looksLikeHeading =
        words.length <= 7 &&
        !/[.!?,:;]$/.test(candidate) &&
        !/,/.test(candidate) &&
        /^[A-Z*]/.test(candidate);

      if (looksLikeHeading) {
        pushSection();
        inQuickSummary = candidate.toUpperCase() === 'QUICK SUMMARY';
        currentHeading = candidate;
        currentLines   = [];
        continue;
      }
    }

    currentLines.push(line);
  }

  // flush last section
  pushSection();

  // If the whole answer produced only one section with no heading,
  // that's fine — it's a 2M / short answer — render as-is.
  return sections.filter(s => s.content.length > 0 || s.heading !== null);
}

/**
 * Extract just the QUICK SUMMARY section (if present) and return
 * the rest separately. Used by StructuredAnswer to pin the summary card at top.
 *
 * @param {Array} sections  output of parseAnswerSections()
 * @returns {{ summary: object|null, rest: Array }}
 */
export function extractQuickSummary(sections) {
  const summaryIdx = sections.findIndex(s => s.isQuickSummary);
  if (summaryIdx === -1) return { summary: null, rest: sections };

  const summary = sections[summaryIdx];
  const rest    = sections.filter((_, i) => i !== summaryIdx);
  return { summary, rest };
}

// ── Section metadata (icon, label) ───────────────────────────
// Maps canonical heading names → visual config.
// Keys are lowercase for case-insensitive matching.
// Note: section accent colour is no longer configured here — the UI
// derives all colour from CSS tokens (var(--accent)), so per-section
// hex accents were dead config and have been removed.

const SECTION_META = {
  'definition':              { icon: '📖', label: 'Definition' },
  'introduction':            { icon: '💡', label: 'Introduction' },
  'introduction / historical context': { icon: '💡', label: 'Introduction' },
  'core explanation':        { icon: '🔬', label: 'Core Explanation' },
  'theoretical foundation':  { icon: '🔬', label: 'Theoretical Foundation' },
  'key characteristics':     { icon: '📋', label: 'Key Characteristics' },
  'key features':            { icon: '📋', label: 'Key Features' },
  'detailed features':       { icon: '📋', label: 'Detailed Features' },
  'working':                 { icon: '⚙️', label: 'Working' },
  'working / process':       { icon: '⚙️', label: 'Working / Process' },
  'working mechanism':       { icon: '⚙️', label: 'Working Mechanism' },
  'diagram':                 { icon: '📊', label: 'Diagram' },
  'applications':            { icon: '🌍', label: 'Applications' },
  'real-world applications': { icon: '🌍', label: 'Applications' },
  'extensive real-world applications': { icon: '🌍', label: 'Applications' },
  'advantages':              { icon: '✅', label: 'Advantages' },
  'limitations':             { icon: '⚠️', label: 'Limitations' },
  'limitations / challenges':{ icon: '⚠️', label: 'Limitations' },
  'types':                   { icon: '🗂️', label: 'Types' },
  'types / classification':  { icon: '🗂️', label: 'Types / Classification' },
  'classification':          { icon: '🗂️', label: 'Classification' },
  'case study':              { icon: '📁', label: 'Case Study' },
  'example':                 { icon: '📁', label: 'Example' },
  'example / case study':    { icon: '📁', label: 'Example' },
  'conclusion':              { icon: '🎯', label: 'Conclusion' },
  'current trends':          { icon: '🚀', label: 'Current Trends' },
  'current trends / future scope': { icon: '🚀', label: 'Current Trends' },
  'future scope':            { icon: '🚀', label: 'Future Scope' },
  'critical analysis':       { icon: '🧠', label: 'Critical Analysis' },
  // Problem solving
  'given':                   { icon: '📥', label: 'Given' },
  'required':                { icon: '🎯', label: 'Required' },
  'solution':                { icon: '⚙️', label: 'Solution' },
  'answer':                  { icon: '✅', label: 'Answer' },
  'verification':            { icon: '🔍', label: 'Verification' },
  // Comparison
  'key differences':         { icon: '↔️', label: 'Key Differences' },
  'when to use each':        { icon: '🗺️', label: 'When to Use Each' },
  // Code
  'approach':                { icon: '💡', label: 'Approach' },
  'code':                    { icon: '💻', label: 'Code' },
  'explanation':             { icon: '📝', label: 'Explanation' },
  'complexity analysis':     { icon: '📈', label: 'Complexity Analysis' },
  'example trace':           { icon: '🔍', label: 'Example Trace' },
};

/**
 * Return icon + label for a section heading.
 * Falls back to a neutral default.
 */
export function getSectionMeta(heading) {
  if (!heading) return { icon: '📝', label: heading || '' };
  const key = heading.toLowerCase().replace(/\s+/g, ' ').trim();
  return SECTION_META[key] || { icon: '📝', label: heading };
}
