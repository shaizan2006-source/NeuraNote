/**
 * setup-dev-accounts.mjs
 *
 * Creates (or updates) internal developer accounts in Supabase and grants
 * them the "internal_dev" role via app_metadata, which bypasses all plan
 * limits, paywalls, and feature gates.
 *
 * Usage:
 *   node scripts/setup-dev-accounts.mjs
 *
 * Add extra accounts:
 *   Add a new entry to DEV_ACCOUNTS below and re-run.
 *   Or pass --email and --password flags for a one-off account:
 *   node scripts/setup-dev-accounts.mjs --email=new@example.com --password=secret123
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Load from .env.local by default (via --env-file flag or dotenv).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load env from .env.local ─────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // Fall through — env vars may already be set
  }
}
loadEnv();

// ── Internal developer accounts ──────────────────────────────────────────────
// To add more accounts, append entries here and re-run this script.
const DEV_ACCOUNTS = [
  {
    email:    "test@example.com",
    password: "12345678",
    name:     "Dev Account 1",
  },
  {
    email:    "test1@example.com",
    password: "shaizan_07",
    name:     "Dev Account 2 (Shaizan)",
  },
];

// ── CLI override (--email=x --password=y) ────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.join("=")];
    }),
);
if (args.email && args.password) {
  DEV_ACCOUNTS.push({ email: args.email, password: args.password, name: "Extra Dev Account" });
}

// ── Supabase admin client ────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Ensure .env.local is present or env vars are exported.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Provision each account ───────────────────────────────────────────────────
async function provisionAccount({ email, password, name }) {
  console.log(`\nProvisioning: ${email} (${name})`);

  // Try to create the user. If it already exists, fetch it instead.
  let userId;
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // skip email verification
      app_metadata:  { role: "internal_dev" },
      user_metadata: { full_name: name },
    });

  if (createErr) {
    if (!createErr.message?.toLowerCase().includes("already")) {
      console.error(`  ✗ Create failed: ${createErr.message}`);
      return;
    }
    // User already exists — fetch and update instead.
    console.log("  User already exists. Updating app_metadata and password…");
    const { data: { users }, error: listErr } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) { console.error(`  ✗ List failed: ${listErr.message}`); return; }
    const existing = users.find((u) => u.email === email);
    if (!existing) { console.error(`  ✗ Could not find existing user for ${email}`); return; }
    userId = existing.id;

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      app_metadata:  { role: "internal_dev" },
      user_metadata: { full_name: name },
    });
    if (updateErr) { console.error(`  ✗ Update failed: ${updateErr.message}`); return; }
    console.log(`  ✓ Updated — userId: ${userId}`);
  } else {
    userId = created.user.id;
    console.log(`  ✓ Created — userId: ${userId}`);
  }

  // Upsert a "school" plan entry so any plan-based UI also shows the right tier.
  // This is belt-and-suspenders — runtime checks use app_metadata, not this row.
  const { error: planErr } = await supabase.from("user_plans").upsert(
    {
      user_id:    userId,
      plan:       "school",
      expires_at: "2099-12-31T23:59:59Z",   // effectively permanent
      payment_id: "internal_dev_override",
      order_id:   "internal_dev_override",
    },
    { onConflict: "user_id" },
  );
  if (planErr) {
    console.warn(`  ⚠ Plan row upsert warning: ${planErr.message}`);
  } else {
    console.log("  ✓ user_plans row set to 'school' (expires 2099)");
  }

  console.log(`  ✓ ${email} is ready. Login with the configured password.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log("=== Internal Dev Account Setup ===");
console.log(`Supabase: ${supabaseUrl}`);

for (const account of DEV_ACCOUNTS) {
  await provisionAccount(account);
}

console.log("\n=== Done ===");
console.log("Test by logging in at your app. These accounts bypass all plan limits.");
console.log("To add more accounts: edit DEV_ACCOUNTS in this script or use --email/--password flags.");
