// tests/unit/examUtils.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveAccuracy, generateExamStudyPlan } from "../../src/lib/examUtils.js";

describe("deriveAccuracy", () => {
  it("returns 40 for count=5 (weakest threshold)", () => {
    assert.equal(deriveAccuracy(5), 40);
  });
  it("returns 52 for count=4", () => {
    assert.equal(deriveAccuracy(4), 52);
  });
  it("caps at 0 for very high counts", () => {
    assert.equal(deriveAccuracy(10), 0);
  });
  it("caps at 59 for count=0", () => {
    assert.equal(deriveAccuracy(0), 59);
  });
});

describe("generateExamStudyPlan", () => {
  const futureDate = (days) => {
    const d = new Date(Date.now() + days * 86_400_000);
    return d.toISOString().split("T")[0];
  };

  it("returns single final-revision entry when exam is today", () => {
    const exam = { exam_date: new Date().toISOString().split("T")[0] };
    const plan = generateExamStudyPlan(exam, [{ topic: "normalization", count: 7 }], () => 0);
    assert.equal(plan.length, 1);
    assert.equal(plan[0].day, 0);
    assert.match(plan[0].action, /Final Revision/);
  });

  it("returns empty array when exam has passed", () => {
    const exam = { exam_date: "2020-01-01" };
    const plan = generateExamStudyPlan(exam, [], () => -5);
    assert.equal(plan.length, 0);
  });

  it("distributes topics across days — 4 topics, 4 days → 1 per day", () => {
    const topics = [
      { topic: "normalization", count: 8 },
      { topic: "deadlock",      count: 7 },
      { topic: "indexing",      count: 6 },
      { topic: "transactions",  count: 5 },
    ];
    const exam = { exam_date: futureDate(4) };
    const plan = generateExamStudyPlan(exam, topics, () => 4);
    assert.equal(plan.length, 4);
    assert.equal(plan[0].topics.length, 1);
    assert.equal(plan[0].topics[0].topic, "normalization");
  });

  it("caps topics per day at 3", () => {
    const topics = Array.from({ length: 9 }, (_, i) => ({ topic: `topic${i}`, count: 5 }));
    const exam = { exam_date: futureDate(2) };
    const plan = generateExamStudyPlan(exam, topics, () => 2);
    plan.forEach((day) => assert.ok(day.topics.length <= 3));
  });

  it("returns generic schedule when no weak topics", () => {
    const exam = { exam_date: futureDate(10) };
    const plan = generateExamStudyPlan(exam, [], () => 10);
    assert.ok(plan.length > 0);
    plan.forEach((day) => assert.deepEqual(day.topics, []));
  });

  it("uses Learn action for >7 days left", () => {
    const exam = { exam_date: futureDate(14) };
    const plan = generateExamStudyPlan(exam, [{ topic: "t", count: 5 }], () => 14);
    assert.match(plan[0].action, /Learn/);
  });

  it("uses Revise action for ≤3 days left", () => {
    const exam = { exam_date: futureDate(2) };
    const plan = generateExamStudyPlan(exam, [{ topic: "t", count: 5 }], () => 2);
    assert.match(plan[0].action, /Revise/);
  });
});
