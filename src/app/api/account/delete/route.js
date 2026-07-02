import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { anonymizeUser } from "@/lib/privacy/anonymize";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await anonymizeUser(user.id);

  // If anonymise reports critical failure (e.g. auth-user deletion failed), tell the client.
  // result.anonymised === false means PII and/or the auth identity may still be live.
  if (result?.anonymised === false) {
    console.error("[account/delete] anonymize failed critically:", result.errors);
    return NextResponse.json(
      { error: "Account deletion failed — please contact support." },
      { status: 500 },
    );
  }

  if (result?.errors?.length) {
    console.error("[account/delete] anonymize partial errors:", result.errors);
  }

  return NextResponse.json({ ok: true });
}
