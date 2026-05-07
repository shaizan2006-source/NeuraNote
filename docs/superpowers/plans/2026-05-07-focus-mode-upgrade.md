# Focus Mode Intelligence Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic 8-chunk / 6-8-task focus mode with an intelligent two-pass AI pipeline that produces unique, exam-oriented study plans from the full document, and adds a Deep Void ambient atmosphere to the session UI.

**Architecture:** A new `src/lib/focusPlanner.js` module owns the entire analysis pipeline: Pass 1 uses GPT-4o to produce a structured document blueprint from all chunks; Pass 2 uses GPT-4o-mini to synthesise a dynamic task list from the blueprint. The route stays thin. Two new visual components (`FocusAmbience`, task badges) drop into existing UI files with no layout changes.

**Tech Stack:** Next.js 14 App Router, OpenAI SDK (`gpt-4o` + `gpt-4o-mini`), Supabase JS, Framer Motion (already installed), React inline styles (project convention — no Tailwind).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/focusPlanner.js` | **Create** | Blueprint generation (Pass 1), task synthesis (Pass 2), legacy single-pass fallback, enhanced fallback tasks, all parsing utilities |
| `src/lib/focusPlanner.test.js` | **Create** | Unit tests for pure functions in focusPlanner.js |
| `src/app/api/generate-focus-tasks/route.js` | **Modify** | Remove `.limit(8)`, delegate to `generateFocusPlan()`, return `blueprint` in response |
| `src/components/focus/FocusAmbience.jsx` | **Create** | Deep Void three-layer ambient background (CSS-only, fixed, pointer-events none) |
| `src/components/focus/FocusSessionActive.jsx` | **Modify** | Import `FocusAmbience`; add `examWeight` badge + `taskType` pill to task cards |
| `src/components/focus/FocusModeLoader.jsx` | **Modify** | Import `FocusAmbience` |

---

## Task 1: focusPlanner.js — Constants, fallback tasks, and parsing utilities

**Files:**
- Create: `src/lib/focusPlanner.js`
- Create: `src/lib/focusPlanner.test.js`

These are the pure-function building blocks. No OpenAI calls here — just data constants and parsers. Start here so every later task has a typed foundation and the tests catch regressions immediately.

- [ ] **Step 1: Create `src/lib/focusPlanner.js` with constants and ENHANCED_FALLBACK_TASKS**

```js
// src/lib/focusPlanner.js
import OpenAI from 'openai';

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
```

- [ ] **Step 2: Create `src/lib/focusPlanner.test.js`**

```js
// src/lib/focusPlanner.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripFences,
  parseBlueprint,
  parseSynthesizedTasks,
  getTaskBounds,
  ENHANCED_FALLBACK_TASKS,
  VALID_TASK_TYPES,
  VALID_EXAM_WEIGHTS,
} from './focusPlanner.js';

// ── stripFences ─────────────────────────────────────────────────────
test('stripFences: removes json code fence', () => {
  assert.equal(stripFences('```json\n[1,2,3]\n```'), '[1,2,3]');
});
test('stripFences: removes plain code fence', () => {
  assert.equal(stripFences('```\n{"a":1}\n```'), '{"a":1}');
});
test('stripFences: passthrough when no fence', () => {
  assert.equal(stripFences('{"a":1}'), '{"a":1}');
});

