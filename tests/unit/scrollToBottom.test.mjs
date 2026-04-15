import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Pure version of the isNearBottom logic (extracted for testing)
function isNearBottom(scrollHeight, scrollTop, clientHeight, threshold = 200) {
  return scrollHeight - scrollTop - clientHeight < threshold;
}

describe("isNearBottom", () => {
  it("returns true when at exact bottom", () =>
    assert.equal(isNearBottom(1000, 900, 100), true));

  it("returns true when within threshold (100px from bottom)", () =>
    assert.equal(isNearBottom(1000, 800, 100), true));

  it("returns true when at threshold boundary (199px from bottom)", () =>
    assert.equal(isNearBottom(1000, 701, 100), true));

  it("returns false when beyond threshold (200px from bottom)", () =>
    assert.equal(isNearBottom(1000, 700, 100), false));

  it("returns false when far from bottom (500px from bottom)", () =>
    assert.equal(isNearBottom(1000, 400, 100), false));

  it("returns true when content is shorter than viewport (no scroll needed)", () =>
    assert.equal(isNearBottom(400, 0, 600), true));
});
