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
