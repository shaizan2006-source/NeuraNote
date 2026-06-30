# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/settings` page with a warm two-column sidebar layout covering Account, Plan, Notifications, Support, and Privacy sections — all fully functional and wired to the existing auth/data layer.

**Architecture:** Single `src/app/settings/page.js` holds auth guard + section state. `SettingsShell` renders the fixed 220px nav rail + scrollable content pane. Each of the 5 sections is its own component, isolated and independently scrollable. 4 new API routes handle the data; one DB migration adds `support_requests`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (auth + DB + Storage), Framer Motion (already installed), tokens from `src/styles/variables.css`. No new dependencies.

## Global Constraints

- All colour/spacing must use CSS tokens from `variables.css` — no hard-coded hex (grep-gate enforced).
- Client-side Supabase: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)` from `@supabase/supabase-js`.
- Server-side auth: `import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth"`.
- Inline SVG icons only — `lucide-react` is NOT installed.
- No new npm packages without founder approval.
- Build verification: `npx next build` must exit 0 after every task.
- Commit after every task.

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/20260701000001_support_requests.sql` | Create |
| `src/app/api/settings/plan/route.js` | Create |
| `src/app/api/support/route.js` | Create |
| `src/app/api/account/export/route.js` | Create |
| `src/app/api/account/delete/route.js` | Create |
| `src/app/settings/loading.js` | Create |
| `src/components/settings/SettingsShell.jsx` | Create |
| `src/components/settings/AccountSection.jsx` | Create |
| `src/components/settings/PlanSection.jsx` | Create |
| `src/components/settings/NotificationsSection.jsx` | Create |
| `src/components/settings/SupportSection.jsx` | Create |
| `src/components/settings/PrivacySection.jsx` | Create |
| `src/app/settings/page.js` | Create |
| `src/components/ui/UserProfile.jsx` | Modify — wire Settings + Help |

---

### Task 1: DB Migration — `support_requests`

**Files:**
- Create: `supabase/migrations/20260701000001_support_requests.sql`

**Interfaces:**
- Produces: `support_requests(id uuid, user_id uuid, subject text, message text, created_at timestamptz)` table, RLS enabled, insert policy for authenticated user.

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260701000001_support_requests.sql
CREATE TABLE IF NOT EXISTS support_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own support_requests" ON support_requests;
CREATE POLICY "users insert own support_requests"
  ON support_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Verify migration is valid SQL**

Open the Supabase dashboard SQL editor and run the migration, OR note it for prod apply at launch. The file itself just needs to exist in the repo for now.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260701000001_support_requests.sql
git commit -m "feat(settings): add support_requests migration"
```

---

### Task 2: Four API Routes

**Files:**
- Create: `src/app/api/settings/plan/route.js`
- Create: `src/app/api/support/route.js`
- Create: `src/app/api/account/export/route.js`
- Create: `src/app/api/account/delete/route.js`

**Interfaces:**
- Consumes: `verifyAuth`, `supabaseAdmin` from `@/lib/serverAuth`; `PLANS`, `getUserPlan`, `countTodayQA`, `countUserPDFs` from `@/lib/planLimits`; `anonymizeUser` from `@/lib/privacy/anonymize`
- Produces:
  - `GET /api/settings/plan` → `{ plan, expiresAt, qaUsedToday, qaLimit, pdfCount, pdfLimit }`
  - `POST /api/support` → `{ ok: true }`
  - `GET /api/account/export` → JSON file download
  - `POST /api/account/delete` → `{ ok: true }`

- [ ] **Step 1: Create `/api/settings/plan/route.js`**

```js
// src/app/api/settings/plan/route.js
import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/serverAuth";
import { PLANS, getUserPlan, countTodayQA, countUserPDFs } from "@/lib/planLimits";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [planRow, qaUsedToday, pdfCount] = await Promise.all([
    getUserPlan(user.id),
    countTodayQA(user.id),
    countUserPDFs(user.id),
  ]);

  // getUserPlan returns the plan string (e.g. "free", "pro"); we need the full row for expiresAt.
  // getUserPlan also accepts a supabaseAdmin query internally — re-query for expires_at.
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: planData } = await sb
    .from("user_plans")
    .select("plan, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan      = planData?.plan ?? "free";
  const expiresAt = planData?.expires_at ?? null;
  const limits    = PLANS[plan] ?? PLANS.free;

  return NextResponse.json({
    plan,
    expiresAt,
    qaUsedToday,
    qaLimit:   limits.qaLimit,
    pdfCount,
    pdfLimit:  limits.pdfLimit,
  });
}
```

