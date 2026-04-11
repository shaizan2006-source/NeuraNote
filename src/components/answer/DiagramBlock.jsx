"use client";

import { useState } from "react";

/**
 * DiagramBlock — renders a fenced code block (``` ... ```) from an answer section.
 * Dark monospace background, copy button, optional zoom.
 */
export default function DiagramBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const isDiagram = !language || language === '' || language === 'text' || language === 'diagram';

  return (
    <>
      <div style={{
        position:     'relative',
        borderRadius: 10,
        border:       '1px solid #1e293b',
        background:   '#0d1117',
        margin:       '12px 0',
        overflow:     'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '6px 14px',
          borderBottom:   '1px solid #1e293b',
          background:     '#0a0f18',
        }}>
          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.5px' }}>
            {isDiagram ? 'DIAGRAM' : (language || 'CODE').toUpperCase()}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {isDiagram && (
              <button
                onClick={() => setZoomed(true)}
                title="Expand"
                style={iconBtnStyle}
              >
                ⤢
              </button>
            )}
            <button
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy'}
              style={{ ...iconBtnStyle, color: copied ? '#22c55e' : '#64748b' }}
            >
              {copied ? '✓' : '⧉'}
            </button>
          </div>
        </div>

        {/* Code content */}
        <pre style={{
          margin:      0,
          padding:     '16px 18px',
          overflowX:   'auto',
          fontFamily:  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize:    13,
          lineHeight:  1.55,
          color:       isDiagram ? '#94a3b8' : '#7dd3fc',
          whiteSpace:  'pre',
          tabSize:     2,
        }}>
          <code>{code}</code>
        </pre>
      </div>

      {/* Zoom modal */}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0,0,0,0.8)',
            zIndex:         9999,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:   '#0d1117',
              border:       '1px solid #1e293b',
              borderRadius: 14,
              maxWidth:     '90vw',
              maxHeight:    '80vh',
              overflow:     'auto',
              padding:      24,
            }}
          >
            <pre style={{
              margin:     0,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize:   14,
              lineHeight: 1.6,
              color:      '#94a3b8',
              whiteSpace: 'pre',
            }}>
              <code>{code}</code>
            </pre>
          </div>
        </div>
      )}
    </>
  );
}

const iconBtnStyle = {
  background:   'transparent',
  border:       'none',
  cursor:       'pointer',
  color:        '#64748b',
  fontSize:     13,
  padding:      '2px 6px',
  borderRadius: 4,
  transition:   'color 0.15s',
  fontFamily:   'monospace',
};
