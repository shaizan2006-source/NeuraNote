// src/lib/focusPlanner.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripFences,
  parseBlueprint,
  parseSynthesizedTasks,
  getTaskBounds,
  generateFocusPlan,
  ENHANCED_FALLBACK_TASKS,
  VALID_TASK_TYPES,
  VALID_EXAM_WEIGHTS,
} from './focusPlanner.js';

// ── helpers ─────────────────────────────────────────────────────────
const minCluster = (overrides = {}) => ({
  title: 'X', type: 'conceptual', examWeight: 'high', estimatedMinutes: 10, keyTerms: [],
  ...overrides,
});
const minBlueprint = (overrides = {}) => JSON.stringify({
  subject: 'Test',
  totalConcepts: 5, complexityScore: 5, examHeaviness: 5, estimatedStudyMinutes: 60,
  conceptClusters: [minCluster()],
  ...overrides,
});

// ── stripFences ──────────────────────────────────────────────────────
test('stripFences: removes json code fence', () => {
  assert.equal(stripFences('```json\n[1,2,3]\n```'), '[1,2,3]');
});
test('stripFences: removes plain code fence', () => {
  assert.equal(stripFences('```\n{"a":1}\n```'), '{"a":1}');
});
test('stripFences: passthrough when no fence', () => {
  assert.equal(stripFences('{"a":1}'), '{"a":1}');
});
test('stripFences: empty string returns empty string', () => {
  assert.equal(stripFences(''), '');
});
test('stripFences: whitespace-only returns empty string', () => {
  assert.equal(stripFences('   '), '');
});
test('stripFences: case-insensitive — uppercase JSON fence', () => {
  assert.equal(stripFences('```JSON\n[]\n```'), '[]');
});
test('stripFences: only fence with no content', () => {
  assert.equal(stripFences('```json\n```'), '');
});
test('stripFences: does not mangle content without fences', () => {
  const s = '{"key":"value with backtick ` inside"}';
  // outer fences stripped, inner backtick in value is not a fence pattern
  assert.equal(stripFences(s), s);
});

// ── parseBlueprint ───────────────────────────────────────────────────
test('parseBlueprint: returns null for empty string', () => {
  assert.equal(parseBlueprint(''), null);
});
test('parseBlueprint: returns null for invalid JSON', () => {
  assert.equal(parseBlueprint('not json at all'), null);
});
test('parseBlueprint: returns null for JSON array (not object)', () => {
  assert.equal(parseBlueprint('[{"a":1}]'), null);
});
test('parseBlueprint: returns null for JSON null', () => {
  assert.equal(parseBlueprint('null'), null);
});
test('parseBlueprint: returns null for JSON number', () => {
  assert.equal(parseBlueprint('42'), null);
});
test('parseBlueprint: returns null when conceptClusters missing', () => {
  assert.equal(parseBlueprint('{"subject":"Maths"}'), null);
});
test('parseBlueprint: returns null when conceptClusters is empty array', () => {
  assert.equal(parseBlueprint('{"conceptClusters":[]}'), null);
});
test('parseBlueprint: returns null when conceptClusters is not an array', () => {
  assert.equal(parseBlueprint('{"conceptClusters":{"title":"X"}}'), null);
});
test('parseBlueprint: parses valid blueprint and normalises fields', () => {
  const result = parseBlueprint(minBlueprint({ subject: 'Computer Networks', totalConcepts: 10, complexityScore: 7 }));
  assert.equal(result.subject, 'Computer Networks');
  assert.equal(result.totalConcepts, 10);
  assert.equal(result.complexityScore, 7);
  assert.equal(result.conceptClusters.length, 1);
});
test('parseBlueprint: strips code fences before parsing', () => {
  const inner = minBlueprint();
  assert.notEqual(parseBlueprint('```json\n' + inner + '\n```'), null);
});

