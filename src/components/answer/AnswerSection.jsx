"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import DiagramBlock from "./DiagramBlock";
import { getSectionMeta } from "@/lib/parseAnswerSections";

/**
 * AnswerSection — a single section card from the structured answer.
 * Renders its Markdown content with colour-coded left border.
 */
export default function AnswerSection({ heading, content, index = 0, isStreaming = false }) {
  const [copied, setCopied] = useState(false);
  const meta = getSectionMeta(heading);

  const handleCopySectionText = () => {
    const plain = content.replace(/\*\*/g, '').replace(/`/g, '');
    navigator.clipboard.writeText(plain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      style={{
        marginBottom:  12,
        borderRadius:  '0 10px 10px 0',
        borderLeft:    `3px solid ${meta.accent}`,
        background:    hexToRgba(meta.accent, 0.04),
        padding:       '14px 16px 14px 18px',
        position:      'relative',
      }}
    >
      {/* Section header */}
      {heading && (
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         7,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 14, lineHeight: 1 }}>{meta.icon}</span>
          <span style={{
            fontSize:      13,
            fontWeight:    700,
            color:         meta.accent,
            letterSpacing: '0.2px',
          }}>
            {meta.label || heading}
          </span>

          <button
            onClick={handleCopySectionText}
            title={copied ? 'Copied' : 'Copy section'}
            style={{
              marginLeft:   'auto',
              background:   'transparent',
              border:       'none',
              cursor:       'pointer',
              fontSize:     11,
              color:        copied ? '#22c55e' : '#334155',
              padding:      '2px 6px',
              borderRadius: 4,
              transition:   'color 0.15s',
            }}
          >
            {copied ? '✓ Copied' : '⧉'}
          </button>
        </div>
      )}

      {/* Section content — custom Markdown renderers.
          remark-gfm is REQUIRED for table syntax to be parsed at all.
          Without it, react-markdown emits raw `| col |` text. */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings inside section content (shouldn't exist but handle gracefully)
          h2: ({ children }) => (
            <h2 style={{ color: '#60a5fa', fontSize: 15, fontWeight: 700, margin: '12px 0 6px' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600, margin: '10px 0 4px' }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ color: '#cbd5e1', lineHeight: 1.75, marginBottom: 8, fontSize: 14, margin: '0 0 8px' }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: '#f1f5f9', fontWeight: 700 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: '#94a3b8', fontStyle: 'italic' }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '4px 0 8px', paddingLeft: 20, listStyle: 'none' }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '4px 0 8px', paddingLeft: 20 }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{
              color:        '#94a3b8',
              lineHeight:   1.65,
              marginBottom: 5,
              fontSize:     14,
              paddingLeft:  18,
              position:     'relative',
            }}>
              <span style={{
                position:  'absolute',
                left:      4,
                top:       9,
                color:     meta.accent,
                fontSize:  8,
                lineHeight: 1,
              }}>●</span>
              {children}
            </li>
          ),
          // react-markdown v10 removed the `inline` prop. Detect block code by
          // language class OR presence of a newline (fenced blocks always have one).
          // Block code returns a <div>, so it MUST never be rendered inside <p>.
          code: ({ className, children, ...props }) => {
            const codeStr = String(children ?? '');
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = !!match || codeStr.includes('\n');
            if (!isBlock) {
              return (
                <code style={{
                  background:   '#1e293b',
                  color:        '#7dd3fc',
                  padding:      '2px 6px',
                  borderRadius: 4,
                  fontSize:     12,
                  fontFamily:   "'JetBrains Mono', monospace",
                }}>
                  {children}
                </code>
              );
            }
            return <DiagramBlock code={codeStr.replace(/\n$/, '')} language={match?.[1] || ''} />;
          },
          // <pre> wraps fenced code; render children directly so DiagramBlock
          // (a <div>) replaces the <pre> at the block level, never inside <p>.
          pre: ({ children }) => <>{children}</>,
          // Tables
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '10px 0' }}>
              <table style={{
                borderCollapse: 'collapse',
                width:          '100%',
                fontSize:       13,
              }}>
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{
              padding:       '8px 12px',
              textAlign:     'left',
              fontSize:      11,
              fontWeight:    700,
              color:         '#64748b',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              borderBottom:  '2px solid #1e293b',
              background:    '#0a0f18',
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              padding:      '9px 12px',
              fontSize:     13,
              color:        '#94a3b8',
              borderBottom: '1px solid #1a1f2e',
              lineHeight:   1.55,
            }}>
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft:  '3px solid #334155',
              margin:      '8px 0',
              paddingLeft: 14,
              color:       '#64748b',
              fontStyle:   'italic',
              fontSize:    13,
            }}>
              {children}
            </blockquote>
          ),
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '12px 0' }} />,
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Streaming cursor at end of last section */}
      {isStreaming && (
        <span style={{
          display:        'inline-block',
          width:          2,
          height:         15,
          background:     meta.accent,
          marginLeft:     2,
          verticalAlign:  'middle',
          animation:      'cursorBlink 0.75s step-end infinite',
        }} />
      )}
    </motion.div>
  );
}

// ── Utility ───────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