// ── parseBlueprint ──────────────────────────────────────────────────
test('parseBlueprint: returns null for empty string', () => {
  assert.equal(parseBlueprint(''), null);
});
test('parseBlueprint: returns null for invalid JSON', () => {
  assert.equal(parseBlueprint('not json at all'), null);
});
test('parseBlueprint: returns null when conceptClusters missing', () => {
  assert.equal(parseBlueprint('{"subject":"Maths"}'), null);
});
test('parseBlueprint: returns null when conceptClusters is empty array', () => {
  assert.equal(parseBlueprint('{"conceptClusters":[]}'), null);
});
test('parseBlueprint: parses valid blueprint and normalises fields', () => {
  const input = JSON.stringify({
    subject: 'Computer Networks',
    totalConcepts: 10,
    complexityScore: 7,
    examHeaviness: 8,
    estimatedStudyMinutes: 90,
    conceptClusters: [
      { title: 'TCP/IP', type: 'conceptual', examWeight: 'high', estimatedMinutes: 20, keyTerms: ['OSI'] },
    ],
  });
  const result = parseBlueprint(input);
  assert.equal(result.subject, 'Computer Networks');
  assert.equal(result.totalConcepts, 10);
  assert.equal(result.conceptClusters.length, 1);
  assert.equal(result.conceptClusters[0].type, 'conceptual');
  assert.equal(result.conceptClusters[0].examWeight, 'high');
});
test('parseBlueprint: normalises unknown taskType to conceptual', () => {
  const input = JSON.stringify({
    conceptClusters: [{ title: 'X', type: 'UNKNOWN_TYPE', examWeight: 'high', estimatedMinutes: 10, keyTerms: [] }],
  });
  const result = parseBlueprint(input);
  assert.equal(result.conceptClusters[0].type, 'conceptual');
});
test('parseBlueprint: strips code fences before parsing', () => {
  const inner = JSON.stringify({ conceptClusters: [{ title: 'X', type: 'conceptual', examWeight: 'high', estimatedMinutes: 10, keyTerms: [] }] });
  assert.notEqual(parseBlueprint('```json\n' + inner + '\n```'), null);
});

// ── parseSynthesizedTasks ───────────────────────────────────────────
test('parseSynthesizedTasks: returns null for empty array', () => {
  assert.equal(parseSynthesizedTasks('[]'), null);
});
test('parseSynthesizedTasks: returns null for invalid JSON', () => {
  assert.equal(parseSynthesizedTasks('bad'), null);
});
test('parseSynthesizedTasks: returns null for non-array', () => {
  assert.equal(parseSynthesizedTasks('{"name":"x"}'), null);
});
test('parseSynthesizedTasks: parses valid tasks and assigns ids', () => {
  const input = JSON.stringify([
    { name: 'Understand TCP', estimatedMinutes: 20, taskType: 'conceptual', examWeight: 'high' },
    { name: 'Memorise ports', estimatedMinutes: 10, taskType: 'memorisation', examWeight: 'medium' },
  ]);
  const result = parseSynthesizedTasks(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 't1');
  assert.equal(result[1].id, 't2');
  assert.equal(result[0].taskType, 'conceptual');
  assert.equal(result[1].examWeight, 'medium');
});
test('parseSynthesizedTasks: clamps estimatedMinutes to 5–60', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 999, taskType: 'conceptual', examWeight: 'high' }]);
  const result = parseSynthesizedTasks(input);
  assert.equal(result[0].estimatedMinutes, 60);
});
test('parseSynthesizedTasks: normalises unknown taskType to conceptual', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'INVALID', examWeight: 'high' }]);
  const result = parseSynthesizedTasks(input);
  assert.equal(result[0].taskType, 'conceptual');
});
test('parseSynthesizedTasks: normalises unknown examWeight to standard', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'INVALID' }]);
  const result = parseSynthesizedTasks(input);
  assert.equal(result[0].examWeight, 'standard');
});
test('parseSynthesizedTasks: strips code fences', () => {
  const inner = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'high' }]);
  assert.notEqual(parseSynthesizedTasks('```json\n' + inner + '\n```'), null);
});

// ── getTaskBounds ───────────────────────────────────────────────────
test('getTaskBounds: simple document (5 concepts, low scores)', () => {
  const { min, max } = getTaskBounds({ totalConcepts: 5, complexityScore: 4, examHeaviness: 3 });
  assert.ok(min >= 4);
  assert.ok(max <= 25);
  assert.ok(min <= max);
});
test('getTaskBounds: complex document (20 concepts, high scores)', () => {
  const { min, max } = getTaskBounds({ totalConcepts: 20, complexityScore: 9, examHeaviness: 9 });
  assert.equal(max, 25);
  assert.ok(min < max);
});
test('getTaskBounds: min is always at least 4', () => {
  const { min } = getTaskBounds({ totalConcepts: 1, complexityScore: 1, examHeaviness: 1 });
  assert.ok(min >= 4);
});

