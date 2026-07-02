import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverAuth";
import { FLAGS, flagDisabledResponse } from "@/lib/featureFlags";

/** GET /api/support/faq — public, published FAQ items in display order. */
export async function GET() {
  if (!FLAGS.SUPPORT) return flagDisabledResponse();

  const { data, error } = await supabaseAdmin
    .from("faq_items")
    .select("id, question, answer")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[support/faq]", error.message);
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(data || [], {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
