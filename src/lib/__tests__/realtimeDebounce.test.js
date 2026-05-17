/**
 * createDebouncedRefetch — unit tests
 *
 * The function lives in useRealtimeProgress.js and is exported for testing.
 * It must:
 *   1. Coalesce multiple calls within `ms` into a single invocation.
 *   2. Respect the hard-cap minimum interval (minIntervalMs) between calls.
 *   3. Not call `fn` before the debounce period expires.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDebouncedRefetch } from "../realtimeDebounce.js";

// node:test doesn't support fake timers natively, so we use real setTimeout
// with tight timings (10ms debounce, 20ms hard cap) to keep tests fast.

const DEBOUNCE = 10;
const MIN_INTERVAL = 20;
const WAIT = (ms) => new Promise(res => setTimeout(res, ms));

test("createDebouncedRefetch — debounce & coalescing", async (t) => {
  await t.test("five rapid calls produce exactly one invocation", async () => {
    let callCount = 0;
    const trigger = createDebouncedRefetch(() => callCount++, DEBOUNCE, MIN_INTERVAL);

    for (let i = 0; i < 5; i++) trigger();

    await WAIT(DEBOUNCE + MIN_INTERVAL + 10);
    assert.equal(callCount, 1, `expected 1 invocation, got ${callCount}`);
  });

  await t.test("no call before debounce period", async () => {
    let callCount = 0;
    const trigger = createDebouncedRefetch(() => callCount++, DEBOUNCE, MIN_INTERVAL);
    trigger();
    // Check before debounce expires
    await WAIT(Math.floor(DEBOUNCE / 2));
    assert.equal(callCount, 0, "should not have fired yet");
    await WAIT(DEBOUNCE + MIN_INTERVAL + 10);
    assert.equal(callCount, 1, "should have fired after debounce");
  });

  await t.test("two separate bursts produce two separate invocations", async () => {
    let callCount = 0;
    const trigger = createDebouncedRefetch(() => callCount++, DEBOUNCE, MIN_INTERVAL);

    trigger();
    await WAIT(DEBOUNCE + MIN_INTERVAL + 10);
    trigger();
    await WAIT(DEBOUNCE + MIN_INTERVAL + 10);

    assert.equal(callCount, 2, `expected 2 invocations, got ${callCount}`);
  });
});
