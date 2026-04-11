"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AnswerRating — thumbs up/down + optional flag type.
 * Submits to /api/answer-feedback (created in the migration).
 */
export default function AnswerRating({ questionHash, domain, marks, authHeader }) {
  const [rating,    setRating]   = useState(null);   // 1 | -1 | null
  const [flagging,  setFlagging] = useState(false);  // show flag options
  const [flagType,  setFlagType] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (r, flag = null) => {
    setRating(r);
    setFlagType(flag);
    setFlagging(false);
    setSubmitted(true);

    try {
      await fetch('/api/answer-feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          question_hash: questionHash,
          domain,
          marks,
          rating:    r,
          flag_type: flag,
        }),
      });
    } catch {
      // fire-and-forget — non-critical
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}
      >
        <span style={{ fontSize: 12, color: '#475569' }}>
          {rating === 1 ? '👍 Thanks for the feedback!' : '👎 Got it — we\'ll improve this.'}
        </span>
      </motion.div>
    );
  }

  return (
    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>Was this helpful?</span>

      <button
        onClick={() => submit(1)}
        title="Helpful"
        style={ratingBtnStyle(rating === 1)}
      >
        👍
      </button>

      <button
        onClick={() => setFlagging(f => !f)}
        title="Not helpful"
        style={ratingBtnStyle(rating === -1)}
      >
        👎
      </button>

      <AnimatePresence>
        {flagging && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}
          >
            {FLAG_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => submit(-1, key)}
                style={{
                  padding:      '3px 9px',
                  borderRadius: 20,
                  border:       '1px solid #2d3748',
                  background:   'transparent',
                  color:        '#64748b',
                  fontSize:     11,
                  cursor:       'pointer',
                  fontWeight:   600,
                  transition:   'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d3748'; e.currentTarget.style.color = '#64748b'; }}
              >
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FLAG_OPTIONS = [
  { key: 'inaccurate',    label: 'Inaccurate' },
  { key: 'incomplete',    label: 'Incomplete' },
  { key: 'wrong_format',  label: 'Wrong format' },
  { key: 'confusing',     label: 'Confusing' },
];

function ratingBtnStyle(active) {
  return {
    background:   active ? 'rgba(124,58,237,0.15)' : 'transparent',
    border:       `1px solid ${active ? '#7c3aed' : '#1e293b'}`,
    borderRadius: 8,
    padding:      '4px 8px',
    cursor:       'pointer',
    fontSize:     14,
    transition:   'background 0.15s, border-color 0.15s',
  };
}