// numeric field — top-level clamping
test('parseBlueprint: treats 0 as valid (clamps to min, not fallback)', () => {
  const result = parseBlueprint(minBlueprint({
    totalConcepts: 0, complexityScore: 0, examHeaviness: 0, estimatedStudyMinutes: 0,
  }));
  assert.equal(result.totalConcepts, 1);          // clamped to min, not fallback 6
  assert.equal(result.complexityScore, 1);        // clamped to min, not fallback 5
  assert.equal(result.examHeaviness, 1);          // clamped to min, not fallback 5
  assert.equal(result.estimatedStudyMinutes, 10); // clamped to min, not fallback 45
});
test('parseBlueprint: clamps complexityScore > 10 to 10', () => {
  const result = parseBlueprint(minBlueprint({ complexityScore: 999 }));
  assert.equal(result.complexityScore, 10);
});
test('parseBlueprint: clamps examHeaviness < 0 to 1', () => {
  const result = parseBlueprint(minBlueprint({ examHeaviness: -5 }));
  assert.equal(result.examHeaviness, 1);
});
test('parseBlueprint: clamps estimatedStudyMinutes < 10 to 10', () => {
  const result = parseBlueprint(minBlueprint({ estimatedStudyMinutes: 3 }));
  assert.equal(result.estimatedStudyMinutes, 10);
});
test('parseBlueprint: NaN numeric fields fall back to defaults', () => {
  const result = parseBlueprint(minBlueprint({ totalConcepts: 'abc', complexityScore: null }));
  assert.equal(result.totalConcepts, 6);   // fallback default
  assert.equal(result.complexityScore, 5); // fallback default
});
test('parseBlueprint: missing subject falls back to Unknown subject', () => {
  const result = parseBlueprint(minBlueprint({ subject: undefined }));
  assert.equal(result.subject, 'Unknown subject');
});
test('parseBlueprint: null subject falls back to Unknown subject', () => {
  const result = parseBlueprint(minBlueprint({ subject: null }));
  assert.equal(result.subject, 'Unknown subject');
});

// cluster-level clamping
test('parseBlueprint: cluster estimatedMinutes=0 clamps to 5 (not fallback 15)', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ estimatedMinutes: 0 })],
  }));
  assert.equal(result.conceptClusters[0].estimatedMinutes, 5);
});
test('parseBlueprint: cluster estimatedMinutes=-1 clamps to 5', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ estimatedMinutes: -1 })],
  }));
  assert.equal(result.conceptClusters[0].estimatedMinutes, 5);
});
test('parseBlueprint: cluster estimatedMinutes=100 clamps to 60', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ estimatedMinutes: 100 })],
  }));
  assert.equal(result.conceptClusters[0].estimatedMinutes, 60);
});
test('parseBlueprint: cluster missing estimatedMinutes defaults to 15', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ estimatedMinutes: undefined })],
  }));
  assert.equal(result.conceptClusters[0].estimatedMinutes, 15);
});
test('parseBlueprint: cluster null estimatedMinutes defaults to 15', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ estimatedMinutes: null })],
  }));
  assert.equal(result.conceptClusters[0].estimatedMinutes, 15);
});
test('parseBlueprint: cluster string estimatedMinutes parses correctly', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ estimatedMinutes: '25' })],
  }));
  assert.equal(result.conceptClusters[0].estimatedMinutes, 25);
});
test('parseBlueprint: normalises unknown cluster type to conceptual', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ type: 'UNKNOWN_TYPE' })],
  }));
  assert.equal(result.conceptClusters[0].type, 'conceptual');
});
test('parseBlueprint: normalises unknown cluster examWeight to standard', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ examWeight: 'INVALID' })],
  }));
  assert.equal(result.conceptClusters[0].examWeight, 'standard');
});
test('parseBlueprint: cluster null title falls back to Topic N', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ title: null })],
  }));
  assert.equal(result.conceptClusters[0].title, 'Topic 1');
});
test('parseBlueprint: cluster non-array keyTerms defaults to []', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ keyTerms: 'not an array' })],
  }));
  assert.deepEqual(result.conceptClusters[0].keyTerms, []);
});
test('parseBlueprint: cluster null keyTerms defaults to []', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [minCluster({ keyTerms: null })],
  }));
  assert.deepEqual(result.conceptClusters[0].keyTerms, []);
});
test('parseBlueprint: accepts all valid task types in clusters', () => {
  VALID_TASK_TYPES.forEach(type => {
    const result = parseBlueprint(minBlueprint({
      conceptClusters: [minCluster({ type })],
    }));
    assert.equal(result.conceptClusters[0].type, type);
  });
});
test('parseBlueprint: accepts all valid exam weights in clusters', () => {
  VALID_EXAM_WEIGHTS.forEach(examWeight => {
    const result = parseBlueprint(minBlueprint({
      conceptClusters: [minCluster({ examWeight })],
    }));
    assert.equal(result.conceptClusters[0].examWeight, examWeight);
  });
});
test('parseBlueprint: handles multiple clusters correctly', () => {
  const result = parseBlueprint(minBlueprint({
    conceptClusters: [
      minCluster({ title: 'A', type: 'conceptual' }),
      minCluster({ title: 'B', type: 'revision' }),
      minCluster({ title: 'C', type: 'practice' }),
    ],
  }));
  assert.equal(result.conceptClusters.length, 3);
  assert.equal(result.conceptClusters[1].title, 'B');
  assert.equal(result.conceptClusters[2].type, 'practice');
});

