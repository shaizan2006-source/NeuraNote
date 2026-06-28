import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";
import { recognizeQuestion } from "@/lib/ai/visionRecognizer";

const DAILY_LIMITS = { free: 3, student: 20, pro: Infinity };

function startOfDayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getUserTier(userId) {
  const { data } = await supabaseAdmin
    .from("user_plans").select("plan").eq("user_id", userId).maybeSingle();
  return data?.plan ?? "free";
}

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(null, { status: 401 });

  // Tier limit check
  const tier = await getUserTier(user.id);
  const limit = DAILY_LIMITS[tier] ?? DAILY_LIMITS.free;

  const { count } = await supabaseAdmin
    .from("photo_doubts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfDayISO());

  if ((count ?? 0) >= limit) {
    return Response.json({ error: "limit_reached", upgrade_to: tier === "free" ? "student" : "pro" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("image");
  const conversationId = formData.get("conversation_id") ?? null;

  if (!file) return Response.json({ error: "image required" }, { status: 400 });

  // F-020: validate type + size BEFORE uploading / sending to OpenAI vision (cost/DoS guard).
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "unsupported_type", message: "Upload a JPEG, PNG, or WebP image." }, { status: 400 });
  }
  if (typeof file.size === "number" && file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "file_too_large", message: "Image must be under 10MB." }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const mimeType = file.type || "image/jpeg";

  // Upload to storage
  const docId = crypto.randomUUID();
  const storagePath = `${user.id}/${docId}.jpg`;
  await supabaseAdmin.storage.from("photo-doubts").upload(storagePath, buffer, {
    contentType: mimeType, upsert: false,
  });
  const { data: urlData } = supabaseAdmin.storage.from("photo-doubts").getPublicUrl(storagePath);
  const imageUrl = urlData?.publicUrl ?? storagePath;

  // Vision recognition
  let recognized;
  try {
    recognized = await recognizeQuestion(base64, mimeType);
  } catch (err) {
    console.error("[photo-doubt] vision error:", err.message);
    return Response.json({ error: "Vision analysis failed" }, { status: 500 });
  }

  if (recognized.clarity === "unclear") {
    return Response.json({
      error: "unclear_image",
      message: "The image is unclear. Please retake in better lighting.",
    }, { status: 422 });
  }

  // Persist photo_doubt row
  await supabaseAdmin.from("photo_doubts").insert({
    id: docId,
    user_id: user.id,
    conversation_id: conversationId,
    image_url: imageUrl,
    recognized_text: recognized.question_text,
    subject_detected: recognized.subject,
    topic_detected: recognized.topic,
    difficulty_estimate: recognized.difficulty,
    image_clarity: recognized.clarity,
  });

  return Response.json({
    doubt_id: docId,
    recognized_text: recognized.question_text,
    subject: recognized.subject,
    topic: recognized.topic,
    image_url: imageUrl,
  });
}
