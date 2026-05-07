// src/lib/focusPlanner.js
import OpenAI from 'openai';

// Lazy singleton — instantiated on first use so test files that don't
// exercise AI calls can import this module without OPENAI_API_KEY set.
let _openai = null;
export const openai = new Proxy(
  {},
  { get(_t, prop) {
      if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      return _openai[prop];
    }
  }
);

export const VALID_TASK_TYPES = ['conceptual', 'memorisation', 'derivation', 'practice', 'revision'];
export const VALID_EXAM_WEIGHTS = ['high', 'medium', 'standard'];

// Used when every AI layer fails. Has proper taskType/examWeight so UI never degrades.
export const ENHANCED_FALLBACK_TASKS = [
  { id: 't1', name: 'Read through and identify key concepts',      estimatedMinutes: 15, taskType: 'conceptual',   examWeight: 'standard' },
  { id: 't2', name: 'Note all definitions and important terminology', estimatedMinutes: 10, taskType: 'memorisation', examWeight: 'medium'   },
  { id: 't3', name: 'Work through any examples or problems',         estimatedMinutes: 20, taskType: 'practice',     examWeight: 'high'     },
  { id: 't4', name: 'Summarise the core ideas in your own words',    estimatedMinutes: 10, taskType: 'revision',     examWeight: 'medium'   },
  { id: 't5', name: 'Review high-priority concepts once more',       estimatedMinutes: 10, taskType: 'revision',     examWeight: 'high'     },
];

/**
 * Strip markdown code fences that GPT sometimes wraps JSON in.
 * "```json\n[...]\n```" → "[...]"
 */
export function stripFences(raw) {
  return raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

/**
 * Parse and validate a blueprint JSON string from GPT.
 * Returns a blueprint object or null if invalid.
 */
export function parseBlueprint(raw) {
  try {
    const parsed = JSON.parse(stripFences(raw));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray(parsed.conceptClusters) ||
      parsed.conceptClusters.length === 0
    ) return null;

    return {
      subject:               String(parsed.subject              || 'Unknown subject'),
      totalConcepts:         Math.max(1, Number(parsed.totalConcepts)        || 6),
      complexityScore:       Math.min(10, Math.max(1, Number(parsed.complexityScore)   || 5)),
      examHeaviness:         Math.min(10, Math.max(1, Number(parsed.examHeaviness)     || 5)),
      estimatedStudyMinutes: Math.max(10, Number(parsed.estimatedStudyMinutes) || 45),
      conceptClusters: parsed.conceptClusters.map((c, i) => ({
        title:              String(c.title || `Topic ${i + 1}`),
        type:               VALID_TASK_TYPES.includes(c.type) ? c.type : 'conceptual',
        examWeight:         VALID_EXAM_WEIGHTS.includes(c.examWeight) ? c.examWeight : 'standard',
        estimatedMinutes:   Math.max(5, Math.min(60, Number(c.estimatedMinutes) || 15)),
        keyTerms:           Array.isArray(c.keyTerms) ? c.keyTerms.map(String) : [],
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Parse and validate a synthesized task list JSON string from GPT.
 * Returns an array of task objects or null if invalid.
 */
export function parseSynthesizedTasks(raw) {
  try {
    const parsed = JSON.parse(stripFences(raw));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed.map((t, i) => ({
      id:               `t${i + 1}`,
      name:             String(t.name || 'Study task'),
      estimatedMinutes: Math.max(5, Math.min(60, Number(t.estimatedMinutes) || 15)),
      taskType:         VALID_TASK_TYPES.includes(t.taskType)    ? t.taskType    : 'conceptual',
      examWeight:       VALID_EXAM_WEIGHTS.includes(t.examWeight) ? t.examWeight : 'standard',
    }));
  } catch {
    return null;
  }
}

/**
 * Derive dynamic task count bounds from blueprint metadata.
 * Returns { min, max } — used as instructions to the synthesis prompt.
 */
export function getTaskBounds(blueprint) {
  let base = Math.min(Math.max(blueprint.totalConcepts, 4), 20);
  if (blueprint.complexityScore >= 8) base += 3;
  if (blueprint.examHeaviness   >= 8) base += 2;
  return {
    min: Math.max(base - 2, 4),
    max: Math.min(base + 4, 25),
  };
}