// ── ENHANCED_FALLBACK_TASKS ─────────────────────────────────────────
test('ENHANCED_FALLBACK_TASKS: all tasks have valid taskType', () => {
  ENHANCED_FALLBACK_TASKS.forEach(t => {
    assert.ok(VALID_TASK_TYPES.includes(t.taskType), `Invalid taskType: ${t.taskType}`);
  });
});
test('ENHANCED_FALLBACK_TASKS: all tasks have valid examWeight', () => {
  ENHANCED_FALLBACK_TASKS.forEach(t => {
    assert.ok(VALID_EXAM_WEIGHTS.includes(t.examWeight), `Invalid examWeight: ${t.examWeight}`);
  });
});
test('ENHANCED_FALLBACK_TASKS: all tasks have estimatedMinutes > 0', () => {
  ENHANCED_FALLBACK_TASKS.forEach(t => {
    assert.ok(t.estimatedMinutes > 0);
  });
});
```

- [ ] **Step 3: Run the tests to confirm they pass**

```bash
node --test src/lib/focusPlanner.test.js
```

Expected output: all tests pass. If Node version is below 18.0, upgrade Node or install Jest (`npm install --save-dev jest`) and run `npx jest src/lib/focusPlanner.test.js` instead.

- [ ] **Step 4: Commit**

```bash
git add src/lib/focusPlanner.js src/lib/focusPlanner.test.js
git commit -m "feat: add focusPlanner constants, parsers, and unit tests"
```

---

## Task 2: focusPlanner.js — buildBlueprint (Pass 1, GPT-4o)

**Files:**
- Modify: `src/lib/focusPlanner.js`

- [ ] **Step 1: Add `buildBlueprint` to focusPlanner.js**

Append this export below the existing functions:

```js
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
```

- [ ] **Step 2: Verify the function exists and exports correctly**

```bash
node -e "import('./src/lib/focusPlanner.js').then(m => console.log('buildBlueprint:', typeof m.buildBlueprint))"
```

Expected: `buildBlueprint: function`

- [ ] **Step 3: Commit**

```bash
git add src/lib/focusPlanner.js
git commit -m "feat: add buildBlueprint (GPT-4o Pass 1) to focusPlanner"
```

---

## Task 3: focusPlanner.js — synthesizeTasks, singlePassFallback, and generateFocusPlan

**Files:**
- Modify: `src/lib/focusPlanner.js`

This task adds Pass 2, the legacy fallback, and the main orchestrator that wires the full fallback chain.

- [ ] **Step 1: Add `synthesizeTasks` to focusPlanner.js**

Append below `buildBlueprint`:

```js
/**
 * Pass 2: convert a blueprint into an ordered task list.
 * Returns a parsed task array or null if GPT fails.
 * Never throws.
 */
