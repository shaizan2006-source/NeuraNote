// =====================================================================
// topicClusters.js — semantic weak-topic clustering using pgvector.
//
// Why this exists:
//   mastery_topics gives us per-topic scores, but many topics are closely
//   related (e.g. "Heat Transfer", "Thermodynamics", "Carnot Cycle").
//   Grouping them semantically surfaces richer insight than a flat list.
//
// Algorithm:
//   1. Filter weak topics (mastery_score < WEAK_THRESHOLD).
//   2. Embed all their names in one OpenAI batch call (~$0.00002 per run).
//   3. Greedy cosine clustering: first unassigned topic seeds a cluster;
//      any remaining topic with cosine sim > CLUSTER_THRESHOLD joins it.
//   4. Return clusters sorted worst-first so the dashboard highlights
//      the biggest knowledge gaps at the top.
// =====================================================================

const WEAK_THRESHOLD    = 50;    // mastery_score < this → weak
const CLUSTER_THRESHOLD = 0.72;  // cosine similarity cutoff for clustering
const MAX_TOPICS        = 30;    // embed at most this many weak topics per call

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * computeWeakTopicClusters
 *
 * @param {Array}  masteryTopics   Rows from mastery_topics table.
 * @param {object} openai          OpenAI SDK client instance.
 * @returns {Promise<Array>}       Clusters sorted by avgScore asc (worst first).
 *
 * Each cluster: { label, topics: [{topic, mastery_score, subject}], avgScore, subject }
 */
export async function computeWeakTopicClusters(masteryTopics, openai) {
  const weak = masteryTopics
    .filter(t => (t.mastery_score || 0) < WEAK_THRESHOLD)
    .slice(0, MAX_TOPICS);

  if (weak.length === 0) return [];

  // Embed all weak topic names in one batch.
  let vectors;
  try {
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: weak.map(t => t.topic),
    });
    // OpenAI returns embeddings in the same order as input.
    vectors = res.data.map(d => d.embedding);
  } catch (err) {
    console.error("[topicClusters] embedding failed:", err?.message);
    // Fallback: return each weak topic as its own single-item cluster.
    return weak.map(t => ({
      label:    t.topic,
      topics:   [t],
      avgScore: t.mastery_score || 0,
      subject:  t.subject || null,
    })).sort((a, b) => a.avgScore - b.avgScore);
  }

  // Greedy clustering.
  const assigned = new Set();
  const clusters = [];

  for (let i = 0; i < weak.length; i++) {
    if (assigned.has(i)) continue;
    assigned.add(i);
    const members = [i];

    for (let j = i + 1; j < weak.length; j++) {
      if (assigned.has(j)) continue;
      if (cosineSim(vectors[i], vectors[j]) >= CLUSTER_THRESHOLD) {
        assigned.add(j);
        members.push(j);
      }
    }

    const memberTopics = members.map(k => weak[k]);
    const avgScore = Math.round(
      memberTopics.reduce((s, t) => s + (t.mastery_score || 0), 0) / memberTopics.length
    );

    clusters.push({
      label:    weak[i].topic,
      topics:   memberTopics,
      avgScore,
      subject:  weak[i].subject || null,
    });
  }

  return clusters.sort((a, b) => a.avgScore - b.avgScore);
}
