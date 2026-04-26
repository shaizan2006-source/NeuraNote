import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const { data, error } = await supabase
      .from("syllabus_topics")
      .select("*");

    if (error) {
      console.error('[syllabus GET]', error);
      return NextResponse.json({ topics: [] });
    }

    return NextResponse.json({ topics: data || [] });
  } catch (err) {
    console.error('[syllabus GET]', err);
    return NextResponse.json({ topics: [] });
  }
}
