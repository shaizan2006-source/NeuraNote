import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Test the RAG threshold logic in isolation
const RAG_THRESHOLD = 0.75;

function filterChunksByThreshold(chunks, threshold) {
  return chunks.filter(c => (c.similarity ?? 1) >= threshold);
}

describe("quick-chat RAG threshold", () => {
  it("includes chunks above threshold", () => {
    const chunks = [{ content: "A", similarity: 0.9 }, { content: "B", similarity: 0.6 }];
    assert.deepEqual(filterChunksByThreshold(chunks, RAG_THRESHOLD), [{ content: "A", similarity: 0.9 }]);
  });

  it("returns empty array when all below threshold", () => {
    const chunks = [{ content: "A", similarity: 0.5 }];
    assert.deepEqual(filterChunksByThreshold(chunks, RAG_THRESHOLD), []);
  });

  it("includes chunk exactly at threshold", () => {
    const chunks = [{ content: "A", similarity: 0.75 }];
    assert.equal(filterChunksByThreshold(chunks, RAG_THRESHOLD).length, 1);
  });
});
