import { describe, it } from "node:test";
import assert from "node:assert/strict";

// These are the exact functions the component will use internally.
// Defined here for isolation — no DOM, no React.

function lerpToward(current, target, factor) {
  return current + (target - current) * factor;
}

function isSettled(current, target, threshold = 0.1) {
  return Math.abs(target - current) <= threshold;
}

describe("lerpToward", () => {
  it("moves toward target by factor", () =>
    assert.equal(lerpToward(0, 100, 0.1), 10));

  it("returns unchanged value when already at target", () =>
    assert.equal(lerpToward(100, 100, 0.1), 100));

  it("produces correct step with LERP=0.06 from rest", () => {
    const result = lerpToward(0, 1000, 0.06);
    assert.ok(Math.abs(result - 60) < 0.001, `expected ~60, got ${result}`);
  });

  it("never overshoots target over many iterations", () => {
    let v = 0;
    for (let i = 0; i < 500; i++) v = lerpToward(v, 100, 0.06);
    assert.ok(v <= 100, `overshot: ${v}`);
    assert.ok(v > 99.9, `never converged: ${v}`);
  });

  it("works backwards (scrolling up from mid-page)", () => {
    const result = lerpToward(500, 200, 0.06);
    assert.ok(result < 500, "should move toward smaller target");
    assert.ok(result > 200, "should not overshoot target");
  });
});

describe("isSettled", () => {
  it("returns true when delta is less than threshold", () =>
    assert.equal(isSettled(99.95, 100, 0.1), true));

  it("returns false when delta exceeds threshold", () =>
    assert.equal(isSettled(99.8, 100, 0.1), false));

  it("returns true when exactly equal", () =>
    assert.equal(isSettled(100, 100, 0.1), true));

  it("returns true at exact threshold boundary", () =>
    assert.equal(isSettled(99.9, 100, 0.1), true));

  it("returns false just past threshold", () =>
    assert.equal(isSettled(99.89, 100, 0.1), false));
});