- [ ] **Step 2: Create `/api/support/route.js`**

```js
// src/app/api/support/route.js
import { NextResponse } from "next/server";
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export async function POST(req) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.subject || !body?.message) {
    return NextResponse.json({ error: "subject and message required" }, { status: 400 });
  }

  const subject = String(body.subject).slice(0, 100);
  const message = String(body.message).slice(0, 4000);

  const { error } = await supabaseAdmin.from("support_requests").insert({
    user_id: user.id,
    subject,
    message,
  });

  if (error) {
    console.error("[support POST]", error.message);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create `/api/account/export/route.js`**

```js
// src/app/api/account/export/route.js
import { verifyAuth, supabaseAdmin } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await verifyAuth(req);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const uid    = user.id;
  const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [docsRes, convsRes, progressRes, streakRes] = await Promise.allSettled([
    supabaseAdmin.from("documents").select("id,name,subject,created_at").eq("user_id", uid),
    supabaseAdmin.from("conversations").select("id,title,messages,created_at,updated_at")
      .eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
    supabaseAdmin.from("daily_progress").select("date,questions,score")
      .eq("user_id", uid).gte("date", since90.split("T")[0]),
    supabaseAdmin.from("study_streaks").select("streak_count,last_active_date")
      .eq("user_id", uid).maybeSingle(),
  ]);

  const payload = {
    exported_at:  new Date().toISOString(),
    user_id:      uid,
    documents:    docsRes.status === "fulfilled"    ? (docsRes.value.data    ?? []) : [],
    conversations: convsRes.status === "fulfilled"  ? (convsRes.value.data   ?? []) : [],
    daily_progress: progressRes.status === "fulfilled" ? (progressRes.value.data ?? []) : [],
    streak:       streakRes.status === "fulfilled"  ? (streakRes.value.data  ?? null) : null,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="askmynotes-export-${uid.slice(0,8)}.json"`,
    },
  });
}
```

- [ ] **Step 4: Create `/api/account/delete/route.js`**

```js
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
```

- [ ] **Step 5: Verify build is clean**

```bash
npx next build
```
Expected: EXIT 0, no errors, new routes appear in the route table.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/settings/plan/route.js src/app/api/support/route.js \
        src/app/api/account/export/route.js src/app/api/account/delete/route.js
git commit -m "feat(settings): four new API routes — plan, support, export, delete"
```

---

### Task 3: SettingsShell + loading.js

**Files:**
- Create: `src/components/settings/SettingsShell.jsx`
- Create: `src/app/settings/loading.js`

**Interfaces:**
- Consumes: nothing yet (section content passed as `children`)
- Produces: `<SettingsShell active={string} onNav={fn} onSignOut={fn}>{children}</SettingsShell>`

- [ ] **Step 1: Create `SettingsShell.jsx`**

```jsx
// src/components/settings/SettingsShell.jsx
"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const NAV = [
  { key: "account",       label: "Your Account",    Icon: IconUser },
  { key: "plan",          label: "Your Plan",        Icon: IconPlan },
  { key: "notifications", label: "Notifications",    Icon: IconBell },
  { key: "support",       label: "Support",          Icon: IconHelp },
  { key: "privacy",       label: "Privacy & Data",   Icon: IconShield },
];

