/**
 * create-test-account.mjs — provision a confirmed UI-test account in the
 * connected Supabase project and write its creds into .env.local.
 * Uses SUPABASE_SERVICE_ROLE_KEY (admin) — no email verification needed.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, "..", ".env.local");

const raw = fs.readFileSync(ENV, "utf8");
const env = {};
for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?/); if (m) env[m[1]] = m[2]; }

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }

const EMAIL = "uitest@askmynotes.in";
const PASSWORD = "Aurum9h!Test2026";

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureUser() {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (!error) { console.log("  ✓ created user", data.user.id); return; }
  if (/already|registered|exists/i.test(error.message)) {
    // find + update password
    let page = 1, found = null;
    while (page <= 20 && !found) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      found = list?.users?.find(u => u.email?.toLowerCase() === EMAIL);
      if (!list || list.users.length < 200) break;
      page++;
    }
    if (!found) { console.error("  ✗ user exists but not found in listUsers; pick a different EMAIL"); process.exit(1); }
    const { error: upErr } = await admin.auth.admin.updateUserById(found.id, { password: PASSWORD, email_confirm: true });
    if (upErr) { console.error("  ✗ update failed:", upErr.message); process.exit(1); }
    console.log("  ✓ existing user, password reset", found.id);
    return;
  }
  console.error("  ✗ createUser failed:", error.message); process.exit(1);
}

await ensureUser();

// Rewrite TEST_EMAIL / TEST_PASSWORD lines in .env.local (preserve everything else)
let lines = raw.split("\n").filter(l => !/^\s*TEST_EMAIL\s*=/.test(l) && !/^\s*TEST_PASSWORD\s*=/.test(l));
while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
lines.push(`TEST_EMAIL=${EMAIL}`);
lines.push(`TEST_PASSWORD=${PASSWORD}`);
fs.writeFileSync(ENV, lines.join("\n") + "\n", "utf8");
console.log(`  ✓ wrote TEST_EMAIL=${EMAIL} + TEST_PASSWORD=*** to .env.local`);
console.log("✅ test account ready");
