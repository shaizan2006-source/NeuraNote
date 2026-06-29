import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "shaizan2006@gmail.com").split(",").map(e => e.trim());

async function requireAdmin(req) {
  const user = await verifyAuth(req);
  if (!user || !ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}

export async function PATCH(req, { params }) {
  const user = await requireAdmin(req);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const allowed = ["chapter", "difficulty", "solution_text", "concepts", "correct_answer", "options", "mark_weight"];
  const update = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await supabaseAdmin.from("pyqs").update(update).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await requireAdmin(req);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabaseAdmin.from("pyqs").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}