export default function SettingsShell({ active, onNav, onSignOut, children }) {
  const router = useRouter();
  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .st-rail  { width: 100% !important; height: auto !important; flex-direction: row !important;
                      border-right: none !important; border-bottom: 1px solid var(--border-hairline) !important;
                      overflow-x: auto; padding: 8px 12px !important; gap: 4px !important; }
          .st-rail .st-sign-out { display: none !important; }
          .st-nav-label { display: none !important; }
          .st-nav-item  { padding: 8px !important; border-radius: 10px !important; min-width: 40px;
                          justify-content: center !important; }
          .st-content   { padding: 20px 16px !important; }
          .st-mobile-so { display: flex !important; }
        }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)", color: "var(--text-primary)", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 24px", height: 52, borderBottom: "1px solid var(--border-hairline)", flexShrink: 0, background: "var(--bg-surface)" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
            ← Dashboard
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Settings</span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Nav rail */}
          <div className="st-rail" style={{ width: 220, flexShrink: 0, background: "var(--bg-surface)", borderRight: "1px solid var(--border-hairline)", display: "flex", flexDirection: "column", padding: "16px 10px", gap: 2, overflowY: "auto" }}>
            {NAV.map(({ key, label, Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  className="st-nav-item"
                  onClick={() => onNav(key)}
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            10,
                    height:         44,
                    padding:        "0 12px",
                    borderRadius:   10,
                    border:         "none",
                    cursor:         "pointer",
                    background:     isActive ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "transparent",
                    color:          isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize:       13,
                    fontWeight:     isActive ? 600 : 500,
                    textAlign:      "left",
                    width:          "100%",
                    borderLeft:     isActive ? "3px solid var(--accent)" : "3px solid transparent",
                    transition:     "background 0.15s, color 0.15s",
                    fontFamily:     "inherit",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-surface-2)"; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon active={isActive} />
                  <span className="st-nav-label">{label}</span>
                </button>
              );
            })}

            {/* Sign out — desktop only (pinned bottom) */}
            <div className="st-sign-out" style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-hairline)" }}>
              <button
                onClick={onSignOut}
                style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "var(--text-tertiary)", fontSize: 13, fontWeight: 500, width: "100%", fontFamily: "inherit", transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--error)"; e.currentTarget.style.background = "color-mix(in srgb, var(--error) 8%, transparent)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
              >
                <IconSignOut />
                <span className="st-nav-label">Sign out</span>
              </button>
            </div>
          </div>

          {/* Content pane */}
          <div className="st-content" style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            {/* Mobile sign-out (hidden on desktop via CSS) */}
            <button
              className="st-mobile-so"
              onClick={onSignOut}
              style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 20, background: "none", border: "none", color: "var(--error)", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              Sign out
            </button>
            <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
              {children}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Section card helpers (exported for use in section components) ──────────