// ── parseSynthesizedTasks ────────────────────────────────────────────
test('parseSynthesizedTasks: returns null for empty array', () => {
  assert.equal(parseSynthesizedTasks('[]'), null);
});
test('parseSynthesizedTasks: returns null for invalid JSON', () => {
  assert.equal(parseSynthesizedTasks('bad'), null);
});
test('parseSynthesizedTasks: returns null for non-array', () => {
  assert.equal(parseSynthesizedTasks('{"name":"x"}'), null);
});
test('parseSynthesizedTasks: returns null for JSON null', () => {
  assert.equal(parseSynthesizedTasks('null'), null);
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
});
test('parseSynthesizedTasks: single task array returns array of length 1', () => {
  const input = JSON.stringify([
    { name: 'Understand OSI', estimatedMinutes: 15, taskType: 'conceptual', examWeight: 'high' },
  ]);
  const result = parseSynthesizedTasks(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 't1');
});
test('parseSynthesizedTasks: clamps estimatedMinutes > 60 to 60', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 999, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 60);
});
test('parseSynthesizedTasks: clamps estimatedMinutes < 5 to 5', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 1, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 5);
});
test('parseSynthesizedTasks: estimatedMinutes=0 clamps to 5 (not fallback 15)', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 0, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 5);
});
test('parseSynthesizedTasks: estimatedMinutes=-10 clamps to 5', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: -10, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 5);
});
test('parseSynthesizedTasks: missing estimatedMinutes defaults to 15', () => {
  const input = JSON.stringify([{ name: 'Task', taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 15);
});
test('parseSynthesizedTasks: null estimatedMinutes defaults to 15', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: null, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 15);
});
test('parseSynthesizedTasks: string estimatedMinutes parses correctly', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: '25', taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].estimatedMinutes, 25);
});
test('parseSynthesizedTasks: null name defaults to Study task', () => {
  const input = JSON.stringify([{ name: null, estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].name, 'Study task');
});
test('parseSynthesizedTasks: missing name defaults to Study task', () => {
  const input = JSON.stringify([{ estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].name, 'Study task');
});
test('parseSynthesizedTasks: number name is stringified', () => {
  const input = JSON.stringify([{ name: 42, estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].name, '42');
});
test('parseSynthesizedTasks: empty object task uses all defaults', () => {
  const result = parseSynthesizedTasks(JSON.stringify([{}]));
  assert.equal(result[0].name, 'Study task');
  assert.equal(result[0].estimatedMinutes, 15);
  assert.equal(result[0].taskType, 'conceptual');
  assert.equal(result[0].examWeight, 'standard');
  assert.equal(result[0].id, 't1');
});
test('parseSynthesizedTasks: normalises unknown taskType to conceptual', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'INVALID', examWeight: 'high' }]);
  assert.equal(parseSynthesizedTasks(input)[0].taskType, 'conceptual');
});
test('parseSynthesizedTasks: normalises unknown examWeight to standard', () => {
  const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'INVALID' }]);
  assert.equal(parseSynthesizedTasks(input)[0].examWeight, 'standard');
});
test('parseSynthesizedTasks: accepts all valid taskTypes', () => {
  VALID_TASK_TYPES.forEach(taskType => {
    const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType, examWeight: 'high' }]);
    assert.equal(parseSynthesizedTasks(input)[0].taskType, taskType);
  });
});
test('parseSynthesizedTasks: accepts all valid examWeights', () => {
  VALID_EXAM_WEIGHTS.forEach(examWeight => {
    const input = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'conceptual', examWeight }]);
    assert.equal(parseSynthesizedTasks(input)[0].examWeight, examWeight);
  });
});
test('parseSynthesizedTasks: strips code fences', () => {
  const inner = JSON.stringify([{ name: 'Task', estimatedMinutes: 10, taskType: 'conceptual', examWeight: 'high' }]);
  assert.notEqual(parseSynthesizedTasks('```json\n' + inner + '\n```'), null);
});

