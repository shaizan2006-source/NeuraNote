/**
 * Support ticket validation unit tests — pure logic, no I/O.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeCategory, validScreenshotPath } from "../../src/lib/supportValidation.js";

describe("support validation", () => {
  it("maps legacy UI subjects to categories", () => {
    assert.equal(normalizeCategory("Bug report"), "bug");
    assert.equal(normalizeCategory("Billing question"), "billing");
    assert.equal(normalizeCategory("Feature idea"), "feature_request");
    assert.equal(normalizeCategory("account"), "account");
    assert.equal(normalizeCategory("anything else"), "other");
    assert.equal(normalizeCategory(undefined), "other");
    assert.equal(normalizeCategory(42), "other");
  });

  it("accepts canonical categories directly", () => {
    for (const c of ["billing", "bug", "feature_request", "account", "other"]) {
      assert.equal(normalizeCategory(c), c);
    }
  });

  it("accepts only own-folder storage paths for screenshots", () => {
    const uid = "11111111-1111-1111-1111-111111111111";
    assert.equal(validScreenshotPath(`${uid}/x.png`, uid), true);
    assert.equal(validScreenshotPath(`${uid}/1719900000.webp`, uid), true);
    assert.equal(validScreenshotPath("other/x.png", uid), false);
    assert.equal(validScreenshotPath(`${uid}/../sneak.png`, uid), false);
    assert.equal(validScreenshotPath("https://evil.example/x.png", uid), false);
    assert.equal(validScreenshotPath(null, uid), false);
    assert.equal(validScreenshotPath(`${uid}/${"x".repeat(300)}.png`, uid), false);
  });
});