export function SettingsCard({ children, danger = false, style = {} }) {
  return (
    <div style={{
      background:   "var(--bg-surface)",
      border:       danger
        ? "1px solid color-mix(in srgb, var(--error) 25%, transparent)"
        : "1px solid var(--border-hairline)",
      borderRadius: 16,
      padding:      24,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function SettingsGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

export function SettingsInput({ label, value, onChange, readOnly = false, placeholder = "" }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px",
          borderRadius: 9, background: readOnly ? "var(--bg-inset)" : "var(--bg-surface-2)",
          border: "1px solid var(--border-hairline)", color: readOnly ? "var(--text-tertiary)" : "var(--text-primary)",
          fontSize: 14, outline: "none", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

export function GoldButton({ children, onClick, disabled = false, outline = false, danger = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      "10px 22px",
        borderRadius: 10,
        border:       outline || danger ? `1px solid ${danger ? "var(--error)" : "var(--border-strong)"}` : "none",
        background:   outline || danger ? "transparent" : "var(--accent-grad)",
        color:        outline ? "var(--text-secondary)" : danger ? "var(--error)" : "var(--bg-base)",
        fontWeight:   600,
        fontSize:     14,
        cursor:       disabled ? "not-allowed" : "pointer",
        opacity:      disabled ? 0.5 : 1,
        fontFamily:   "inherit",
        transition:   "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── Inline SVG icons ───────────────────────────────────────────────────────
function NavIcon({ d, active }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}
function IconUser({ active })     { return <NavIcon active={active} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />; }
function IconPlan({ active })     { return <NavIcon active={active} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />; }
function IconBell({ active })     { return <NavIcon active={active} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />; }
function IconHelp({ active })     { return <NavIcon active={active} d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />; }
function IconShield({ active })   { return <NavIcon active={active} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />; }
function IconSignOut()            { return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>; }
```

- [ ] **Step 2: Create `src/app/settings/loading.js`**

```js
// src/app/settings/loading.js
import RouteSkeleton from "@/components/shared/RouteSkeleton";
export default function Loading() { return <RouteSkeleton sidebar />; }
```

- [ ] **Step 3: Build check**

```bash
npx next build
```
Expected: EXIT 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsShell.jsx src/app/settings/loading.js
git commit -m "feat(settings): SettingsShell layout + loading skeleton"
```

---

### Task 4: AccountSection

**Files:**
- Create: `src/components/settings/AccountSection.jsx`

**Interfaces:**
- Consumes: `user` object (from `useDashboard()`), `SettingsCard`, `SettingsGroup`, `SettingsInput`, `GoldButton` from `SettingsShell`
- Produces: `<AccountSection user={user} />` — handles its own save/reset state

- [ ] **Step 1: Create `AccountSection.jsx`**

```jsx
// src/components/settings/AccountSection.jsx
"use client";
import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { SettingsCard, SettingsGroup, SettingsInput, GoldButton } from "./SettingsShell";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function AccountSection({ user }) {
  const [name,      setName]      = useState(user?.user_metadata?.full_name ?? "");
  const [username,  setUsername]  = useState(user?.user_metadata?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveErr,   setSaveErr]   = useState(null);
  const [pwSent,    setPwSent]    = useState(false);
  const [pwErr,     setPwErr]     = useState(null);
  const fileRef = useRef(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true); setSaveErr(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim(), username: username.trim(), avatar_url: avatarUrl },
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    setPwErr(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      setPwSent(true);
    } catch (err) {
      setPwErr(err.message);
    }
  }

  const initials = (name || user?.email || "?")[0].toUpperCase();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Your Account</h1>

      <SettingsGroup label="Profile">
        <SettingsCard>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: 72, height: 72, borderRadius: "50%", background: avatarUrl ? "transparent" : "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "var(--bg-base)", cursor: "pointer", overflow: "hidden", border: "2px solid var(--border-hairline)", flexShrink: 0, opacity: uploading ? 0.5 : 1, transition: "opacity 0.2s" }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Profile photo</p>
              <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                {uploading ? "Uploading…" : "Change photo"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SettingsInput label="Display name"  value={name}     onChange={setName}     placeholder="Your name" />
            <SettingsInput label="Username"       value={username} onChange={setUsername} placeholder="@handle" />
            <SettingsInput label="Email"          value={user?.email ?? ""} readOnly />
          </div>

          {saveErr && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--error)" }}>{saveErr}</p>}

          <div style={{ marginTop: 20 }}>
            <GoldButton onClick={handleSave} disabled={saving}>
              {saved ? "✓ Saved" : saving ? "Saving…" : "Save changes"}
            </GoldButton>
          </div>
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Password">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Change your password</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>We&apos;ll send a reset link to {user?.email}.</p>
          {pwSent
            ? <p style={{ fontSize: 13, color: "var(--success)", margin: 0 }}>✓ Check your inbox — link expires in 1 hour.</p>
            : <>
                {pwErr && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--error)" }}>{pwErr}</p>}
                <GoldButton outline onClick={handlePasswordReset}>Send reset link</GoldButton>
              </>}
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx next build
```
Expected: EXIT 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/AccountSection.jsx
git commit -m "feat(settings): AccountSection — avatar, name, password reset"
```

---

### Task 5: PlanSection

**Files:**
- Create: `src/components/settings/PlanSection.jsx`

**Interfaces:**
- Consumes: `user`, `SettingsCard`, `SettingsGroup`, `GoldButton`, `GET /api/settings/plan`
- Produces: `<PlanSection user={user} />`

- [ ] **Step 1: Create `PlanSection.jsx`**

```jsx
// src/components/settings/PlanSection.jsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SettingsCard, SettingsGroup, GoldButton } from "./SettingsShell";
import PremiumMark from "@/components/brand/PremiumMark";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const PLAN_COLORS = {
  free:    { bg: "var(--bg-surface-2)",  color: "var(--text-tertiary)", label: "Free" },
  student: { bg: "color-mix(in srgb, var(--info) 12%, transparent)", color: "var(--info)", label: "Student" },
  pro:     { bg: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", label: "Pro" },
  proplus: { bg: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", label: "Pro+" },
  family:  { bg: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)", label: "Family" },
  school:  { bg: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", label: "School" },
};

function UsageBar({ label, used, limit }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
        <span>{label}</span>
        <span>{limit ? `${used} / ${limit}` : <span style={{ color: "var(--success)" }}>Unlimited</span>}</span>
      </div>
      {limit && (
        <div style={{ height: 6, background: "var(--bg-inset)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent-grad)", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
      )}
    </div>
  );
}

export default function PlanSection({ user }) {
  const router = useRouter();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/settings/plan", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) setData(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  const plan       = data?.plan ?? "free";
  const planMeta   = PLAN_COLORS[plan] ?? PLAN_COLORS.free;
  const isFree     = plan === "free";
  const expiresAt  = data?.expiresAt ? new Date(data.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Your Plan</h1>

      <SettingsGroup label="Current plan">
        <SettingsCard>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isFree ? 20 : 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: planMeta.bg, color: planMeta.color }}>
              {planMeta.label}
            </span>
            {expiresAt && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Renews {expiresAt}</span>}
          </div>

          {isFree ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <PremiumMark size={28} glow />
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Unlock unlimited questions, PDFs, and more</p>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-tertiary)" }}>Starting at ₹199/month. Cancel anytime.</p>
                <GoldButton onClick={() => router.push("/pricing")}>Upgrade now</GoldButton>
              </div>
            </div>
          ) : (
            <GoldButton outline onClick={() => router.push("/pricing")}>Manage subscription</GoldButton>
          )}
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Usage">
        <SettingsCard>
          {loading ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Loading usage…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <UsageBar label="Questions today"   used={data?.qaUsedToday  ?? 0} limit={data?.qaLimit}  />
              <UsageBar label="PDFs uploaded"     used={data?.pdfCount     ?? 0} limit={data?.pdfLimit} />
            </div>
          )}
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
npx next build
git add src/components/settings/PlanSection.jsx
git commit -m "feat(settings): PlanSection — plan badge, usage bars, upgrade CTA"
```

---

### Task 6: NotificationsSection

**Files:**
- Create: `src/components/settings/NotificationsSection.jsx`

**Interfaces:**
- Consumes: `SettingsCard`, `SettingsGroup`; `subscribeUser`, `unsubscribeUser` from `@/lib/push`
- Produces: `<NotificationsSection />`

- [ ] **Step 1: Create `NotificationsSection.jsx`**

```jsx
// src/components/settings/NotificationsSection.jsx
"use client";
import { useState, useEffect } from "react";
import { SettingsCard, SettingsGroup } from "./SettingsShell";
import { subscribeUser, unsubscribeUser, getPermissionState } from "@/lib/push";

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", flexShrink: 0,
        background: on ? "var(--accent-grad)" : "var(--bg-inset)",
        position: "relative", transition: "background 0.2s",
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "var(--text-primary)", transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
      }} />
    </button>
  );
}

export default function NotificationsSection() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
    setEnabled(Notification.permission === "granted");
  }, []);

  async function handleToggle(next) {
    setLoading(true);
    try {
      if (next) {
        const sub = await subscribeUser();
        setEnabled(!!sub);
        setPermission(Notification.permission);
      } else {
        await unsubscribeUser();
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Notifications</h1>

      <SettingsGroup label="Push notifications">
        <SettingsCard>
          {!supported ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Push notifications are not supported in this browser.</p>
          ) : permission === "denied" ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>Notifications are blocked — update this in your browser settings and reload.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Study reminders &amp; streaks</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Get nudged when it&apos;s time to review or keep your streak alive.</p>
              </div>
              <Toggle on={enabled && !loading} onChange={handleToggle} />
            </div>
          )}
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
npx next build
git add src/components/settings/NotificationsSection.jsx
git commit -m "feat(settings): NotificationsSection — push toggle"
```

---

### Task 7: SupportSection

**Files:**
- Create: `src/components/settings/SupportSection.jsx`

**Interfaces:**
- Consumes: `SettingsCard`, `SettingsGroup`, `GoldButton`; `POST /api/support`
- Produces: `<SupportSection token={string} />`

- [ ] **Step 1: Create `SupportSection.jsx`**

```jsx
// src/components/settings/SupportSection.jsx
"use client";
import { useState } from "react";
import { SettingsCard, SettingsGroup, GoldButton } from "./SettingsShell";

const SUBJECTS = ["Bug report", "Billing question", "Feature idea", "Other"];

export default function SupportSection({ token }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true); setError(null);
    try {
      const res = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subject, message: message.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Support</h1>

      <SettingsGroup label="Contact us">
        <SettingsCard>
          {sent ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Message sent</p>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)" }}>We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>We&apos;re here to help</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                  >
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your issue or idea…"
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 9, background: "var(--bg-surface-2)", border: "1px solid var(--border-hairline)", color: "var(--text-primary)", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                  />
                </div>

                {error && <p style={{ margin: 0, fontSize: 12, color: "var(--error)" }}>{error}</p>}

                <GoldButton onClick={handleSend} disabled={sending || !message.trim()}>
                  {sending ? "Sending…" : "Send message"}
                </GoldButton>
              </div>
            </>
          )}
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="App info">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--text-secondary)" }}>
            Version <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}</span>
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Ask My Notes — built for focused students.</p>
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
npx next build
git add src/components/settings/SupportSection.jsx
git commit -m "feat(settings): SupportSection — contact form, app info"
```

---

### Task 8: PrivacySection

**Files:**
- Create: `src/components/settings/PrivacySection.jsx`

**Interfaces:**
- Consumes: `SettingsCard`, `SettingsGroup`, `GoldButton`; `GET /api/account/export`; `POST /api/account/delete`; `token` prop for auth headers
- Produces: `<PrivacySection token={string} onDeleted={fn} />`

- [ ] **Step 1: Create `PrivacySection.jsx`**

```jsx
// src/components/settings/PrivacySection.jsx
"use client";
import { useState } from "react";
import { SettingsCard, SettingsGroup, GoldButton } from "./SettingsShell";