export async function synthesizeTasks(blueprint) {
  try {
    const { min, max } = getTaskBounds(blueprint);

    const prompt = `You are an expert study coach and exam strategist.
Convert this document blueprint into an ordered study task list.

Blueprint:
${JSON.stringify(blueprint, null, 2)}

Rules:
1. Generate between ${min} and ${max} tasks — choose the count that best fits the material complexity
2. Task names must be specific and actionable. Start each name with one of: Understand / Memorise / Derive / Practice / Revise / Analyse
3. Never use generic names like "Study chapter", "Read material", or "Task 1"
4. Sequence: foundational concepts first, harder derivations and practice after, revision last
5. Place HIGH YIELD clusters early unless they require prerequisite knowledge
6. Time estimates must be varied and realistic (5–45 min per task, not all equal)
7. Use the taskType and examWeight from the matching blueprint cluster

Return ONLY a valid JSON array. No prose, no markdown fences.
[
  { "name": "Understand TCP/IP layered architecture", "estimatedMinutes": 20, "taskType": "conceptual", "examWeight": "high" },
  ...
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const tasks = parseSynthesizedTasks(raw);
    if (tasks) return tasks;

    // One retry
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: 'user',      content: prompt },
        { role: 'assistant', content: raw },
        { role: 'user',      content: 'Return ONLY the JSON array. Start with [ and end with ]. No other text.' },
      ],
    });

    const raw2 = retry.choices[0]?.message?.content?.trim() ?? '';
    return parseSynthesizedTasks(raw2); // null if still invalid
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Add `singlePassFallback` to focusPlanner.js**

Append below `synthesizeTasks`:

```js
/**
 * Legacy single-pass fallback: used when Pass 1 fails entirely.
 * Uses gpt-4o-mini directly on raw material with an uncapped task count.
 * Returns a task array or null.
 * Never throws.
 */
export async function singlePassFallback(chunkTexts) {
  try {
    const material = chunkTexts.join('\n\n---\n\n').slice(0, 60_000);

    const prompt = `You are an AI study coach. Given the following study material, generate focused study tasks.

Rules:
- Tasks must be specific to the content (not generic like "Study hard" or "Read pages")
- Start each task name with a strong verb: Understand / Memorise / Derive / Practice / Revise / Analyse
- Progress from foundational to advanced, ending with a revision task
- Estimate realistic and varied minutes per task (5–40 min each)
- Generate as many tasks as the content genuinely requires — no fixed count

Return ONLY a JSON array, no other text:
[
  { "name": "Understand [specific concept]", "estimatedMinutes": 15 },
  ...
]

Study material:
${material}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    const tasks = parseSynthesizedTasks(raw);
    if (tasks) return tasks;

    // One retry
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      temperature: 0.1,
      messages: [
        { role: 'user',      content: prompt },
        { role: 'assistant', content: raw },
        { role: 'user',      content: 'Return ONLY the JSON array. No prose, no markdown.' },
      ],
    });

    const raw2 = retry.choices[0]?.message?.content?.trim() ?? '';
    return parseSynthesizedTasks(raw2);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Add `generateFocusPlan` orchestrator with full fallback chain**

Append at the bottom of the file:

```js
/**
 * Main export. Orchestrates the full pipeline with layered fallbacks.
 *
 * Fallback chain:
 *   Pass 1 (GPT-4o blueprint)
 *     └── success → Pass 2 (GPT-4o-mini synthesis)
 *           └── success → return intelligence-rich tasks ✓
 *           └── fail    → singlePassFallback
 *                 └── success → return legacy tasks (no taskType/examWeight badges) ✓
 *                 └── fail    → return ENHANCED_FALLBACK_TASKS ✓
 *     └── fail    → singlePassFallback (same sub-chain)
 *
 * Never throws. Always returns a valid tasks array and a totalMinutes integer.
 */
export async function generateFocusPlan(chunkTexts, docName) {
  let tasks = null;
  let blueprint = null;

  // ── Attempt Pass 1 ─────────────────────────────────────────────
  blueprint = await buildBlueprint(chunkTexts, docName);

  if (blueprint) {
    // ── Attempt Pass 2 ───────────────────────────────────────────
    tasks = await synthesizeTasks(blueprint);
  }

  // ── Legacy fallback if either pass failed ─────────────────────
  if (!tasks) {
    tasks = await singlePassFallback(chunkTexts);
  }

  // ── Hard fallback: always returns something ───────────────────
  if (!tasks || tasks.length === 0) {
    tasks = ENHANCED_FALLBACK_TASKS;
  }

  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return { tasks, totalMinutes, blueprint };
}
```

- [ ] **Step 4: Run the unit tests again to confirm nothing broke**

```bash
node --test src/lib/focusPlanner.test.js
```

Expected: all tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/focusPlanner.js
git commit -m "feat: add synthesizeTasks, singlePassFallback, and generateFocusPlan orchestrator"
```

---

## Task 4: generate-focus-tasks/route.js — Integrate the planner

**Files:**
- Modify: `src/app/api/generate-focus-tasks/route.js`

Replace the entire file. The new version is thin: auth, fetch all chunks, call planner, return.

- [ ] **Step 1: Rewrite the route**

```js
// src/app/api/generate-focus-tasks/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateFocusPlan, ENHANCED_FALLBACK_TASKS } from '@/lib/focusPlanner';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    // ── Auth ────────────────────────────────────────────────────────
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ── Parse body ──────────────────────────────────────────────────
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

    // ── Verify ownership ────────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, name')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docErr || !doc) return NextResponse.json({ error: 'pdf_not_found' }, { status: 404 });

    // ── Fetch or trigger parse ──────────────────────────────────────
    let { data: chunks, error: chunkErr } = await supabase
      .from('document_chunks')
      .select('content')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (chunkErr || !chunks || chunks.length === 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const parseRes = await fetch(`${appUrl}/api/parse-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, userId: user.id }),
      });

      if (!parseRes.ok) {
        console.error('[generate-focus-tasks] PDF parsing failed:', parseRes.status);
        return NextResponse.json(
          { error: 'pdf_parse_failed', message: 'Failed to process PDF. Please try re-uploading.' },
          { status: 422 }
        );
      }

      const refetch = await supabase
        .from('document_chunks')
        .select('content')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true });

      chunks = refetch.data;

      if (!chunks || chunks.length === 0) {
        return NextResponse.json(
          { error: 'pdf_empty', message: 'This PDF has no readable text.' },
          { status: 422 }
        );
      }
    }

    // ── Generate plan (two-pass with full fallback chain) ───────────
    const chunkTexts = chunks.map(c => c.content);
    const { tasks, totalMinutes, blueprint } = await generateFocusPlan(chunkTexts, doc.name);

    return NextResponse.json({
      success: true,
      tasks,
      totalMinutes,
      documentId: doc.id,
      documentName: doc.name,
      blueprint: blueprint ?? null, // null when all AI layers fell back — frontend ignores it
    });
  } catch (err) {
    console.error('[generate-focus-tasks]', err);
    // Even a total crash returns usable fallback data
    // ENHANCED_FALLBACK_TASKS is imported statically at the top of this file
    return NextResponse.json({
      success: true,
      tasks: ENHANCED_FALLBACK_TASKS,
      totalMinutes: ENHANCED_FALLBACK_TASKS.reduce((s, t) => s + t.estimatedMinutes, 0),
      documentId: null,
      documentName: null,
      blueprint: null,
    });
  }
}
```

- [ ] **Step 2: Verify the old `parseFocusTasks` export is no longer imported anywhere**

```bash
grep -r "parseFocusTasks" src/
```

Expected: no results. If any file imports it, update those imports. (The function was only exported for testing in the old route — it is now replaced by `parseSynthesizedTasks` in `focusPlanner.js`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate-focus-tasks/route.js
git commit -m "feat: integrate focusPlanner into generate-focus-tasks route, remove chunk limit"
```

