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
export default function AnswerSection({ heading, content, index = 0, isStreaming = false, isLast = false }) {
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
        padding:      '12px 0 16px',
        position:     'relative',
        borderBottom: isLast ? 'none' : '1px solid var(--border-hairline)',
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
            color:         'var(--text-secondary)',
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
              color:        copied ? 'var(--success)' : 'var(--text-tertiary)',
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
            <h2 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, margin: '12px 0 6px' }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: '10px 0 4px' }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 8, fontSize: 14, margin: '0 0 8px' }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{children}</em>
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
              color:        'var(--text-secondary)',
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
                color:     'var(--accent-dim)',
                fontSize:  8,
                lineHeight: 1,
              }}>●</span>
              {children}
            </li>
          ),
          // react-markdown v10 removed the `inline` prop. Detect block code by
          // language class OR presence of a newline (fenced blocks always have one).
          // Block code returns a <div>, so it MUST never be rendered inside <p>.
          code: ({ className, children }) => {
            const codeStr = String(children ?? '');
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = !!match || codeStr.includes('\n');
            if (!isBlock) {
              return (
                <code style={{
                  background:   'var(--bg-inset)',
                  color:        'var(--text-primary)',
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
              color:         'var(--text-tertiary)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              borderBottom:  '2px solid var(--border-strong)',
              background:    'var(--bg-inset)',
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              padding:      '9px 12px',
              fontSize:     13,
              color:        'var(--text-secondary)',
              borderBottom: '1px solid var(--border-hairline)',
              lineHeight:   1.55,
            }}>
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft:  '3px solid var(--border-strong)',
              margin:      '8px 0',
              paddingLeft: 14,
              color:       'var(--text-tertiary)',
              fontStyle:   'italic',
              fontSize:    13,
            }}>
              {children}
            </blockquote>
          ),
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-hairline)', margin: '12px 0' }} />,
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
          background:     'var(--ai-signal)',
          marginLeft:     2,
          verticalAlign:  'middle',
          animation:      'cursorBlink 0.75s step-end infinite',
        }} />
      )}
    </motion.div>
  );
}

