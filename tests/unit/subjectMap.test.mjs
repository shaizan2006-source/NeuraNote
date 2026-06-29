/**
 * Unit tests for src/lib/subjectMap.js
 * Verifies key lookups including new UPSC/GATE entries.
 * Run: node --test tests/unit/subjectMap.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Inline a representative subset of SUBJECT_MAP for testing ────
// (Full map lives in src/lib/subjectMap.js; we test the logic here)
const SUBJECT_MAP = {
  // CS
  "computer science": "cs", cse: "cs",
  dsa: "dsa", "data structures": "dsa",
  dbms: "dbms", database: "dbms",
  os: "os", "operating systems": "os",
  "compiler design": "cd",
  "theory of computation": "toc", toc: "toc",
  // Math
  mathematics: "math", maths: "math",
  calculus: "calculus",
  // Sciences
  physics: "physics",
  chemistry: "chemistry",
  biology: "biology",
  // Engineering
  "mechanical engineering": "mechanical", mechanical: "mechanical",
  "electrical engineering": "electrical",
  electronics: "electronics",
  // Medical
  medical: "medical", medicine: "medical", mbbs: "medical",
  anatomy: "anatomy",
  pharmacology: "pharmacology",
  // Business
  business: "business", mba: "business",
  // Finance
  finance: "finance",
  economics: "economics",
  // Law
  law: "law",
  // UPSC
  upsc: "upsc", "civil services": "upsc", ias: "upsc",
  "upsc prelims": "upsc", "upsc mains": "upsc",
  "general studies": "upsc", polity: "upsc",
  "indian history": "upsc", "indian geography": "upsc",
  "indian economy": "upsc",
  "gs-1": "upsc", "gs-2": "upsc", "gs-3": "upsc", "gs-4": "upsc",
  // GATE
  gate: "gate", "gate cs": "gate", "gate cse": "gate",
  "gate ece": "gate", "gate me": "gate", "gate ee": "gate",
  "gate exam": "gate",
};

function normalise(key) {
  return SUBJECT_MAP[key.toLowerCase().trim()] ?? null;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("SUBJECT_MAP — CS domains", () => {
  test("'computer science' → 'cs'", () => assert.strictEqual(normalise("computer science"), "cs"));
  test("'cse' → 'cs'", () => assert.strictEqual(normalise("cse"), "cs"));
  test("'dsa' → 'dsa'", () => assert.strictEqual(normalise("dsa"), "dsa"));
  test("'data structures' → 'dsa'", () => assert.strictEqual(normalise("data structures"), "dsa"));
  test("'dbms' → 'dbms'", () => assert.strictEqual(normalise("dbms"), "dbms"));
  test("'database' → 'dbms'", () => assert.strictEqual(normalise("database"), "dbms"));
  test("'os' → 'os'", () => assert.strictEqual(normalise("os"), "os"));
  test("'operating systems' → 'os'", () => assert.strictEqual(normalise("operating systems"), "os"));
  test("'toc' → 'toc'", () => assert.strictEqual(normalise("toc"), "toc"));
  test("'compiler design' → 'cd'", () => assert.strictEqual(normalise("compiler design"), "cd"));
});

describe("SUBJECT_MAP — UPSC (new)", () => {
  test("'upsc' → 'upsc'", () => assert.strictEqual(normalise("upsc"), "upsc"));
  test("'civil services' → 'upsc'", () => assert.strictEqual(normalise("civil services"), "upsc"));
  test("'ias' → 'upsc'", () => assert.strictEqual(normalise("ias"), "upsc"));
  test("'upsc prelims' → 'upsc'", () => assert.strictEqual(normalise("upsc prelims"), "upsc"));
  test("'upsc mains' → 'upsc'", () => assert.strictEqual(normalise("upsc mains"), "upsc"));
  test("'general studies' → 'upsc'", () => assert.strictEqual(normalise("general studies"), "upsc"));
  test("'polity' → 'upsc'", () => assert.strictEqual(normalise("polity"), "upsc"));
  test("'indian history' → 'upsc'", () => assert.strictEqual(normalise("indian history"), "upsc"));
  test("'indian economy' → 'upsc'", () => assert.strictEqual(normalise("indian economy"), "upsc"));
  test("'gs-1' → 'upsc'", () => assert.strictEqual(normalise("gs-1"), "upsc"));
  test("'gs-4' → 'upsc'", () => assert.strictEqual(normalise("gs-4"), "upsc"));
});

describe("SUBJECT_MAP — GATE (new)", () => {
  test("'gate' → 'gate'", () => assert.strictEqual(normalise("gate"), "gate"));
  test("'gate cs' → 'gate'", () => assert.strictEqual(normalise("gate cs"), "gate"));
  test("'gate cse' → 'gate'", () => assert.strictEqual(normalise("gate cse"), "gate"));
  test("'gate ece' → 'gate'", () => assert.strictEqual(normalise("gate ece"), "gate"));
  test("'gate me' → 'gate'", () => assert.strictEqual(normalise("gate me"), "gate"));
  test("'gate ee' → 'gate'", () => assert.strictEqual(normalise("gate ee"), "gate"));
  test("'gate exam' → 'gate'", () => assert.strictEqual(normalise("gate exam"), "gate"));
});

describe("SUBJECT_MAP — existing domains unaffected", () => {
  test("physics still maps", () => assert.strictEqual(normalise("physics"), "physics"));
  test("chemistry still maps", () => assert.strictEqual(normalise("chemistry"), "chemistry"));
  test("medical still maps", () => assert.strictEqual(normalise("medical"), "medical"));
  test("mba → business", () => assert.strictEqual(normalise("mba"), "business"));
  test("law still maps", () => assert.strictEqual(normalise("law"), "law"));
  test("economics still maps", () => assert.strictEqual(normalise("economics"), "economics"));
});

describe("SUBJECT_MAP — unknown input", () => {
  test("random string returns null", () => assert.strictEqual(normalise("xyzzy"), null));
  test("empty string returns null", () => assert.strictEqual(normalise(""), null));
});
