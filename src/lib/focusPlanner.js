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
      totalConcepts:         Math.max(1, (parsed.totalConcepts        != null && !Number.isNaN(Number(parsed.totalConcepts)))        ? Number(parsed.totalConcepts)        : 6),
      complexityScore:       Math.min(10, Math.max(1, (parsed.complexityScore   != null && !Number.isNaN(Number(parsed.complexityScore)))   ? Number(parsed.complexityScore)   : 5)),
      examHeaviness:         Math.min(10, Math.max(1, (parsed.examHeaviness     != null && !Number.isNaN(Number(parsed.examHeaviness)))     ? Number(parsed.examHeaviness)     : 5)),
      estimatedStudyMinutes: Math.max(10, (parsed.estimatedStudyMinutes != null && !Number.isNaN(Number(parsed.estimatedStudyMinutes))) ? Number(parsed.estimatedStudyMinutes) : 45),
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

// Maximum characters of chunk text sent to GPT-4o.
// ~80k chars ≈ ~20k tokens — well within gpt-4o's 128k context window.
const BLUEPRINT_TEXT_CAP = 80_000;

const BLUEPRINT_SYSTEM_PROMPT = `You are an expert academic study coach and exam strategist.
Analyse the provided study material and return a single JSON object matching this exact schema.
Return ONLY valid JSON. No prose, no markdown fences, no commentary.

{
  "subject": "<2-4 word subject name>",
  "totalConcepts": <integer 1-30>,
  "complexityScore": <integer 1-10, 1=very simple, 10=graduate/research level>,
  "examHeaviness": <integer 1-10, 1=theory only, 10=heavy formulas/derivations/past-paper weight>,
  "estimatedStudyMinutes": <integer, realistic total session time>,
  "conceptClusters": [
    {
      "title": "<concise topic title>",
      "type": "<conceptual|memorisation|derivation|practice|revision>",
      "examWeight": "<high|medium|standard>",
      "estimatedMinutes": <integer 5-45>,
      "keyTerms": ["term1", "term2"]
    }
  ]
}

Type guide:
  conceptual    = understanding models, theories, processes
  memorisation  = definitions, formulas, facts to memorise
  derivation    = mathematical or logical proofs and derivations
  practice      = applying concepts to examples or problems
  revision      = consolidation and review of covered material

ExamWeight guide:
  high     = frequently appears in exams, critical concept, high weightage
  medium   = appears moderately, important but not always tested
  standard = background or supporting knowledge

Ordering: sequence clusters foundational → advanced → revision.`;

/**
 * Pass 1: analyse full document text and return a structured blueprint.
 * Returns a parsed blueprint object or null if GPT fails.
 * Never throws.
 */
export async function buildBlueprint(chunkTexts, docName) {
  try {
    const material = chunkTexts.join('\n\n---\n\n').slice(0, BLUEPRINT_TEXT_CAP);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: BLUEPRINT_SYSTEM_PROMPT },
        { role: 'user',   content: `Document name: ${docName}\n\nStudy material:\n${material}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const blueprint = parseBlueprint(raw);
    if (blueprint) return blueprint;

    // One retry with explicit correction nudge
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        { role: 'system',    content: BLUEPRINT_SYSTEM_PROMPT },
        { role: 'user',      content: `Document name: ${docName}\n\nStudy material:\n${material}` },
        { role: 'assistant', content: raw },
        { role: 'user',      content: 'Your response was not valid JSON. Return ONLY the JSON object, starting with { and ending with }. No other text.' },
      ],
    });

    const raw2 = retry.choices[0]?.message?.content?.trim() ?? '';
    return parseBlueprint(raw2); // null if still invalid — caller handles
  } catch {
    return null;
  }
}