// ── getTaskBounds ────────────────────────────────────────────────────
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
test('getTaskBounds: complexityScore exactly 8 triggers +3', () => {
  const withBonus   = getTaskBounds({ totalConcepts: 10, complexityScore: 8, examHeaviness: 1 });
  const withoutBonus = getTaskBounds({ totalConcepts: 10, complexityScore: 7, examHeaviness: 1 });
  assert.equal(withBonus.max - withoutBonus.max, 3);
});
test('getTaskBounds: complexityScore 7 does NOT trigger +3', () => {
  const { max: max7 } = getTaskBounds({ totalConcepts: 5, complexityScore: 7, examHeaviness: 1 });
  const { max: max8 } = getTaskBounds({ totalConcepts: 5, complexityScore: 8, examHeaviness: 1 });
  assert.ok(max8 > max7);
});
test('getTaskBounds: examHeaviness exactly 8 triggers +2', () => {
  const withBonus    = getTaskBounds({ totalConcepts: 10, complexityScore: 1, examHeaviness: 8 });
  const withoutBonus = getTaskBounds({ totalConcepts: 10, complexityScore: 1, examHeaviness: 7 });
  assert.equal(withBonus.max - withoutBonus.max, 2);
});
test('getTaskBounds: examHeaviness 7 does NOT trigger +2', () => {
  const { max: max7 } = getTaskBounds({ totalConcepts: 5, complexityScore: 1, examHeaviness: 7 });
  const { max: max8 } = getTaskBounds({ totalConcepts: 5, complexityScore: 1, examHeaviness: 8 });
  assert.ok(max8 > max7);
});
test('getTaskBounds: both scores at 8 add exactly 5', () => {
  const withBoth    = getTaskBounds({ totalConcepts: 10, complexityScore: 8, examHeaviness: 8 });
  const withNeither = getTaskBounds({ totalConcepts: 10, complexityScore: 1, examHeaviness: 1 });
  assert.equal(withBoth.max - withNeither.max, 5);
});
test('getTaskBounds: totalConcepts 4 at boundary — base = 4', () => {
  const { min, max } = getTaskBounds({ totalConcepts: 4, complexityScore: 1, examHeaviness: 1 });
  assert.equal(min, 4); // max(4-2, 4) = 4
  assert.equal(max, 8); // min(4+4, 25) = 8
});
test('getTaskBounds: totalConcepts 20 is clamped before bonus', () => {
  const { max } = getTaskBounds({ totalConcepts: 20, complexityScore: 1, examHeaviness: 1 });
  assert.equal(max, 24); // min(20+4, 25) = 24
});
test('getTaskBounds: totalConcepts 21 clamped to 20 (same as 20)', () => {
  const bounds20 = getTaskBounds({ totalConcepts: 20, complexityScore: 1, examHeaviness: 1 });
  const bounds21 = getTaskBounds({ totalConcepts: 21, complexityScore: 1, examHeaviness: 1 });
  assert.equal(bounds20.max, bounds21.max);
  assert.equal(bounds20.min, bounds21.min);
});
test('getTaskBounds: max never exceeds 25', () => {
  const { max } = getTaskBounds({ totalConcepts: 100, complexityScore: 10, examHeaviness: 10 });
  assert.equal(max, 25);
});

