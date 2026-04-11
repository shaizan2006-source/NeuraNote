"use client";

import { motion } from "framer-motion";

/**
 * DynamicFollowUps — context-aware follow-up chips.
 * Replaces the static FOLLOW_UPS array in AskAISection.
 */
export default function DynamicFollowUps({ classification, onSelect }) {
  const chips = buildChips(classification);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
      {chips.map((chip, i) => (
        <motion.button
          key={chip.query}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onSelect(chip.query)}
          style={{
            padding:      '5px 12px',
            borderRadius: 20,
            border:       '1px solid #2d3748',
            background:   '#1e293b',
            color:        '#94a3b8',
            fontSize:     11,
            fontWeight:   600,
            cursor:       'pointer',
            transition:   'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#7c3aed';
            e.currentTarget.style.color = '#a78bfa';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2d3748';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          {chip.label}
        </motion.button>
      ))}
    </div>
  );
}

function buildChips(classification) {
  if (!classification) return DEFAULT_CHIPS;

  const { domain, marks, questionType, originalQuestion } = classification;
  const q     = originalQuestion || '';
  const chips = [];

  // Universal: simplify
  chips.push({ label: 'Explain simpler', query: `Explain in the simplest way possible: ${q}` });

  // Marks-based: offer opposite depth
  if (marks <= 5) {
    chips.push({ label: 'Full answer (10M)', query: `${q} (10 marks)` });
  } else if (marks >= 10) {
    chips.push({ label: 'Quick notes (2M)', query: `${q} (2 marks)` });
  }

  // Question-type based
  if (questionType === 'theory' || questionType === 'definition') {
    chips.push({ label: 'Practice questions', query: `Give 5 practice exam questions on: ${q}` });
    chips.push({ label: 'Short notes', query: `Write short notes on: ${q}` });
  }
  if (questionType === 'problem') {
    chips.push({ label: 'Similar problem', query: `Give me a similar problem to practice: ${q}` });
    chips.push({ label: 'Explain the concept', query: `Explain the theory/concept behind: ${q}` });
  }
  if (questionType === 'comparison') {
    chips.push({ label: 'Summarise differences', query: `List the 3 key differences for: ${q}` });
  }
  if (questionType === 'code') {
    chips.push({ label: 'Explain line by line', query: `Explain line by line: ${q}` });
    chips.push({ label: 'Test cases', query: `Write test cases for: ${q}` });
  }
  if (questionType === 'derivation') {
    chips.push({ label: 'Step-by-step again', query: `Re-derive step by step more clearly: ${q}` });
  }

  // Domain-based extras
  if (domain === 'cs') {
    chips.push({ label: 'Code example', query: `Write code example for: ${q}` });
  }
  if (domain === 'law') {
    chips.push({ label: 'Key case laws', query: `What are the landmark cases related to: ${q}` });
    chips.push({ label: 'Recent amendments', query: `Are there any recent amendments related to: ${q}` });
  }
  if (domain === 'finance') {
    chips.push({ label: 'Solved example', query: `Give a solved numerical example for: ${q}` });
  }
  if (domain === 'physics' || domain === 'chemistry' || domain === 'math') {
    chips.push({ label: 'Numerical problem', query: `Give a numerical problem on: ${q}` });
  }
  if (domain === 'biology') {
    chips.push({ label: 'Diagram', query: `Draw a labeled diagram for: ${q}` });
  }
  if (domain === 'medical') {
    chips.push({ label: 'Clinical features', query: `What are the clinical features of: ${q}` });
    chips.push({ label: 'Treatment protocol', query: `Explain the management/treatment of: ${q}` });
  }
  if (domain === 'business') {
    chips.push({ label: 'Real example', query: `Give a real company example for: ${q}` });
    chips.push({ label: 'Case study', query: `Give a case study applying: ${q}` });
  }

  // Cap at 4 chips
  return chips.slice(0, 4);
}

const DEFAULT_CHIPS = [
  { label: 'Explain simpler',    query: 'Explain simpler' },
  { label: 'Practice questions', query: 'Give practice questions' },
  { label: 'Short notes',        query: 'Short notes' },
  { label: 'Exam format',        query: 'Exam answer format' },
];