export default function PrivacySection({ token, onDeleted }) {
  const [exporting,   setExporting]   = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting,    setDeleting]    = useState(false);
  const [deleteErr,   setDeleteErr]   = useState(null);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/account/export", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "askmynotes-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteInput !== "DELETE") return;
    setDeleting(true); setDeleteErr(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      onDeleted(); // parent signs out + redirects
    } catch (err) {
      setDeleteErr(err.message);
      setDeleting(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "var(--text-primary)" }}>Privacy &amp; Data</h1>

      <SettingsGroup label="Your data">
        <SettingsCard>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Export everything</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>Download a copy of your notes, conversations, and progress as JSON.</p>
          <GoldButton outline onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Download my data"}
          </GoldButton>
        </SettingsCard>
      </SettingsGroup>

      <SettingsGroup label="Danger zone">
        <SettingsCard danger>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Delete my account</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-tertiary)" }}>
            This permanently deletes all your notes, history, and progress. This cannot be undone.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder='Type DELETE to confirm'
              style={{ padding: "10px 12px", borderRadius: 9, background: "var(--bg-surface-2)", border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)", color: "var(--text-primary)", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
            />
            {deleteErr && <p style={{ margin: 0, fontSize: 12, color: "var(--error)" }}>{deleteErr}</p>}
            <GoldButton danger onClick={handleDelete} disabled={deleteInput !== "DELETE" || deleting}>
              {deleting ? "Deleting…" : "Delete account"}
            </GoldButton>
          </div>
        </SettingsCard>
      </SettingsGroup>
    </div>
  );
}
```

- [ ] **Step 2: Build check + commit**

```bash
npx next build
git add src/components/settings/PrivacySection.jsx
git commit -m "feat(settings): PrivacySection — export + delete account"
```

---

### Task 9: Settings Page — Wire Everything

**Files:**
- Create: `src/app/settings/page.js`

**Interfaces:**
- Consumes: all section components, `SettingsShell`, `DashboardProvider`, `useDashboard`, `TrackingProvider`
- Produces: `/settings` route, fully functional

- [ ] **Step 1: Create `src/app/settings/page.js`**

```js
// src/app/settings/page.js
"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";
import { TrackingProvider } from "@/components/providers/TrackingProvider";
import SettingsShell from "@/components/settings/SettingsShell";
import AccountSection       from "@/components/settings/AccountSection";
import PlanSection          from "@/components/settings/PlanSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import SupportSection       from "@/components/settings/SupportSection";
import PrivacySection       from "@/components/settings/PrivacySection";
import RouteSkeleton from "@/components/shared/RouteSkeleton";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const VALID_SECTIONS = ["account", "plan", "notifications", "support", "privacy"];

function SettingsInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useDashboard();
  const [token,   setToken]   = useState(null);
  const [section, setSection] = useState(() => {
    const p = searchParams.get("section");
    return VALID_SECTIONS.includes(p) ? p : "account";
  });

  // Auth guard + token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
    });
  }, [router]);

  // Sync section with URL param changes
  useEffect(() => {
    const p = searchParams.get("section");
    if (VALID_SECTIONS.includes(p)) setSection(p);
  }, [searchParams]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!token) return <RouteSkeleton sidebar />;

  return (
    <SettingsShell active={section} onNav={setSection} onSignOut={handleSignOut}>
      {section === "account"       && <AccountSection       user={user} />}
      {section === "plan"          && <PlanSection          user={user} />}
      {section === "notifications" && <NotificationsSection />}
      {section === "support"       && <SupportSection       token={token} />}
      {section === "privacy"       && <PrivacySection       token={token} onDeleted={handleSignOut} />}
    </SettingsShell>
  );
}

export default function SettingsPage() {
  return (
    <TrackingProvider surface="settings">
      <DashboardProvider>
        <Suspense fallback={<RouteSkeleton sidebar />}>
          <SettingsInner />
        </Suspense>
      </DashboardProvider>
    </TrackingProvider>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npx next build
```
Expected: EXIT 0. `/settings` appears in the static route table.

- [ ] **Step 3: Smoke test**

Start dev: `npm run dev`. Navigate to `http://localhost:3000/settings`.
- Should show the two-column layout.
- Click each nav item — section content should swap.
- On mobile width (≤640px) the nav should collapse to a horizontal icon strip.
- Sign out button should redirect to `/login`.

- [ ] **Step 4: Commit**

```bash
git add src/app/settings/page.js
git commit -m "feat(settings): settings page — all sections wired, auth guard, sign out"
```

---

### Task 10: Wire UserProfile Dropdown

**Files:**
- Modify: `src/components/ui/UserProfile.jsx` (lines ~509-521 — Settings and Help click handlers)

**Interfaces:**
- Consumes: existing `router` from `useRouter()` already in scope in `AccountDropdown`
- Produces: clicking "Settings" → `/settings`; clicking "Help" → `/settings?section=support`

- [ ] **Step 1: Update the two no-op handlers in `AccountDropdown`**

Find (around line 509):
```js
      {/* Settings */}
      <DropdownItem
        icon={<IconSettings />}
        label="Settings"
        onClick={() => { onClose(); }}
      />

      {/* Help */}
      <DropdownItem
        icon={<IconHelp />}
        label="Help"
        onClick={() => { onClose(); }}
      />
```

Replace with:
```js
      {/* Settings */}
      <DropdownItem
        icon={<IconSettings />}
        label="Settings"
        onClick={() => { onClose(); router.push("/settings"); }}
      />

      {/* Help */}
      <DropdownItem
        icon={<IconHelp />}
        label="Help"
        onClick={() => { onClose(); router.push("/settings?section=support"); }}
      />
```

- [ ] **Step 2: Build check**

```bash
npx next build
```
Expected: EXIT 0.

- [ ] **Step 3: Smoke test**

Open the dashboard. Click the account avatar/button (top-right). Click "Settings" → should navigate to `/settings`. Click account button again, click "Help" → should navigate to `/settings?section=support` with the Support section pre-selected.

- [ ] **Step 4: Grep-gate**

```bash
node scripts/grep-gate.mjs
```
Expected: `✓ Grep gate green. N files carry legacy hex — none introduced.`

- [ ] **Step 5: Final commit**

```bash
git add src/components/ui/UserProfile.jsx
git commit -m "feat(settings): wire Settings + Help in AccountDropdown → /settings"
```

---

## Post-implementation checklist

- [ ] Run `npx next build` one final time — EXIT 0 with zero errors
- [ ] Run `node scripts/grep-gate.mjs` — green
- [ ] Navigate to `/settings` — all 5 sections load, sign out works → `/login`
- [ ] Navigate to `/settings?section=support` — Support section pre-selected
- [ ] Test on mobile viewport — nav collapses to icon strip
- [ ] Apply DB migration to prod Supabase before launch (`supabase/migrations/20260701000001_support_requests.sql`)
