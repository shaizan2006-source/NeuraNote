/** probe-tables.mjs — report which key tables exist in the connected Supabase. */
import { createClient } from "@supabase/supabase-js";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.resolve(__dirname, "..", ".env.local"), "utf8");
const env = {}; for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?/); if (m) env[m[1]] = m[2]; }
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TABLES = ["profiles","documents","document_chunks","daily_progress","study_streaks","weak_topics","topic_attempts","qa_usage","pyqs","mock_tests","exams","cohorts","concept_nodes","spaced_repetition_cards","generated_artifacts","push_subscriptions","daily_briefings","photo_doubts","payment_orders","growth_events"];
const out = [];
for (const t of TABLES) {
  const { error } = await admin.from(t).select("*", { count: "exact", head: true });
  out.push(`${error ? "✗ MISSING" : "✓ ok     "}  ${t}${error ? "   (" + error.message.split("\n")[0] + ")" : ""}`);
}
console.log(out.join("\n"));