// ── ENHANCED_FALLBACK_TASKS ──────────────────────────────────────────
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
  ENHANCED_FALLBACK_TASKS.forEach(t => assert.ok(t.estimatedMinutes > 0));
});
test('ENHANCED_FALLBACK_TASKS: has exactly 5 tasks', () => {
  assert.equal(ENHANCED_FALLBACK_TASKS.length, 5);
});
test('ENHANCED_FALLBACK_TASKS: ids are t1 through t5', () => {
  assert.deepEqual(ENHANCED_FALLBACK_TASKS.map(t => t.id), ['t1','t2','t3','t4','t5']);
});
test('ENHANCED_FALLBACK_TASKS: total minutes equals 65', () => {
  const total = ENHANCED_FALLBACK_TASKS.reduce((s, t) => s + t.estimatedMinutes, 0);
  assert.equal(total, 65);
});
test('ENHANCED_FALLBACK_TASKS: mutation of a copy does not affect original', () => {
  const copy = ENHANCED_FALLBACK_TASKS.map(t => ({ ...t }));
  copy[0].name = 'MUTATED';
  assert.notEqual(ENHANCED_FALLBACK_TASKS[0].name, 'MUTATED');
});

// ── generateFocusPlan — fallback chain (no real API key) ─────────────
// When OPENAI_API_KEY is absent, all three AI layers catch their errors
// and return null, so generateFocusPlan must return ENHANCED_FALLBACK_TASKS.
test('generateFocusPlan: always returns valid shape even when all AI fails', async () => {
  const result = await generateFocusPlan(['some study text'], 'test.pdf');
  assert.ok(result && typeof result === 'object', 'result is object');
  assert.ok(Array.isArray(result.tasks), 'tasks is array');
  assert.ok(result.tasks.length > 0, 'tasks is non-empty');
  assert.ok(typeof result.totalMinutes === 'number', 'totalMinutes is number');
  assert.ok(result.totalMinutes > 0, 'totalMinutes > 0');
  assert.ok('blueprint' in result, 'blueprint key present');
}, { timeout: 10_000 });

test('generateFocusPlan: returned tasks all have required fields', async () => {
  const { tasks } = await generateFocusPlan(['study material'], 'doc.pdf');
  tasks.forEach((t, i) => {
    assert.ok(typeof t.name === 'string'  && t.name.length > 0, `task ${i} has name`);
    assert.ok(typeof t.id   === 'string'  && t.id.length > 0,   `task ${i} has id`);
    assert.ok(typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0, `task ${i} has estimatedMinutes`);
    assert.ok(VALID_TASK_TYPES.includes(t.taskType),   `task ${i} taskType valid`);
    assert.ok(VALID_EXAM_WEIGHTS.includes(t.examWeight), `task ${i} examWeight valid`);
  });
}, { timeout: 10_000 });

test('generateFocusPlan: totalMinutes equals sum of task estimatedMinutes', async () => {
  const { tasks, totalMinutes } = await generateFocusPlan(['text'], 'doc.pdf');
  const sum = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  assert.equal(totalMinutes, sum);
}, { timeout: 10_000 });

test('generateFocusPlan: does not throw on empty chunks array', async () => {
  const result = await generateFocusPlan([], 'empty.pdf');
  assert.ok(result.tasks.length > 0);
}, { timeout: 10_000 });

test('generateFocusPlan: does not throw on very long docName', async () => {
  const longName = 'A'.repeat(10_000);
  const result = await generateFocusPlan(['text'], longName);
  assert.ok(result.tasks.length > 0);
}, { timeout: 10_000 });
