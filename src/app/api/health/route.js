import { supabaseAdmin } from "@/lib/serverAuth";

export async function GET() {
  const checks = { db: false };
  let degraded = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const { error } = await supabaseAdmin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .limit(1)
      .abortSignal(controller.signal);
    clearTimeout(timeout);
    checks.db = !error;
  } catch {
    checks.db = false;
  }

  if (!checks.db) degraded = true;

  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "unknown";

  if (degraded) {
    return Response.json(
      { status: "degraded", checks, version, ts: Date.now() },
      { status: 503 }
    );
  }

  return Response.json({ status: "ok", version, ts: Date.now() });
}
