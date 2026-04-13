import { describe, it } from "node:test";
import assert from "node:assert/strict";

function getCellColor(score) {
  if (!score || score === 0) return "#27272a";
  if (score < 0.5) {
    const opacity = 0.35 + (score / 0.49) * 0.3;
    return `rgba(245,158,11,${opacity.toFixed(2)})`;
  }
  return "#22C55E";
}

describe("getCellColor", () => {
  it("not studied = gray", () => assert.equal(getCellColor(0), "#27272a"));
  it("null = gray", () => assert.equal(getCellColor(null), "#27272a"));
  it("score 0.25 = amber", () => assert(getCellColor(0.25).startsWith("rgba(245,158,11")));
  it("score 0.9 = green", () => assert.equal(getCellColor(0.9), "#22C55E"));
});
