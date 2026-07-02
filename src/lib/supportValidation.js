const CATEGORY_MAP = {
  "bug report": "bug", bug: "bug",
  "billing question": "billing", billing: "billing",
  "feature idea": "feature_request", feature_request: "feature_request",
  account: "account", other: "other",
};

export function normalizeCategory(raw) {
  if (typeof raw !== "string") return "other";
  return CATEGORY_MAP[raw.trim().toLowerCase()] ?? "other";
}

// Screenshot references are storage paths inside support-screenshots,
// scoped to the uploader's folder — never arbitrary URLs.
export function validScreenshotPath(path, userId) {
  if (typeof path !== "string" || !path.startsWith(`${userId}/`)) return false;
  return !path.includes("..") && path.length < 300;
}
