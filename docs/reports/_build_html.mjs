#!/usr/bin/env node
// Convert the merged markdown report to a styled, print-ready HTML file.
// The user can open the HTML in any browser and use Ctrl+P → Save as PDF.

import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const INPUT = "CODEBASE_ANALYSIS_2026-05-27.md";
const OUTPUT = "CODEBASE_ANALYSIS_2026-05-27.html";

const md = readFileSync(INPUT, "utf8");

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
});

const bodyHtml = marked.parse(md);

const css = `
  :root {
    --ink: #1a1a1a;
    --ink-soft: #4a4a4a;
    --ink-faint: #8a8a8a;
    --bg: #ffffff;
    --bg-alt: #f7f7f5;
    --accent: #6d28d9;
    --accent-soft: #ede9fe;
    --rule: #e5e5e0;
    --critical: #b91c1c;
    --high: #c2410c;
    --medium: #a16207;
    --low: #15803d;
  }

  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    color: var(--ink);
    background: var(--bg);
    line-height: 1.55;
    font-size: 11pt;
    max-width: 900px;
    margin: 0 auto;
    padding: 48px 60px;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.25;
    margin-top: 1.8em;
    margin-bottom: 0.5em;
    color: var(--ink);
  }

  h1 {
    font-size: 24pt;
    border-bottom: 2px solid var(--accent);
    padding-bottom: 0.3em;
    margin-top: 0;
    page-break-before: always;
  }

  h1:first-of-type { page-break-before: avoid; }

  h2 {
    font-size: 16pt;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 0.2em;
    color: var(--accent);
    page-break-after: avoid;
  }

  h3 { font-size: 13pt; page-break-after: avoid; }
  h4 { font-size: 11.5pt; color: var(--ink-soft); page-break-after: avoid; }

  p { margin: 0.6em 0; }

  strong { color: var(--ink); font-weight: 700; }
  em { color: var(--ink-soft); }

  hr {
    border: 0;
    border-top: 1px solid var(--rule);
    margin: 2em 0;
  }

  blockquote {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    color: var(--ink-soft);
    font-size: 10pt;
    border-radius: 0 4px 4px 0;
  }

  ul, ol { padding-left: 1.5em; margin: 0.6em 0; }
  li { margin: 0.25em 0; }

  code {
    font-family: "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
    background: var(--bg-alt);
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 9.5pt;
    color: var(--accent);
  }

  pre {
    background: var(--bg-alt);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 12px 14px;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }

  pre code {
    background: transparent;
    padding: 0;
    color: var(--ink);
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 10pt;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid var(--rule);
    padding: 6px 10px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: var(--bg-alt);
    font-weight: 600;
  }

  tr:nth-child(even) td { background: #fafaf9; }

  a { color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent); }

  /* Severity color cues — based on emoji used in source */
  td:has(span.critical), p:has(span.critical) { color: var(--critical); }
  td:has(span.high) { color: var(--high); }

  /* Cover page styles */
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-height: 90vh;
    padding-left: 0;
    page-break-after: always;
  }

  .cover h1 {
    font-size: 36pt;
    border: none;
    margin: 0 0 0.2em 0;
    color: var(--ink);
    line-height: 1.1;
  }

  .cover .subtitle {
    font-size: 16pt;
    color: var(--accent);
    margin-bottom: 2em;
    font-weight: 500;
  }

  .cover .meta {
    color: var(--ink-soft);
    font-size: 11pt;
    line-height: 1.8;
  }

  /* Print-specific */
  @media print {
    @page {
      size: A4;
      margin: 18mm 16mm 22mm 16mm;
      @bottom-center {
        content: "Ask My Notes — Codebase Analysis 2026-05-27 — Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        color: var(--ink-faint);
      }
      @top-right {
        content: "Confidential — Internal Strategic Document";
        font-size: 8pt;
        color: var(--ink-faint);
      }
    }

    body {
      padding: 0;
      max-width: 100%;
      font-size: 10pt;
    }

    a {
      color: var(--ink);
      border-bottom: none;
    }

    h1 { page-break-before: always; }
    h1:first-of-type, h2:first-of-type { page-break-before: avoid; }

    h2, h3, h4 { page-break-after: avoid; }

    table, pre, blockquote { page-break-inside: avoid; }
  }
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ask My Notes — Codebase Analysis & Strategic Intelligence (2026-05-27)</title>
<style>${css}</style>
</head>
<body>
<div class="cover">
  <h1>Ask My Notes</h1>
  <div class="subtitle">Codebase Analysis &amp; Strategic Intelligence Report</div>
  <div class="meta">
    <strong>Date:</strong> 2026-05-27<br>
    <strong>Version:</strong> 1.0<br>
    <strong>Prepared for:</strong> Shafi (shaizan2006@gmail.com)<br>
    <strong>Prepared by:</strong> Claude (Opus 4.7)<br>
    <strong>Codebase:</strong> c:\\Users\\Shafi\\ask-my-notes<br>
    <strong>Branch:</strong> master<br>
    <strong>Scope:</strong> Full code inventory, technical debt, architecture, competitive,<br>monetization, growth, risk, metrics, and recommendations
  </div>
</div>
${bodyHtml}
<hr>
<p style="text-align: center; color: var(--ink-faint); font-size: 9pt; margin-top: 4em;">
  This document is an internal strategic intelligence report. Confidential. Generated 2026-05-27.<br>
  To turn into a PDF: open this file in Chrome / Edge / Firefox → Ctrl+P → Save as PDF.<br>
  Recommended print settings: A4, Portrait, Margins "Default", "Background graphics" ON.
</p>
</body>
</html>`;

writeFileSync(OUTPUT, html, "utf8");
console.log(`Wrote ${OUTPUT} (${(html.length / 1024).toFixed(1)} KB)`);
