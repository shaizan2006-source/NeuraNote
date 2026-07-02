// Kill switches. Default ON; set the env var to "0" to disable a feature
// without touching unrelated code. NEXT_PUBLIC_ so the same literal works
// in client bundles (inlined at build) and server routes (process.env).
export const FLAGS = {
  SUPPORT:       (process.env.NEXT_PUBLIC_FEATURE_SUPPORT       ?? "1") !== "0",
  INCOGNITO:     (process.env.NEXT_PUBLIC_FEATURE_INCOGNITO     ?? "1") !== "0",
  DOUBT_SIDEBAR: (process.env.NEXT_PUBLIC_FEATURE_DOUBT_SIDEBAR ?? "1") !== "0",
};

export function flagDisabledResponse() {
  return Response.json({ error: "This feature is currently unavailable." }, { status: 503 });
}
