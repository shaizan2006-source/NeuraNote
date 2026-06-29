import { verifyAuth } from "@/lib/serverAuth";
import { getExamPhase, PHASE_CONFIG } from "@/lib/exam/transitions";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getExamPhase(user.id);
  const config = PHASE_CONFIG[result.phase] ?? PHASE_CONFIG.normal;

  return Response.json({ ...result, config }, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}