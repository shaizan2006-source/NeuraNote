/**
 * Incognito session lifecycle unit tests — pure logic, no I/O.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionActive } from "../../src/lib/incognito.js";

describe("incognito sessionActive", () => {
  const now = new Date("2026-07-02T10:00:00Z");

  it("active when open and unexpired", () => {
    assert.equal(sessionActive({ closed_at: null, expires_at: "2026-07-05T00:00:00Z" }, now), true);
  });
  it("inactive when closed", () => {
    assert.equal(sessionActive({ closed_at: "2026-07-01T00:00:00Z", expires_at: "2026-07-05T00:00:00Z" }, now), false);
  });
  it("inactive when expired", () => {
    assert.equal(sessionActive({ closed_at: null, expires_at: "2026-07-01T00:00:00Z" }, now), false);
  });
  it("inactive exactly at expiry", () => {
    assert.equal(sessionActive({ closed_at: null, expires_at: "2026-07-02T10:00:00Z" }, now), false);
  });
  it("inactive for null/undefined session", () => {
    assert.equal(sessionActive(null, now), false);
    assert.equal(sessionActive(undefined, now), false);
  });
});
