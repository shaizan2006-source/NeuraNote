import { supabaseAdmin } from "@/lib/serverAuth";

export async function GET(req, { params }) {
  const { slug } = await params;

  const { data, error } = await supabaseAdmin
    .from("pyqs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return new Response(null, { status: 404 });

  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=300" },
  });
}