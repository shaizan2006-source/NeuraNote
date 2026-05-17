/**
 * Realtime request-ID race-proofing — unit test
 *
 * The latest-wins pattern in useRealtimeProgress uses an incrementing
 * requestId to discard stale responses. We test the core logic here as a
 * pure function so it can run in node:test without a DOM or Supabase client.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal reproduction of the guardedRefetch race logic.
function makeRefetchRunner() {
  let latestId = 0;
  let applied  = [];

  async function guardedRefetch(fetchFn) {
    const id = ++latestId;
    const result = await fetchFn(id);
    if (id !== latestId) return; // stale — discard
    applied.push(result);
  }

  return { guardedRefetch, getApplied: () => applied, resetApplied: () => { applied = []; } };
}

const WAIT = (ms) => new Promise(res => setTimeout(res, ms));

test("latest-wins race protection", async (t) => {
  await t.test("older response arriving after newer is discarded", async () => {
    const { guardedRefetch, getApplied } = makeRefetchRunner();

    // Fire two refetches: first one takes 30ms, second takes 5ms.
    // Second should win; first should be discarded.
    const slow = guardedRefetch(() => WAIT(30).then(() => "slow-response"));
    const fast = guardedRefetch(() => WAIT(5).then(() => "fast-response"));

    await Promise.all([slow, fast]);

    const applied = getApplied();
    assert.equal(applied.length, 1, "only one response should be applied");
    assert.equal(applied[0], "fast-response", "the latest (fast) response should win");
  });

  await t.test("single refetch always applies", async () => {
    const { guardedRefetch, getApplied } = makeRefetchRunner();
    await guardedRefetch(() => Promise.resolve("only-response"));
    assert.equal(getApplied().length, 1);
    assert.equal(getApplied()[0], "only-response");
  });
});
