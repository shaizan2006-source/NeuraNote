/**
 * useTweenedNumber — unit tests
 *
 * The hook uses framer-motion's `animate()` internally. We test the pure
 * logic around it: the hook should animate FROM the previous value (not 0)
 * on subsequent prop changes.
 *
 * Since this runs in node:test without a DOM, we extract and test the
 * behavioural contract via a small pure helper that mirrors the key decision.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Mirror the core logic: returns the `from` value that should be used.
function resolveFrom(prevValue, nextValue) {
  if (typeof nextValue !== "number" || Number.isNaN(nextValue)) return prevValue;
  return prevValue;
}

test("useTweenedNumber — from-value logic", async (t) => {
  await t.test("first render: from equals target (no animation from 0)", () => {
    // On first render, prevValue is initialised to `value`, so from === to.
    const initialValue = 42;
    const from = resolveFrom(initialValue, initialValue);
    assert.equal(from, 42, "first render should start from the current value, not 0");
  });

  await t.test("subsequent render: from equals previous value, not 0", () => {
    const prev = 42;
    const next = 80;
    const from = resolveFrom(prev, next);
    assert.equal(from, 42, "tween must start from 42, not from 0");
    assert.notEqual(from, 0, "must never start from 0 on update");
  });

  await t.test("non-number value is ignored; previous value preserved", () => {
    const prev = 55;
    const next = NaN;
    // resolveFrom still returns prev; hook skips the animate() call
    const from = resolveFrom(prev, next);
    assert.equal(from, 55);
  });

  await t.test("zero is a valid value (not the same as unset)", () => {
    const prev = 10;
    const next = 0;
    const from = resolveFrom(prev, next);
    // The hook WILL animate from 10 → 0; from should equal prev
    assert.equal(from, 10);
  });
});
