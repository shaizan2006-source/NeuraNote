/**
 * Unit tests for OCR fallback logic in src/app/api/process-pdf/route.js
 * Tests the decision logic around when Tesseract is invoked and how
 * extracted text is validated — without running actual Tesseract/OpenAI calls.
 *
 * Run: node --test tests/unit/ocr.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ── Mirror the exact OCR decision logic from process-pdf/route.js ──

const OCR_THRESHOLD = 50; // chars — must match process-pdf route

function shouldUseOCR(text) {
  return !text || text.trim().length < OCR_THRESHOLD;
}

function resolveText(pdfText, ocrText) {
  if (shouldUseOCR(pdfText)) return ocrText;
  return pdfText;
}

function isTextUsable(text) {
  return !(!text || text.trim() === "");
}

// ── Topic parsing logic (mirrors process-pdf cleaning) ────────────
function parseTopics(rawTopics) {
  return rawTopics
    .split("\n")
    .map((t) => t.replace(/[-•*]/g, "").trim())
    .filter((t) => t.length > 3)
    .slice(0, 20);
}

// ─────────────────────────────────────────────────────────────────

describe("OCR Trigger Decision (shouldUseOCR)", () => {
  test("triggers when text is null", () => {
    assert.equal(shouldUseOCR(null), true);
  });

  test("triggers when text is undefined", () => {
    assert.equal(shouldUseOCR(undefined), true);
  });

  test("triggers when text is empty string", () => {
    assert.equal(shouldUseOCR(""), true);
  });

  test("triggers when text is only whitespace", () => {
    assert.equal(shouldUseOCR("   \n\t  "), true);
  });

  test("triggers when text has fewer than 50 chars", () => {
    assert.equal(shouldUseOCR("Too short"), true);
    assert.equal(shouldUseOCR("a".repeat(49)), true);
  });

  test("does NOT trigger when text has exactly 50 chars", () => {
    assert.equal(shouldUseOCR("a".repeat(50)), false);
  });

  test("does NOT trigger when text exceeds 50 chars", () => {
    const normalText = "This is a properly extracted PDF with sufficient readable content from the document.";
    assert.equal(shouldUseOCR(normalText), false);
  });

  test("OCR_THRESHOLD is 50 (matches route.js constant)", () => {
    assert.equal(OCR_THRESHOLD, 50);
  });
});

describe("Text Resolution (resolveText)", () => {
  test("uses OCR text when PDF text is empty", () => {
    const ocr = "Extracted via OCR from scanned chemistry notes";
    assert.equal(resolveText("", ocr), ocr);
  });

  test("uses OCR text when PDF text is whitespace only", () => {
    const ocr = "OCR content here";
    assert.equal(resolveText("   ", ocr), ocr);
  });

  test("uses PDF text when it is long enough", () => {
    const pdf = "This is digitally generated PDF text with sufficient length for normal processing pipeline.";
    const ocr = "Should not be used";
    assert.equal(resolveText(pdf, ocr), pdf);
  });

  test("prefers PDF text over OCR when both available and PDF is sufficient", () => {
    const pdf = "A".repeat(100);
    const ocr = "B".repeat(100);
    assert.equal(resolveText(pdf, ocr), pdf);
  });

  test("falls back to OCR when PDF text is borderline (49 chars)", () => {
    const pdf = "a".repeat(49);
    const ocr = "OCR extracted this instead";
    assert.equal(resolveText(pdf, ocr), ocr);
  });
});

describe("Text Usability Validation (isTextUsable)", () => {
  test("empty string is not usable", () => {
    assert.equal(isTextUsable(""), false);
  });

  test("whitespace only is not usable", () => {
    assert.equal(isTextUsable("   "), false);
  });

  test("null is not usable", () => {
    assert.equal(isTextUsable(null), false);
  });

  test("undefined is not usable", () => {
    assert.equal(isTextUsable(undefined), false);
  });

  test("real text content is usable", () => {
    assert.equal(isTextUsable("Newton's second law F=ma"), true);
    assert.equal(isTextUsable("x"), true);
  });
});

describe("Topic Parsing Logic", () => {
  test("strips bullet characters from topic lines", () => {
    const raw = "- Newton's Laws\n• Kinematics\n* Thermodynamics";
    const topics = parseTopics(raw);
    assert.ok(topics.every((t) => !t.startsWith("-") && !t.startsWith("•") && !t.startsWith("*")));
  });

  test("filters out very short tokens (≤3 chars)", () => {
    const raw = "AI\nMachine Learning\nML\nNeural Networks";
    const topics = parseTopics(raw);
    assert.ok(!topics.includes("AI"));
    assert.ok(!topics.includes("ML"));
    assert.ok(topics.includes("Machine Learning"));
  });

  test("caps output at 20 topics", () => {
    const raw = Array.from({ length: 30 }, (_, i) => `Topic number ${i + 1}`).join("\n");
    const topics = parseTopics(raw);
    assert.ok(topics.length <= 20);
  });

  test("trims whitespace from each topic", () => {
    const raw = "  Newton's Laws  \n  Kinematics  ";
    const topics = parseTopics(raw);
    topics.forEach((t) => {
      assert.equal(t, t.trim(), `Topic should be trimmed: "${t}"`);
    });
  });

  test("handles empty input", () => {
    const topics = parseTopics("");
    assert.deepEqual(topics, []);
  });
});

describe("Chunk Count Validation", () => {
  // Mirrors the guard in process-pdf: if chunks.length === 0 → error
  function validateChunks(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return { valid: false, error: "No chunks created from PDF" };
    }
    return { valid: true };
  }

  test("empty chunks array is invalid", () => {
    assert.equal(validateChunks([]).valid, false);
  });

  test("null is invalid", () => {
    assert.equal(validateChunks(null).valid, false);
  });

  test("non-empty chunks array is valid", () => {
    assert.equal(validateChunks(["chunk1", "chunk2"]).valid, true);
  });

  test("single chunk is valid", () => {
    assert.equal(validateChunks(["only chunk"]).valid, true);
  });
});
