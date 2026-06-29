/**
 * GET  /api/admin/users       — paginated user list with plan, spend, last active
 * POST /api/admin/users       — change plan for a user
 *
 * Auth: Bearer token (must be in ADMIN_EMAILS).
 * All data reads use the service-role key (bypasses RLS).
 *
 * GET params:
 *   ?page=1&limit=50&search=email&plan=all|free|student|pro|family|school
 *
 * POST body:
 *   { action: "change_plan", userId: string, plan: string, expiresAt?: ISO string }
 */

import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "shaizan2006@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

const PAGE_SIZE_MAX = 100;

// ── Auth helper ─────────────────────────────────────────────────────────────
async function requireAdmin(req) {
  const user = await verifyAuth(req);
  if (!user) return { user: null, err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
    return { user: null, err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, err: null };
}

// ── GET — user list ─────────────────────────────────────────────────────────
export async function GET(req) {
  const { err } = await requireAdmin(req);
  if (err) return err;

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(PAGE_SIZE_MAX, parseInt(searchParams.get("limit") ?? "50"));
  const search = searchParams.get("search")?.trim() ?? "";
  const planFilter = searchParams.get("plan") ?? "all";

  const offset = (page - 1) * limit;

  // 1. Get current month start for spend aggregation
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  try {
    // 2. Fetch users from auth (service role) — supports email search
    const authListOptions = {
      page,
      perPage: limit,
    };
    if (search) {
      // Supabase admin.listUsers supports search by email prefix
      authListOptions.search = search;
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers(authListOptions);
    if (authErr) throw authErr;

    const users = authData.users ?? [];
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({ users: [], total: authData.total ?? 0, page, limit });
    }

    // 3. Fetch plan info for these users in one query
    const { data: plans, error: plansErr } = await supabaseAdmin
      .from("user_plans")
      .select("user_id, plan, expires_at")
      .in("user_id", userIds);
    if (plansErr) throw plansErr;

    const planMap = new Map((plans ?? []).map((p) => [p.user_id, p]));

    // 4. Fetch this-month AI spend in one query
    const { data: spendRows, error: spendErr } = await supabaseAdmin
      .from("user_ai_spend_daily")
      .select("user_id, cost_usd")
      .in("user_id", userIds)
      .gte("date", monthStartStr);
    if (spendErr) {
      console.warn("admin/users spend query failed:", spendErr.message);
      // non-fatal — continue without spend data
    }

    // Aggregate spend per user
    const spendMap = new Map();
    for (const row of spendRows ?? []) {
      spendMap.set(row.user_id, (spendMap.get(row.user_id) ?? 0) + parseFloat(row.cost_usd ?? 0));
    }

    // 5. Assemble response rows
    let rows = users.map((u) => {
      const planRow = planMap.get(u.id);
      const planExpired = planRow?.expires_at && new Date(planRow.expires_at) < new Date();
      const effectivePlan = planRow?.plan && !planExpired ? planRow.plan : "free";

      return {
        id:          u.id,
        email:       u.email,
        createdAt:   u.created_at,
        lastSignIn:  u.last_sign_in_at,
        role:        u.app_metadata?.role ?? null,
        plan:        effectivePlan,
        planExpires: planRow?.expires_at ?? null,
        spendUsd:    +(spendMap.get(u.id) ?? 0).toFixed(4),
      };
    });

    // 6. Apply plan filter (client-side after fetch since auth.listUsers doesn't support it)
    if (planFilter !== "all") {
      rows = rows.filter((r) => r.plan === planFilter);
    }

    // Sort: highest spend first
    rows.sort((a, b) => b.spendUsd - a.spendUsd);

    return NextResponse.json({
      users: rows,
      total: authData.total ?? rows.length,
      page,
      limit,
    });
  } catch (err) {
    console.error("admin/users GET error:", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

// ── POST — mutate user plan ─────────────────────────────────────────────────
export async function POST(req) {
  const { err } = await requireAdmin(req);
  if (err) return err;

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { action, userId, plan, expiresAt } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (action === "change_plan") {
    // Validate plan
    const VALID_PLANS = ["free", "student", "pro", "family", "school"];
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}` }, { status: 400 });
    }

    try {
      if (plan === "free") {
        // Downgrade: delete the user_plans row (falls back to free)
        await supabaseAdmin.from("user_plans").delete().eq("user_id", userId);
      } else {
        // Upsert the plan row
        const expiryDate = expiresAt
          ? new Date(expiresAt).toISOString()
          : (() => {
              const d = new Date();
              d.setFullYear(d.getFullYear() + 1);
              return d.toISOString();
            })();

        await supabaseAdmin.from("user_plans").upsert({
          user_id:    userId,
          plan,
          expires_at: expiryDate,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }

      return NextResponse.json({ ok: true, userId, plan });
    } catch (err) {
      console.error("admin/users change_plan error:", err);
      return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
