// src/app/api/account/delete/route.js
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { anonymizeUser } from "@/lib/privacy/anonymize";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await anonymizeUser(user.id);
  if (result?.errors?.length) {
    console.error("[account/delete] anonymize errors:", result.errors);
  }

  return NextResponse.json({ ok: true });
}
