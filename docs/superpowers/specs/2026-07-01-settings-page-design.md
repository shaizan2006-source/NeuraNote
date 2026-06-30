# Settings Page — Design Spec
**Date:** 2026-07-01
**Status:** Approved by founder

---

## Overview

A dedicated `/settings` page with a warm, easy-going two-column layout: a fixed left nav rail with large icons and generous padding, and a scrollable right content pane where each section lives in soft rounded cards. Visual language matches the Obsidian & Aurum system — near-black base, platinum text, champagne-gold accents on the active nav item — but the tone is friendly ("Your account", "Your plan") not clinical.

Wired from: "Settings" in `AccountDropdown` → `router.push("/settings")`. "Help" → `router.push("/settings?section=support")`. The dropdown's existing "Log out" continues to work; a second sign-out appears at the bottom of the settings nav rail.

---

## Route & Providers

- **Route:** `src/app/settings/page.js`
- **Providers:** `DashboardProvider` + `TrackingProvider` (same pattern as `/dashboard` — needed for user/plan data). `DrawerProvider` not needed.
- **Auth guard:** On mount, `supabase.auth.getSession()` — no session → `router.push("/login")`.
- **Section routing:** Active section held in React state (`useState`). On mount, read `?section=` URL param to support deep-links (e.g. Help → `/settings?section=support`).
- **Loading:** `src/app/settings/loading.js` → `RouteSkeleton` (no sidebar variant).

---

## Layout — `SettingsShell`

### Desktop (> 640px)
```
┌─────────────────────────────────────────────────────┐
│  ← Dashboard          AskMyNotes Settings           │  ← top bar (32px, border-bottom)
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  Nav rail    │   Section content                     │
│  220px fixed │   flex:1, overflowY:auto, padding:32  │
│              │                                       │
│  [icon] Your │   Section title (22px, 700)           │
│  Account     │   ┌──────────────────────────────┐    │
│              │   │  soft card                   │    │
│  [icon] Plan │   │  (bg-surface, radius:16,     │    │
│              │   │   padding:24, border)        │    │
│  [icon] Noti │   └──────────────────────────────┘    │
│  fications   │                                       │
│              │                                       │
│  [icon] Supp │                                       │
│  ort         │                                       │
│              │                                       │
│  [icon] Priv │                                       │
│  acy         │                                       │
│              │                                       │
│  ──────────  │                                       │
│  Sign out    │                                       │
└──────────────┴──────────────────────────────────────┘
```

### Mobile (≤ 640px)
- Nav rail collapses to a horizontal scrollable tab strip pinned below the top bar.
- Each tab: icon only (with tooltip). Active tab has gold underline.
- Content pane: full-width, padding 20px 16px.

### Nav rail design
- Width: 220px, `background: var(--bg-surface)`, `border-right: 1px solid var(--border-hairline)`.
- Each nav item: 44px tall, `border-radius: 10px`, `padding: 0 12px`, `display: flex, gap: 10, align-items: center`.
- Icon: 18px inline SVG, `var(--text-tertiary)` inactive, `var(--accent)` active.
- Label: 13px, 500 weight, `var(--text-secondary)` inactive, `var(--text-primary)` active.
- Active background: `color-mix(in srgb, var(--accent) 9%, transparent)`.
- Active left border: `3px solid var(--accent)`, `border-radius: 0 10px 10px 0` on the right side.
- Hover: `background: var(--bg-surface-2)`.
- Sign-out: pinned at bottom, same style but `var(--error)` color on hover, always `var(--text-tertiary)` at rest.

### Section cards
- Background: `var(--bg-surface)`, border: `1px solid var(--border-hairline)`, `border-radius: 16px`, `padding: 24px`.
- Sections can have multiple cards stacked with `gap: 16px`.
- Section heading above card: 11px, 700, uppercase, `var(--text-tertiary)`, `letter-spacing: 0.08em` — like a group label.

---

## Sections

### 1. Your Account
**Card 1 — Identity**
- Avatar (circular, 72px). Clicking opens file picker → uploads to `avatars/{user.id}.ext` in Supabase Storage. Shows upload spinner in-place.
- Display name (editable input), username (editable input), email (read-only, `var(--text-tertiary)`).
- Single "Save changes" button at the bottom, gold gradient. Shows "Saved" checkmark for 2s on success.
- Uses existing `supabase.auth.updateUser({ data: { full_name, username } })` pattern from `ProfileModal`.

**Card 2 — Password**
- "Change your password" label + one-line description ("We'll send a reset link to your email.").
- "Send reset link" button (outline style). Fires `supabase.auth.resetPasswordForEmail(user.email)` → shows inline success note: "Check your inbox — link expires in 1 hour."
- No password inputs on this page (avoids re-auth complexity).

---

### 2. Your Plan
**Card 1 — Current plan**
- Plan name badge (color-coded: Free = muted, Student = blue tint, Pro = gold).
- If Free: friendly upgrade prompt with `PremiumMark` icon + "Unlock unlimited questions, PDFs, and more." + "Upgrade" button → `/pricing`.
- If paid: renewal date (from `user_plans.expires_at`), "Manage subscription" link → `/pricing`.