---

## Task 5: FocusAmbience.jsx — Deep Void ambient component

**Files:**
- Create: `src/components/focus/FocusAmbience.jsx`

Pure CSS ambient layers. Position is `absolute` so it works inside any `position: relative` container without escaping to the viewport. Three layers: base horizon glow (static), breathing pulse (6 s), floating accent (14 s).

- [ ] **Step 1: Create `src/components/focus/FocusAmbience.jsx`**

```jsx
'use client';

const KEYFRAMES = `
  @keyframes ambiencePulse {
    from { opacity: 0.55; }
    to   { opacity: 1.0; }
  }
  @keyframes ambienceFloat {
    from { opacity: 0.35; transform: translateY(0px); }
    to   { opacity: 0.65; transform: translateY(-18px); }
  }
`;

/**
 * Deep Void ambient background for focus session screens.
 *
 * Drop this as the FIRST CHILD of any position:relative container
 * that already has a dark background. It renders three subtle purple
 * glow layers via CSS-only animations — no JS timers, no canvas,
 * no layout impact.
 *
 * The parent container must have:  position: 'relative', overflow: 'hidden'
 */
export default function FocusAmbience() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Layer 1 — Base horizon glow (static) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 90% 55% at 50% 110%, rgba(88,28,235,0.28) 0%, transparent 70%)',
      }} />

      {/* Layer 2 — Breathing pulse (6 s cycle) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 40% at 50% 115%, rgba(139,92,246,0.22) 0%, transparent 65%)',
        animation: 'ambiencePulse 6s ease-in-out infinite alternate',
      }} />

      {/* Layer 3 — Floating accent top-right (14 s cycle) */}
      <div style={{
        position: 'absolute',
        width: '30%',
        height: '30%',
        top: '3%',
        right: '8%',
        background: 'radial-gradient(circle, rgba(67,56,202,0.10) 0%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'ambienceFloat 14s ease-in-out infinite alternate',
      }} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/focus/FocusAmbience.jsx
git commit -m "feat: add FocusAmbience Deep Void ambient component"
```

---

## Task 6: FocusSessionActive.jsx — Ambience + intelligence badges

**Files:**
- Modify: `src/components/focus/FocusSessionActive.jsx`

