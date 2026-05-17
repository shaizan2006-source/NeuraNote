const ADJECTIVES = [
  "swift", "quiet", "bright", "calm", "brave", "sharp", "nimble", "steady",
  "gentle", "bold", "keen", "clear", "deep", "fair", "pure", "true",
  "warm", "cool", "light", "dark", "quick", "still", "wise", "free",
  "strong", "soft", "high", "long", "wide", "near", "vast", "great",
  "young", "old", "new", "raw", "fine", "thin", "tall", "low",
  "iron", "stone", "silk", "gold", "silver", "azure", "ember", "frost",
  "dawn", "dusk",
];

const NOUNS = [
  "tiger", "fox", "eagle", "otter", "deer", "hawk", "lynx", "crane",
  "wolf", "crow", "bear", "hare", "swan", "kite", "lark", "wren",
  "stag", "colt", "mare", "dove", "owl", "crab", "puma", "ibis",
  "bison", "llama", "gecko", "finch", "robin", "quail", "stoat", "vole",
  "mink", "newt", "toad", "moth", "wasp", "bream", "pike", "carp",
  "perch", "trout", "loon", "grebe", "skua", "swift", "tern", "wader",
  "curlew", "plover",
];

export function generateHandle() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = String(100 + Math.floor(Math.random() * 900));
  return `${adj}-${noun}-${num}`;
}
