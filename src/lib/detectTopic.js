export function detectTopic(text) {
  if (!text) return null;

  const t = text.toLowerCase();

  const topics = [
    "recursion",
    "sorting",
    "binary search",
    "linked list",
    "stack",
    "queue",
    "tree",
    "graph",
    "dynamic programming",
    "dp",
    "greedy",
    "hashing",
    "time complexity",
    "space complexity",
  ];

  for (let topic of topics) {
    if (t.includes(topic)) return topic;
  }

  return null;
}