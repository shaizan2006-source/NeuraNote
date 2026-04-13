import { describe, it } from "node:test";
import assert from "node:assert/strict";

function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getSubtext(mode, hour) {
  const isNight = hour >= 21 || hour < 5;
  if (mode === "progress") return "See your progress";
  return isNight ? "Studying late?" : "Ready to study?";
}

describe("getGreeting", () => {
  it("morning at 9am", () => assert.equal(getGreeting(9), "Good morning"));
  it("afternoon at 14", () => assert.equal(getGreeting(14), "Good afternoon"));
  it("evening at 19", () => assert.equal(getGreeting(19), "Good evening"));
  it("night at 23", () => assert.equal(getGreeting(23), "Good night"));
  it("night at 2am", () => assert.equal(getGreeting(2), "Good night"));
});

describe("getSubtext", () => {
  it("study mode daytime", () => assert.equal(getSubtext("study", 10), "Ready to study?"));
  it("study mode night", () => assert.equal(getSubtext("study", 23), "Studying late?"));
  it("progress mode always same", () => assert.equal(getSubtext("progress", 23), "See your progress"));
});
