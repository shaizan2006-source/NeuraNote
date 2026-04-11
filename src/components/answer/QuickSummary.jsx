"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * QuickSummary — collapsible TL;DR card pinned above the full answer.
 * Shown only for answers with marks >= 10 when the QUICK SUMMARY block is present.
 */
export default function QuickSummary({ content }) {
  const [open, setOpen] = useState(true);

  // Parse the three lines from the QUICK SUMMARY block
  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const parsed = {};
  for (const line of lines) {
    if (/^in one line:/i.test(line))  parsed.oneLiner  = line.replace(/^in one line:\s*/i, '').trim();
    if (/^analogy:/i.test(line))       parsed.analogy   = line.replace(/^analogy:\s*/i, '').trim();
    if (/^exam tip:/i.test(line))      parsed.examTip   = line.replace(/^exam tip:\s*/i, '').trim();
  }

  // Fallback: if parsing failed, show raw content
  const hasStructured = parsed.oneLiner || parsed.analogy || parsed.examTip;

  return (
    <div style={{
      marginBottom:  16,
      borderRadius:  12,
      border:        '1px solid rgba(59,130,246,0.25)',
      background:    'rgba(59,130,246,0.06)',
      overflow:      'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '10px 16px',
          background:     'transparent',
          border:         'none',
          cursor:         'pointer',
          textAlign:      'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚡</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', letterSpacing: '0.4px' }}>
            QUICK SUMMARY
          </span>
        </span>
        <span style={{
          fontSize:   11,
          color:      '#475569',
          transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display:    'inline-block',
        }}>
          ▼
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 16px 14px' }}>
              {hasStructured ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {parsed.oneLiner && (
                    <div style={summaryRowStyle}>
                      <span style={labelStyle}>In one line</span>
                      <span style={valueStyle}>{parsed.oneLiner}</span>
                    </div>
                  )}
                  {parsed.analogy && (
                    <div style={summaryRowStyle}>
                      <span style={labelStyle}>Analogy</span>
                      <span style={valueStyle}>{parsed.analogy}</span>
                    </div>
                  )}
                  {parsed.examTip && (
                    <div style={{ ...summaryRowStyle, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
                      <span style={{ ...labelStyle, color: '#fbbf24' }}>Exam tip</span>
                      <span style={valueStyle}>{parsed.examTip}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: '#94a3b8' }}>
                  {content}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const summaryRowStyle = {
  display:      'flex',
  gap:          10,
  alignItems:   'flex-start',
  padding:      '8px 10px',
  background:   'rgba(255,255,255,0.03)',
  borderRadius: 8,
  border:       '1px solid rgba(255,255,255,0.05)',
};

const labelStyle = {
  fontSize:    10,
  fontWeight:  700,
  color:       '#60a5fa',
  letterSpacing: '0.5px',
  minWidth:    60,
  paddingTop:  2,
  textTransform: 'uppercase',
};

const valueStyle = {
  fontSize:   13,
  lineHeight: 1.6,
  color:      '#cbd5e1',
  flex:       1,
};