Four changes: (1) add `FocusAmbience` import, (2) add `position: relative, overflow: hidden` to outer div so the absolute ambience is contained, (3) add `examWeight` badge helper, (4) add `taskType` pill helper, (5) render badges on current/pending cards.

- [ ] **Step 1: Add import**

At the top of the file, after the existing imports, add:

```js
import FocusAmbience from './FocusAmbience';
```

- [ ] **Step 2: Add badge helper functions**

Add these two functions directly before the `export default function FocusSessionActive` line:

```js
const EXAM_WEIGHT_BADGE = {
  high:   { label: 'HIGH YIELD', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.40)',   color: '#ef4444' },
  medium: { label: 'MUST KNOW',  bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.30)',  color: '#f59e0b' },
};

const TASK_TYPE_PILL = {
  conceptual:   { label: 'conceptual',   bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.30)', color: '#a78bfa' },
  memorisation: { label: 'memorise',     bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.30)', color: '#f59e0b' },
  derivation:   { label: 'derivation',   bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.30)', color: '#60a5fa' },
  practice:     { label: 'practice',     bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.25)', color: '#22d3ee' },
  revision:     { label: 'revision',     bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  color: '#4ade80' },
};

function ExamWeightBadge({ examWeight }) {
  const cfg = EXAM_WEIGHT_BADGE[examWeight];
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      borderRadius: '4px',
      padding: '2px 7px',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.5px',
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

function TaskTypePill({ taskType }) {
  const cfg = TASK_TYPE_PILL[taskType];
  if (!cfg) return null;
  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      borderRadius: '4px',
      padding: '2px 7px',
      fontSize: '9px',
      fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  );
}
```

- [ ] **Step 3: Add `position: 'relative', overflow: 'hidden'` to the outer div**

Find the outer return div (currently `style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}`):

```jsx
// BEFORE:
return (
  <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
```

```jsx
// AFTER:
return (
  <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
    <FocusAmbience />
```

- [ ] **Step 4: Wrap the content (TopBar + grid) in a z-index: 1 flex container**

`position: absolute` elements with `z-index: 0` (FocusAmbience) are painted *after* in-flow content in the CSS stacking order, which means they render on top of the TopBar and grid unless the content has an explicit higher z-index. Wrap both children in a single flex div at z-index: 1.

```jsx
// BEFORE — inside the outer return div, after <FocusAmbience />:
    <TopBar title={...} />
    <div style={{ padding: `${SPACING.xl} ${SPACING.xxl}`, maxWidth: '900px', ... }}>
      {/* grid */}
    </div>

// AFTER:
    <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar title={...} />
      <div style={{ padding: `${SPACING.xl} ${SPACING.xxl}`, maxWidth: '900px', ... }}>
        {/* grid — unchanged */}
      </div>
    </div>
```

The wrapper is `flex: 1` so it fills the remaining height of the parent column, and `display: flex, flexDirection: column` preserves the existing vertical layout of TopBar + grid.

- [ ] **Step 4a: Apply the same treatment to the `timeUp` early return**

`FocusSessionActive` has an early return at the top of the component body for when `timeUp && !allDone`. It also needs `FocusAmbience` and proper z-index:

```jsx
// BEFORE:
if (timeUp && !allDone) {
  return (
    <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, padding: SPACING.xxl }}>
      <TopBar title="Time's Up" />
      <div style={{ ...panelStyle, textAlign: 'center', maxWidth: 400 }}>
        ...
      </div>
    </div>
  );
}

// AFTER:
if (timeUp && !allDone) {
  return (
    <div style={{ ...pageStyle, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <FocusAmbience />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACING.xl, padding: SPACING.xxl }}>
        <TopBar title="Time's Up" />
        <div style={{ ...panelStyle, textAlign: 'center', maxWidth: 400 }}>
          ...
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add badges to the current task card**

Find the current task card header section — it currently looks like:

```jsx
<div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px', marginBottom: SPACING.md }}>
  CURRENT
</div>
```

Replace with:

```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
  <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: 700, letterSpacing: '0.5px' }}>
    CURRENT
  </div>
  <ExamWeightBadge examWeight={currentTask.examWeight} />
</div>
```

Then find where `currentTask.name` is rendered and add the `TaskTypePill` below it. The name block currently looks like:

```jsx
<div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, lineHeight: 1.5, flex: 1 }}>
  {currentTask.name}
