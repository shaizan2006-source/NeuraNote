import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { parsePdfDocument } from "@/lib/parsePdfDocument";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { documentId } = body ?? {};
  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  try {
    // Always use the authenticated user's ID — never trust userId from the body
    const result = await parsePdfDocument(documentId, user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("PARSE PDF ERROR:", err);
    const status = err.status ?? 500;
    const code = err.code ?? "pdf_parse_failed";
    return NextResponse.json({ error: code, message: err.message }, { status });
  }
}