**Card 2 — Usage this month**
- Q&A used today / daily limit — animated progress bar (gold fill, `var(--bg-inset)` track).
- PDFs uploaded / PDF limit — same bar style.
- Free plan shows limit; unlimited plans show "Unlimited" with a soft checkmark.
- Data from `GET /api/settings/plan` (new route — single query combining `user_plans` + `qa_usage` + document count).

---

### 3. Notifications
**Card 1 — Push notifications**
- Toggle switch (custom, gold when on). Label: "Study reminders & streaks". Subtext: "Get nudged when it's time to review or keep your streak alive."
- On enable: calls `subscribeUser()` from `src/lib/push.js`. On disable: calls `unsubscribeUser()`.
- If `Notification.permission === 'denied'`: show a muted notice "Notifications are blocked in your browser — update this in browser settings."
- If Push API not available: show "Not supported in this browser."

---

### 4. Support
**Card 1 — Contact us**
- Friendly heading: "We're here to help."
- Subject select: Bug report / Billing question / Feature idea / Other.
- Message textarea (4 rows min).
- "Send message" button → `POST /api/support` → inserts row into `support_requests` table `(id, user_id, subject, message, created_at)`. On success: replaces form with "Message sent — we'll get back to you within 24 hours."

**Card 2 — Info**
- App version: `v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}` (env var, can be set on Vercel).
- "View changelog" — placeholder link for now.

---

### 5. Privacy & Data
**Card 1 — Your data**
- "Export everything" button → `GET /api/account/export` → streams a JSON file download containing: documents list, Q&A history from `conversations`, progress from `daily_progress`, streak from `study_streaks`. Response header: `Content-Disposition: attachment; filename="askmynotes-export.json"`.

**Card 2 — Danger zone**
- Visually separated (red-tinted border: `1px solid color-mix(in srgb, var(--error) 25%, transparent)`).
- "Delete my account" button (outline red). Opens an inline confirmation: text input expecting the word DELETE + confirm button. On confirm → `POST /api/account/delete` → calls `anonymize.js` logic → `supabase.auth.signOut()` → `router.push("/login")`.
- Warning copy: "This permanently deletes all your notes, history, and progress. This cannot be undone."

---

## New API Routes

### `GET /api/settings/plan`
Auth: `verifyAuth`. Uses existing helpers from `src/lib/planLimits.js`: `getUserPlan(userId)`, `countTodayQA(userId)`, `countUserPDFs(userId)` — all run in parallel via `Promise.all`. Returns `{ plan, expiresAt, qaUsedToday, qaLimit, pdfCount, pdfLimit }` where `qaLimit` and `pdfLimit` are read from `PLANS[plan]`.

### `POST /api/support`
Auth: `verifyAuth`. Body: `{ subject, message }`. Inserts into `support_requests(id, user_id, subject, message, created_at)`. Returns `{ ok: true }`. No third-party email needed at launch.

### `GET /api/account/export`
Auth: `verifyAuth`. Parallel queries: documents, conversations (last 200), daily_progress (last 90 days), study_streaks. Streams `Content-Type: application/json` with `Content-Disposition: attachment`. Cap: 200 conversations to avoid timeouts.

### `POST /api/account/delete`
Auth: `verifyAuth`. Calls `anonymizeUser(user.id)` (named export from `src/lib/privacy/anonymize.js` — already exists). On success returns `{ ok: true }`. Client then calls `supabase.auth.signOut()` and redirects to `/login`.

---

## New DB Table

```sql
CREATE TABLE IF NOT EXISTS support_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own" ON support_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Added to `supabase/migrations/` as `20260701000001_support_requests.sql`.

---

## File Map

| File | Type |
|---|---|
| `src/app/settings/page.js` | New — page shell, auth guard, section state |
| `src/app/settings/loading.js` | New — RouteSkeleton |
| `src/components/settings/SettingsShell.jsx` | New — two-column layout + mobile tabs |
| `src/components/settings/AccountSection.jsx` | New |
| `src/components/settings/PlanSection.jsx` | New |
| `src/components/settings/NotificationsSection.jsx` | New |
| `src/components/settings/SupportSection.jsx` | New |
| `src/components/settings/PrivacySection.jsx` | New |
| `src/app/api/settings/plan/route.js` | New |
| `src/app/api/support/route.js` | New |
| `src/app/api/account/export/route.js` | New |
| `src/app/api/account/delete/route.js` | New |
| `supabase/migrations/20260701000001_support_requests.sql` | New |
| `src/components/ui/UserProfile.jsx` | Modified — wire Settings + Help clicks |

---

## Design Tokens (all from `variables.css` — no hard-coded hex)

Active nav: `var(--accent)`, `color-mix(in srgb, var(--accent) 9%, transparent)`
Cards: `var(--bg-surface)`, `var(--border-hairline)`
Danger zone border: `color-mix(in srgb, var(--error) 25%, transparent)`
Progress bar fill: `var(--accent-grad)`
Sign-out hover: `var(--error)`

---

## Non-goals (out of scope)
- Email notification preferences (no email provider wired at launch)
- Two-factor authentication
- Connected accounts / OAuth providers
- Team / family seat management (handled via `/pricing`)
