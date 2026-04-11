import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pdfs_metadata")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json([], { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([]);
  }
}