</div>
```

Replace with:

```jsx
<div style={{ flex: 1 }}>
  <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, lineHeight: 1.5, marginBottom: SPACING.xs }}>
    {currentTask.name}
  </div>
  <TaskTypePill taskType={currentTask.taskType} />
</div>
```

- [ ] **Step 6: Add examWeight badge to pending task cards**

Find the pending task map — each pending task renders:

```jsx
{pendingTasks.map((t) => (
  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
      ☐ {t.name}
    </div>
    {t.estimatedMinutes && (
      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, opacity: 0.6 }}>
        {t.estimatedMinutes}m
      </div>
    )}
  </div>
))}
```

Replace with:

```jsx
{pendingTasks.map((t) => (
  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${SPACING.sm} 0`, borderBottom: `1px solid ${COLORS.border.light}` }}>
    <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, flex: 1 }}>
      ☐ {t.name}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, flexShrink: 0 }}>
      <ExamWeightBadge examWeight={t.examWeight} />
      {t.estimatedMinutes && (
        <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, opacity: 0.6 }}>
          {t.estimatedMinutes}m
        </div>
      )}
    </div>
  </div>
))}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/focus/FocusSessionActive.jsx
git commit -m "feat: add FocusAmbience and examWeight/taskType badges to FocusSessionActive"
```

---

## Task 7: FocusModeLoader.jsx — Add ambience

**Files:**
- Modify: `src/components/focus/FocusModeLoader.jsx`

Single import + three style properties. The loader's outer div gains `position: relative` and `overflow: hidden`, then `<FocusAmbience />` drops in as the first child.

- [ ] **Step 1: Add import**

At the top of the file, after existing imports:

```js
import FocusAmbience from './FocusAmbience';
```

- [ ] **Step 2: Add `position` and `overflow` to the outer div and render FocusAmbience**

Find the outer `return` div (the one with `flex: 1, display: 'flex', ...`):

```jsx
// BEFORE:
return (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    boxSizing: 'border-box',
    fontFamily: TYPOGRAPHY.fontFamily,
    overflowY: 'auto',
  }}>
    <style>{KEYFRAMES}</style>
```

```jsx
// AFTER:
return (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    boxSizing: 'border-box',
    fontFamily: TYPOGRAPHY.fontFamily,
    overflowY: 'auto',
    position: 'relative',
    overflow: 'hidden',
  }}>
    <FocusAmbience />
    <style>{KEYFRAMES}</style>
```

Then add `position: 'relative'` and `zIndex: 1` to the existing card div (the `maxWidth: 420` div) so it explicitly stacks above FocusAmbience (z-index: 0):

```jsx
// BEFORE:
      <div style={{
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        animation: 'fmlFadeUp 0.5s ease both',
      }}>

// AFTER:
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        animation: 'fmlFadeUp 0.5s ease both',
      }}>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/focus/FocusModeLoader.jsx
git commit -m "feat: add FocusAmbience ambient background to FocusModeLoader"
```

---

## Task 8: End-to-end verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to `/focus` and start a session with a real PDF**

Verify:
- Loader screen shows the Deep Void purple glow in the background
- Task generation completes (may take 10–20 s for large PDFs — two AI calls now)
- Task count is NOT always 6–8 — varies by document
- Task names are specific to the document content (not "Read pages 1–12")
- The active task card shows the `examWeight` badge (HIGH YIELD / MUST KNOW) if the task has `high` or `medium` weight
- The active task card shows the `taskType` pill (conceptual / memorise / practice etc.)
- Pending task cards show the `examWeight` badge
- Done tasks show no badges (strikethrough only)
- Deep Void glow is visible in the active session background

- [ ] **Step 3: Test the fallback — temporarily break the OpenAI key**

Set `OPENAI_API_KEY=invalid` in `.env.local`, start the session, confirm:
- The loader completes (no error shown to user)
- `ENHANCED_FALLBACK_TASKS` render (5 tasks with proper badges)
- Restore the real key afterward

- [ ] **Step 4: Test session resume still works**

Start a session, refresh the page mid-session, confirm the resume card appears, and resuming restores tasks with their `taskType`/`examWeight` fields intact (they're stored in localStorage).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Focus Mode intelligence upgrade — two-pass pipeline, Deep Void UI, exam badges"
```
