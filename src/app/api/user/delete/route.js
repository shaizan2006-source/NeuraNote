import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/serverAuth";

// POST /api/user/delete — schedules account for deletion after 90-day grace period.
// Actual deletion runs via a cron job that checks scheduled_deletion_at.
export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletionDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      scheduled_deletion_at: deletionDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[user/delete] error:", error.message);
    return NextResponse.json({ error: "Failed to schedule deletion" }, { status: 500 });
  }

  // Sign the user out immediately
  await supabase.auth.signOut();

  return NextResponse.json({
    scheduled: true,
    deletion_date: deletionDate,
    message: "Your account is scheduled for deletion in 90 days. Email us to cancel.",
  });
}

// DELETE /api/user/delete — immediate hard delete (admin or within grace period cancellation).
export async function DELETE(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cancel scheduled deletion (user changed their mind)
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ scheduled_deletion_at: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to cancel deletion" }, { status: 500 });
  }

  return NextResponse.json({ cancelled: true, message: "Account deletion cancelled." });
}
