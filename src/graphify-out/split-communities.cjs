const fs = require("fs");
const path = require("path");

const graph = JSON.parse(
  fs.readFileSync(path.join(__dirname, "graph.json"), "utf-8")
);

// Community names from the report
const COMMUNITY_NAMES = {
  0: "dashboard-ui-state",
  1: "ai-chat-query-pipeline",
  2: "ui-component-library",
  3: "design-system-generator",
  4: "bm25-search-core",
  5: "ux-pro-max-cli-docs",
  6: "answer-display-components",
  7: "data-sync-scripts",
  8: "plan-limits-quotas",
  9: "template-generation",
  10: "github-release-integration",
  11: "answer-templates-badges",
  12: "auth-rate-limiting",
  13: "markdown-processing",
  14: "extract-utilities",
  15: "query-classifier",
  16: "brain-mastery-section",
  17: "cli-init-command",
  18: "layout-components",
  19: "answer-rating",
  20: "dynamic-follow-ups",
  21: "session-callout",
  22: "ask-with-download",
  23: "cli-uninstall",
  24: "ai-type-detection",
  25: "dev-proxy",
  26: "ai-suggestion-card",
  27: "ask-input",
  28: "brain-card",
  29: "app-layout",
  30: "right-panel",
  31: "sidebar",
  32: "text-chunking",
  33: "export-intent-detection",
  34: "topic-detection",
  35: "domain-prompt-index",
  36: "cli-update-command",
  37: "cli-versions-command",
  38: "supabase-client",
  39: "supabase-server",
  40: "base-prompt",
  41: "biology-domain",
  42: "business-domain",
  43: "chemistry-domain",
  44: "cs-domain",
  45: "electrical-domain",
  46: "finance-domain",
  47: "general-domain",
  48: "law-domain",
  49: "mechanical-domain",
  50: "medical-domain",
  51: "physics-domain",
  52: "cli-logger",
  53: "claude-md-config",
};

// Build node lookup by id -> community
const nodeById = {};
for (const node of graph.nodes) {
  nodeById[node.id] = node;
}

// Group nodes by community
const communityNodes = {};
for (const node of graph.nodes) {
  const c = node.community;
  if (!communityNodes[c]) communityNodes[c] = [];
  communityNodes[c].push(node);
}

// Group edges by community (edge belongs to community if both endpoints share it,
// or to both communities if cross-community)
const communityEdges = {};
for (const link of graph.links) {
  const srcNode = nodeById[link.source];
  const tgtNode = nodeById[link.target];
  if (!srcNode || !tgtNode) continue;

  const srcC = srcNode.community;
  const tgtC = tgtNode.community;

  // Add to source community
  if (!communityEdges[srcC]) communityEdges[srcC] = [];
  communityEdges[srcC].push(link);

  // If cross-community, also add to target community
  if (srcC !== tgtC) {
    if (!communityEdges[tgtC]) communityEdges[tgtC] = [];
    communityEdges[tgtC].push(link);
  }
}

// Write per-community files
const outDir = path.join(__dirname, "communities");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const index = [];

for (const [cId, cName] of Object.entries(COMMUNITY_NAMES)) {
  const nodes = communityNodes[cId] || [];
  const edges = communityEdges[cId] || [];

  if (nodes.length === 0 && edges.length === 0) continue;

  const filename = `c${cId}-${cName}.json`;
  const data = { community: Number(cId), name: cName, nodes, edges };

  fs.writeFileSync(
    path.join(outDir, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );

  const sizeKB = (
    Buffer.byteLength(JSON.stringify(data), "utf-8") / 1024
  ).toFixed(1);
  index.push({ id: Number(cId), name: cName, filename, nodes: nodes.length, edges: edges.length, sizeKB });
}

// Write a lightweight index file
const indexData = index.map((e) => `- **${e.id}: ${e.name}** (${e.nodes} nodes, ${e.edges} edges, ${e.sizeKB}KB) → \`communities/${e.filename}\``).join("\n");

const indexMd = `# Community Index

Quick lookup: find the relevant community, then read only that file.

${indexData}

## How to use
1. Read this index to identify which community covers your topic
2. Read only the relevant \`communities/cN-name.json\` file(s)
3. Use \`source_file\` fields in nodes/edges to find exact code locations
`;

fs.writeFileSync(path.join(__dirname, "COMMUNITY_INDEX.md"), indexMd, "utf-8");

console.log(`Wrote ${index.length} community files to ${outDir}/`);
console.log(`Wrote COMMUNITY_INDEX.md`);
