# Sprint 02 — Implementation
*Weeks 5-8: Retention Engine, Briefing, Cohort, Photo Doubt Cam, Pricing Live*
*For: Ask-My-Notes solo founder — Claude Code execution-ready*
*Date: May 2026*

---

## 0. How to read this

Same structure as Sprint 01. Each task is paste-ready into Claude Code.

Before Sprint 2, verify Sprint 1 is "done enough":
- Phase 0 work complete
- Brain Map in production
- Onboarding rewritten
- Pricing schema in place
- Empty state shipped
- No major regressions

If any of those aren't done, finish them in Week 5 before adding new features. The retention engine doesn't compound on a broken foundation.

---

## Sprint 2 outcome targets

By end of Week 8:
- Push notifications working (Android + iOS PWA)
- Daily Briefing audio generated and delivered to 100+ users
- Cohort system live with weekly leaderboards
- Photo Doubt Cam shipped on mobile
- New pricing tiers live with 7-day Pro trial flow
- Streak Freeze auto-applied
- Sunday Weekly Recap delivered
- Friday Quiz live
- **At least 50 paying users** (organic + minimal outreach)
- Day-30 retention visibly improving vs baseline (target: 18%+)

---

## Week 5 — Push Notification Infrastructure

The goal of Week 5: **build the rails for the retention engine.** Without push notifications + dispatcher cron + preference UI, none of the touchpoints land. This week is plumbing.

---

### Day 21 (Monday) — VAPID keys + service worker

**Why:** Web Push requires VAPID (Voluntary Application Server Identification) keys + a service worker registered on the client.

**Acceptance criteria:**
- [ ] VAPID public/private keypair generated, stored in env vars
- [ ] Service worker file at `/public/sw.js` registered on app load
- [ ] Service worker handles `push` events
- [ ] Service worker handles `notificationclick` events (deep-link to app)
- [ ] Client requests permission only at the right moment (not on first visit)

**Claude Code prompt:**

```
TASK: Set up Web Push infrastructure — VAPID + service worker
SPRINT: 2, Week 5, Day 21
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.3 + RETENTION_ENGINE_BLUEPRINT.md Section 5 + MOBILE_AND_GAMIFICATION.md Section 7

ACCEPTANCE CRITERIA:
- Generate VAPID keys (one-time): use web-push library's generateVAPIDKeys()
- Add to env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:founder@...)
- /public/sw.js service worker:
  - Listens for 'push' events → shows notification via self.registration.showNotification()
  - Listens for 'notificationclick' → focuses or opens the app + deep links
- Client-side: register sw.js on app load (only in production, behind feature flag during dev)
- Permission request happens via a custom function, NOT auto-requested
- Subscription payload sent to /api/push/subscribe

Files to create:
- public/sw.js
- lib/push.js (client-side helpers: subscribeUser, unsubscribeUser, getPermissionState)
- app/api/push/subscribe/route.js
- app/api/push/unsubscribe/route.js

Service worker pattern:
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: { url: payload.url || '/', notificationType: payload.type },
    requireInteraction: false,
    silent: false,
  };
  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      return clients.openWindow(url);
    })
  );
});

CRITICAL:
- Don't auto-request permission. Only when user explicitly opts in.
- Don't register SW on /dev/* routes.
- Cache busting: sw.js version bump on every deploy.

VERIFICATION:
1. Visit app, service worker registers (DevTools → Application → Service Workers)
2. Manually call subscribeUser() in console → permission prompt
3. Accept → /api/push/subscribe receives subscription payload
4. push_subscriptions row inserted
```

**Time estimate:** 4-5 hours.

---

### Day 22 (Tuesday) — Push subscription endpoints + DB schema

**Acceptance criteria:**
- [ ] `push_subscriptions` table created
- [ ] `notification_preferences` table created (with defaults)
- [ ] `notification_log` table created
- [ ] `/api/push/subscribe` saves subscription (idempotent: same endpoint replaces)
- [ ] `/api/push/unsubscribe` removes by endpoint
- [ ] `/api/notifications/preferences` (GET + PATCH)
- [ ] RLS policies for all 3 tables

**Claude Code prompt:**

```
TASK: Push subscription + preferences schema + endpoints
SPRINT: 2, Week 5, Day 22
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.3

ACCEPTANCE CRITERIA:
- 3 tables created with migrations:
  - push_subscriptions (user_id, endpoint, p256dh, auth, device_info, last_used_at)
  - notification_preferences (user_id PK, briefing_enabled, briefing_time INT (minutes from midnight), midday_enabled+time, focus_anchor_enabled+time, night_closure_enabled+time, cohort_updates_enabled, care_nudges_enabled)
  - notification_log (id, user_id, notification_type, sent_at, delivered, clicked_at)
- Defaults: briefing 420 (7am), midday 780 (1pm), focus_anchor 1080 (6pm), night_closure 1260 (9pm), all enabled=TRUE
- /api/push/subscribe: idempotent upsert on (user_id, endpoint)
- /api/push/unsubscribe: delete row by endpoint
- GET/PATCH /api/notifications/preferences
- RLS: user can only access own rows
- On user signup, default notification_preferences row created (via trigger or post-signup hook)

Files to create:
- supabase/migrations/<ts>_push_notifications_schema.sql
- app/api/push/subscribe/route.js
- app/api/push/unsubscribe/route.js
- app/api/notifications/preferences/route.js (GET + PATCH)

Migration:
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_enabled BOOLEAN DEFAULT TRUE,
  briefing_time INT DEFAULT 420,
  midday_enabled BOOLEAN DEFAULT TRUE,
  midday_time INT DEFAULT 780,
  focus_anchor_enabled BOOLEAN DEFAULT TRUE,
  focus_anchor_time INT DEFAULT 1080,
  night_closure_enabled BOOLEAN DEFAULT TRUE,
  night_closure_time INT DEFAULT 1260,
  cohort_updates_enabled BOOLEAN DEFAULT TRUE,
  care_nudges_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN,
  clicked_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX notification_log_user_sent_idx ON notification_log (user_id, sent_at DESC);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_owner_all" ON push_subscriptions 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_prefs_owner_all" ON notification_preferences 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_log_owner_read" ON notification_log 
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger: create default preferences on signup
CREATE OR REPLACE FUNCTION create_default_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_signup_create_notif_prefs
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION create_default_notification_prefs();

VERIFICATION:
1. New signup → notification_preferences row auto-created with defaults
2. subscribe endpoint stores subscription
3. unsubscribe removes it
4. GET preferences returns current state
5. PATCH preferences updates fields
6. RLS prevents reading other users' data
```

**Time estimate:** 3-4 hours.

---

### Day 23 (Wednesday) — Notification dispatcher cron

**Why:** Without a dispatcher, scheduled notifications never fire. This is the engine of the retention loop.

**Acceptance criteria:**
- [ ] Cron job runs every 5 minutes
- [ ] Computes current time-of-day per user timezone
- [ ] Finds users where any notification's time matches current 5-min bucket AND enabled
- [ ] Applies all guardrails (10pm-7am silence, slump silence, exam-day silence, 4/day cap)
- [ ] Sends Web Push via web-push library
- [ ] Logs to `notification_log`

**Claude Code prompt:**

```
TASK: Build notification dispatcher cron
SPRINT: 2, Week 5, Day 23
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 5 + ELITE_FEATURE_ARCHITECTURE.md F2.3

ACCEPTANCE CRITERIA:
- Cron schedule: every 5 minutes
- Implementation: Vercel cron (vercel.json) hitting /api/cron/dispatch-notifications
- Logic per run:
  1. For each notification type (briefing, midday, focus_anchor, night_closure):
     a. Find users where: enabled=TRUE AND (current_minute_of_day - notification_time) BETWEEN 0 AND 4
        (use user's timezone — profiles.timezone or default 'Asia/Kolkata')
     b. Apply guardrails:
        - SKIP if hour >= 22 OR hour < 7 (night silence)
        - SKIP if hour >= 14 AND hour < 17 AND no_session_today (slump silence for inactive)
        - SKIP if today = exam_date (exam day silence)
        - SKIP if 4+ notifications already sent today
     c. Generate notification payload (copy varies per type, see retention doc)
     d. Send via Web Push to all subscriptions for user
     e. Log each send to notification_log
- Authentication: cron endpoint protected by CRON_SECRET env var (Vercel pattern)

Files to create:
- app/api/cron/dispatch-notifications/route.js
- lib/notifications/dispatcher.js
- lib/notifications/copy.js (notification copy templates per type)
- lib/notifications/guardrails.js
- vercel.json (cron config)

vercel.json:
{
  "crons": [
    { "path": "/api/cron/dispatch-notifications", "schedule": "*/5 * * * *" }
  ]
}

Dispatcher pseudocode:
async function dispatchNotifications() {
  const now = new Date();
  const buckets = ['briefing', 'midday', 'focus_anchor', 'night_closure'];
  
  for (const bucket of buckets) {
    const eligibleUsers = await findUsersDueForBucket(bucket, now);
    
    for (const user of eligibleUsers) {
      // Guardrails
      if (await shouldSkipForGuardrails(user, bucket, now)) continue;
      
      // Build payload
      const payload = await buildNotificationPayload(bucket, user);
      
      // Get user's push subscriptions
      const subs = await getSubscriptions(user.id);
      
      // Send to each
      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload));
          await logNotification(user.id, bucket, true);
        } catch (err) {
          if (err.statusCode === 410) {
            // Subscription expired
            await removeSubscription(sub.endpoint);
          } else {
            Sentry.captureException(err, { tags: { feature: 'push_dispatch' }});
          }
        }
      }
    }
  }
}

Guardrails function:
async function shouldSkipForGuardrails(user, bucket, now) {
  const localTime = toUserLocalTime(now, user.timezone);
  const hour = localTime.getHours();
  
  // Night silence
  if (hour >= 22 || hour < 7) return true;
  
  // Slump silence (2-5pm for users who haven't studied today)
  if (hour >= 14 && hour < 17) {
    const studiedToday = await hasStudiedToday(user.id);
    if (!studiedToday) return true;
  }
  
  // Exam day silence
  if (user.exam_date && isSameDayInTz(user.exam_date, now, user.timezone)) return true;
  
  // 4/day cap
  const sentToday = await countNotificationsSentToday(user.id);
  if (sentToday >= 4) return true;
  
  return false;
}

VERIFICATION:
1. Set user's briefing_time to current minute → cron fires within 5 min → notification arrives
2. Set time to 11pm → cron runs but skips (night silence)
3. Set time to 3pm + no session today → cron runs but skips (slump)
4. Set exam_date to today → cron skips entirely for user
5. Send 4 manually → 5th request blocked
6. Notification_log table populated correctly
```

**Time estimate:** 5-6 hours. Critical task — test thoroughly.

---

### Day 24 (Thursday) — Notification preferences UI + permission prompt timing

**Acceptance criteria:**
- [ ] Settings page has "Notifications" section
- [ ] Master toggle for all
- [ ] Per-type toggles with time pickers
- [ ] Display: "Max 4 per day. We respect your sleep + your slump."
- [ ] Permission prompt at session 3+ (not on first visit)
- [ ] If denied, show instructions to re-enable in browser settings

**Claude Code prompt:**

```
TASK: Notification preferences UI + smart permission prompt
SPRINT: 2, Week 5, Day 24
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 5 + MOBILE_AND_GAMIFICATION.md Section 2 (PWA install)

ACCEPTANCE CRITERIA:
- Settings → Notifications subsection
- Master toggle (disables all if off)
- 4 per-type rows:
  - Morning Briefing | toggle | time picker (default 7:00 AM)
  - Lunch Micro | toggle | time picker (default 1:00 PM)
  - Focus Anchor | toggle | time picker (default 6:00 PM)
  - Night Closure | toggle | time picker (default 9:00 PM)
- Cohort updates + Care nudges as separate toggles below
- Footer text: "Max 4 per day. We respect your sleep + your slump."
- Permission prompt UX:
  - Tracked: count user sessions
  - On session 3+, show inline prompt: "Want a 90-second Briefing each morning? [Yes — at 7:00 AM] [Not right now]"
  - If "Yes" → trigger permission request
  - If "Not right now" → don't ask again for 14 days
  - If permission denied previously → show "How to enable" instructions

Files to create:
- app/settings/notifications/page.js (or section)
- components/settings/NotificationPreferences.jsx
- components/banners/NotificationPermissionPrompt.jsx
- lib/sessionCounter.js (track session count in localStorage)

Settings UI pattern:
- Use shadcn/ui Switch + Select components
- Time picker: hours in 30-min increments (12:00, 12:30, 1:00, ...)
- Save on change (PATCH /api/notifications/preferences debounced 500ms)
- Toast confirmation on save

Permission state handling:
const permissionState = Notification.permission;
// 'default' (never asked), 'granted', 'denied'
if (permissionState === 'denied') {
  showInstructions(); // browser-specific guidance
} else if (permissionState === 'default' && sessionCount >= 3) {
  showInlinePrompt();
}

VERIFICATION:
1. Settings → toggle off Morning Briefing → preferences updated
2. Toggle back on, change time → preferences updated
3. New user, session 1-2 → no prompt
4. Session 3 → prompt appears once
5. Dismiss → doesn't reappear for 14 days (track in localStorage)
6. Deny browser permission → "How to enable" instructions shown
```

**Time estimate:** 4-5 hours.

---

### Day 25 (Friday) — Test full push flow + Week 5 polish

**Tasks:**
- A. End-to-end test: signup → enable push → wait for cron → notification arrives → click → app opens to right screen
- B. Test on real iOS PWA (after install) and Android Chrome
- C. Document edge cases discovered
- D. Polish notification copy from `RETENTION_ENGINE_BLUEPRINT.md` Section 5

**Acceptance criteria:**
- [ ] Push works on Android Chrome
- [ ] Push works on iOS Safari (PWA only, iOS 16.4+)
- [ ] All 4 daily notification types deliver
- [ ] Deep-link from notification opens correct screen
- [ ] Notification log shows all sends accurately
- [ ] Sentry captures any push failures

---

### Week 5 done test

```bash
# 1. Subscribe via UI → push_subscriptions row added
# 2. Settings notification preferences UI works
# 3. Permission prompt timing correct (session 3+)
# 4. Cron dispatcher runs every 5 min in production (check Vercel logs)
# 5. Test notification arrives on real device
# 6. Guardrails enforced (test by mocking conditions)
# 7. Sentry quiet
```

---

## Week 6 — Daily Briefing + Cohort System

The goal of Week 6: **two of the highest-impact retention features.** Daily Briefing creates the morning ritual. Cohort creates belonging.

---

### Day 26 (Monday) — Briefing generation pipeline

**Acceptance criteria:**
- [ ] Nightly cron at 2am IST generates briefings for active users
- [ ] Active = streak ≥3 OR session in last 3 days
- [ ] Content: gpt-4o-mini prompt with personalization context
- [ ] Transcript stored, audio file generated via TTS-1
- [ ] Audio uploaded to `briefings/<user_id>/<date>.mp3`
- [ ] `daily_briefings` row inserted
- [ ] Push notification sent at user's `briefing_time` (handled by dispatcher from Week 5)

**Claude Code prompt:**

```
TASK: Build Daily Briefing generation pipeline
SPRINT: 2, Week 6, Day 26
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.1 + AI_SYSTEMS_ARCHITECTURE.md Section 6 (Briefing prompt)

ACCEPTANCE CRITERIA:
- Schema migration: daily_briefings table (id, user_id, briefing_date, audio_url, transcript, generated_at, delivered_at, listened_at)
- UNIQUE constraint: (user_id, briefing_date)
- Cron job: 0 2 * * * (2am IST, which is 20:30 UTC)
- For each active user:
  1. Build personalization context
  2. Call gpt-4o-mini with BRIEFING_PROMPT_V1
  3. Get transcript (150-220 words)
  4. Call OpenAI TTS-1 with transcript → MP3
  5. Upload MP3 to Supabase Storage briefings/<user_id>/<YYYY-MM-DD>.mp3
  6. Insert daily_briefings row with audio_url + transcript
  7. Log cost to ai_call_log
- /api/briefings/today endpoint returns today's briefing
- /api/briefings/listened logs when played

Files to create:
- supabase/migrations/<ts>_daily_briefings_schema.sql
- app/api/cron/generate-briefings/route.js
- lib/briefings/generator.js
- lib/briefings/prompt.js (BRIEFING_PROMPT_V1)
- app/api/briefings/today/route.js
- app/api/briefings/listened/route.js

Schema:
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL,
  audio_url TEXT,
  transcript TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  listened_at TIMESTAMPTZ,
  duration_seconds INT,
  generation_cost_usd DECIMAL(10, 6),
  UNIQUE (user_id, briefing_date)
);
CREATE INDEX daily_briefings_user_date_idx ON daily_briefings (user_id, briefing_date DESC);
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefings_owner_read" ON daily_briefings
  FOR SELECT USING (auth.uid() = user_id);

vercel.json add:
{ "path": "/api/cron/generate-briefings", "schedule": "30 20 * * *" }

BRIEFING_PROMPT_V1 (in lib/briefings/prompt.js):
[Full prompt from AI_SYSTEMS_ARCHITECTURE.md Section 6, expanded with all parameters]

Generator pattern:
async function generateBriefingForUser(userId) {
  // 1. Build context
  const context = await buildBriefingContext(userId);
  
  // 2. Generate transcript
  const transcript = await callOpenAI({
    model: 'gpt-4o-mini',
    prompt: BRIEFING_PROMPT_V1.render(context),
    temperature: 0.7,
    max_tokens: 350,
  });
  
  // 3. Generate audio (TTS-1, voice 'nova')
  const audioBuffer = await callOpenAITTS({
    model: 'tts-1',
    voice: 'nova',
    input: transcript,
  });
  
  // 4. Upload to storage
  const audioPath = `${userId}/${today()}.mp3`;
  await supabase.storage.from('briefings').upload(audioPath, audioBuffer, {
    contentType: 'audio/mpeg',
  });
  const { data: { signedUrl } } = await supabase.storage
    .from('briefings').createSignedUrl(audioPath, 86400); // 24h
  
  // 5. Insert row
  await supabase.from('daily_briefings').insert({
    user_id: userId,
    briefing_date: today(),
    audio_url: signedUrl,
    transcript,
    duration_seconds: estimateDuration(transcript),
    generation_cost_usd: calculateCost(transcript),
  });
  
  // 6. Log to ai_call_log
  await logAICall({ user_id: userId, call_type: 'briefing', /*...*/ });
}

Cost control:
- Skip users in Free tier? NO — briefing is core value, applies to all tiers
- Cap: only generate for active users (saves cost)
- Daily cost target: <$0.04 per briefing per user

VERIFICATION:
1. Manually trigger cron for one user → briefing generated within 30s
2. daily_briefings row inserted, audio_url valid
3. /api/briefings/today returns it
4. Audio plays in browser
5. Listened endpoint logs timestamp
6. ai_call_log shows briefing cost
```

**Time estimate:** 6-7 hours. Big task.

---

### Day 27 (Tuesday) — Briefing player UI

**Acceptance criteria:**
- [ ] Briefing player widget on Morning Mode dashboard
- [ ] Shows: voice icon, "Your Briefing", duration, transcript preview
- [ ] Play/pause control
- [ ] Tap to expand → full transcript view + waveform
- [ ] "Listened" logged when audio plays for ≥80% of duration
- [ ] If no briefing today, widget hides gracefully

**Claude Code prompt:**

```
TASK: Build Briefing player UI widget
SPRINT: 2, Week 6, Day 27
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.1 + UI_UX_SYSTEM.md Section 5 (Morning Mode)

ACCEPTANCE CRITERIA:
- Component: <BriefingPlayer /> for dashboard Morning Mode
- States:
  - Loading: skeleton
  - No briefing today: hidden (don't show empty state)
  - Briefing available: collapsed player
  - Playing: expanded with progress
- Collapsed view: voice icon, "Your Briefing", duration, [Listen] button
- Expanded view: full transcript + audio progress bar + pause control
- On play start: POST /api/briefings/listened (fire and forget)
- On audio end (or 80% threshold): mark as fully listened
- Mobile: tap to expand goes to bottom sheet

Files to create:
- components/briefings/BriefingPlayer.jsx
- components/briefings/BriefingTranscript.jsx

Files to modify:
- components/dashboard/modes/MorningMode.jsx (include BriefingPlayer)

Audio player pattern:
- Use HTML5 <audio> element with controls hidden, custom UI
- Track currentTime via timeupdate event
- When currentTime/duration > 0.8, mark listened
- Preload metadata, lazy load audio data

VERIFICATION:
1. Morning Mode dashboard → player shows
2. Click play → audio plays
3. Listen ≥80% → listened_at logged
4. Refresh → player remembers listened state
5. No briefing today → widget hidden
6. Mobile: bottom sheet expand works
```

**Time estimate:** 4-5 hours.

---

### Day 28 (Wednesday) — Cohort assignment + anonymous handles

**Acceptance criteria:**
- [ ] `cohorts`, `cohort_members`, `cohort_leaderboard_snapshots` tables created
- [ ] Cohort assignment logic: `${exam_type}_${exam_year}_${region}_${class_level}`
- [ ] Anonymous handle generation: `${adjective}-${noun}-${3-digit}`
- [ ] Onboarding completion now assigns cohort + handle
- [ ] User can regenerate handle once
- [ ] `/api/cohort/me` returns user's cohort + handle + count

**Claude Code prompt:**

```
TASK: Cohort system — assignment, handles, member tracking
SPRINT: 2, Week 6, Day 28
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.2 + MOBILE_AND_GAMIFICATION.md Section 10 (Identity System 3)

ACCEPTANCE CRITERIA:
- 3 tables created (cohorts, cohort_members, cohort_leaderboard_snapshots)
- Cohort ID format: lowercased "{exam_type}_{exam_year}_{region}_{class_level}"
  Example: "jee_main_2027_south_class11"
- Anonymous handle: "{adj}-{noun}-{NNN}" where NNN is 100-999
  Example: "swift-tiger-247"
- Handle dictionaries: 50 adjectives + 50 nouns (no offensive combinations)
- Onboarding completion calls assignCohort(userId, profile) RPC or fn
- /api/cohort/me returns { cohort_id, cohort_name, member_count, my_handle, my_rank? }
- /api/cohort/regenerate-handle: user can regenerate ONCE (track in profiles.handle_regenerated_at)

Files to create:
- supabase/migrations/<ts>_cohorts_schema.sql
- lib/cohorts/assignment.js
- lib/cohorts/handles.js (adjective + noun lists, generator)
- app/api/cohort/me/route.js
- app/api/cohort/regenerate-handle/route.js

Files to modify:
- app/api/onboarding/complete/route.js (call assignCohort at end)

Schema:
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  exam_type TEXT NOT NULL,
  exam_year INT NOT NULL,
  region TEXT NOT NULL,
  class_level TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  display_handle TEXT NOT NULL,
  handle_regenerated_at TIMESTAMPTZ,
  PRIMARY KEY (cohort_id, user_id),
  UNIQUE (cohort_id, display_handle)
);

CREATE INDEX cohort_members_user_idx ON cohort_members (user_id);

CREATE TABLE IF NOT EXISTS cohort_leaderboard_snapshots (
  cohort_id TEXT REFERENCES cohorts(id) ON DELETE CASCADE,
  snapshot_date DATE,
  rankings JSONB,
  PRIMARY KEY (cohort_id, snapshot_date)
);

ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Cohort metadata readable by members
CREATE POLICY "cohorts_member_read" ON cohorts FOR SELECT
  USING (id IN (SELECT cohort_id FROM cohort_members WHERE user_id = auth.uid()));

-- Cohort members readable by other members (so leaderboard works)
CREATE POLICY "cohort_members_co_member_read" ON cohort_members FOR SELECT
  USING (cohort_id IN (SELECT cohort_id FROM cohort_members WHERE user_id = auth.uid()));

-- Leaderboard snapshots readable by members
CREATE POLICY "leaderboard_member_read" ON cohort_leaderboard_snapshots FOR SELECT
  USING (cohort_id IN (SELECT cohort_id FROM cohort_members WHERE user_id = auth.uid()));

Handle generator (no offensive combinations):
const ADJECTIVES = ['swift', 'quiet', 'bright', 'calm', 'brave', 'sharp', 'nimble', 'steady', 'gentle', 'kind', /* ... 50 total */];
const NOUNS = ['tiger', 'fox', 'eagle', 'otter', 'deer', 'hawk', 'lynx', 'crane', 'wolf', 'crow', /* ... 50 total, animals work well */];

function generateHandle() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = String(100 + Math.floor(Math.random() * 900));
  return `${adj}-${noun}-${num}`;
}

// Retry on uniqueness collision (rare)

Cohort assignment:
async function assignCohort(userId, profile) {
  const cohortId = `${profile.exam_type}_${profile.exam_year}_${profile.region}_${profile.class_level}`.toLowerCase();
  
  // Upsert cohort
  await supabase.from('cohorts').upsert({
    id: cohortId,
    exam_type: profile.exam_type,
    exam_year: profile.exam_year,
    region: profile.region,
    class_level: profile.class_level,
    name: humanReadableName(cohortId),
  });
  
  // Assign membership + handle
  let handle = generateHandle();
  let attempts = 0;
  while (attempts < 5) {
    try {
      await supabase.from('cohort_members').insert({
        cohort_id: cohortId,
        user_id: userId,
        display_handle: handle,
      });
      break;
    } catch (e) {
      if (isUniqueViolation(e)) {
        handle = generateHandle();
        attempts++;
      } else throw e;
    }
  }
  
  // Update profile.cohort_id
  await supabase.from('profiles').update({ cohort_id: cohortId }).eq('id', userId);
  
  return { cohortId, handle };
}

VERIFICATION:
1. New user completes onboarding → cohort row created (or exists)
2. cohort_members row inserted with anonymous handle
3. Profile.cohort_id set
4. /api/cohort/me returns correct data
5. Regenerate handle once → works; second attempt → 400
6. RLS prevents seeing other cohorts' data
```

**Time estimate:** 5-6 hours.

---

### Day 29 (Thursday) — Cohort presence (realtime) + dashboard widget

**Acceptance criteria:**
- [ ] Realtime presence subscription on cohort channel
- [ ] Each open app counts as "active" in cohort
- [ ] Dashboard widget shows "N members studying right now" (with subtle pulse)
- [ ] Updates live as users join/leave

**Claude Code prompt:**

```
TASK: Cohort presence (realtime) + dashboard widget
SPRINT: 2, Week 6, Day 29
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.2 + TECHNICAL_ARCHITECTURE.md Section 4 (Realtime patterns)

ACCEPTANCE CRITERIA:
- On app load, user joins their cohort's Supabase Realtime channel as presence
- Channel: cohort:<cohort_id>
- Active count = unique users in presence
- <CohortPresence /> widget on dashboard shows:
  "[Cohort name]. N members studying right now."
- Pulse animation on dot every 4s
- Clean unsubscribe on tab close / route change

Files to create:
- components/dashboard/CohortPresence.jsx
- hooks/useCohortPresence.js

Pattern:
function useCohortPresence(cohortId, handle) {
  const [activeCount, setActiveCount] = useState(0);
  
  useEffect(() => {
    if (!cohortId) return;
    
    const channel = supabase
      .channel(`cohort:${cohortId}`, {
        config: { presence: { key: handle } }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setActiveCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ status: 'active' });
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [cohortId, handle]);
  
  return activeCount;
}

Widget UX:
- Small card on Standard Mode + Morning Mode dashboard
- Style: subtle, calm, not aggressive
- "JEE 2027 Bangalore — 312 members studying right now"
- Tap → /cohort page
- Pulse dot animates every 4s (CSS keyframe)

VERIFICATION:
1. Open app in 2 different browsers (same cohort) → count shows 2
2. Close one → count drops to 1
3. Widget updates without page refresh
4. Disconnect → cleanup runs
5. No memory leak after many subscribe/unsubscribe cycles
```

**Time estimate:** 3-4 hours.

---

### Day 30 (Friday) — Cohort leaderboard page

**Acceptance criteria:**
- [ ] `/cohort` page renders top 100 by weekly Focus Score
- [ ] User's row sticky-highlighted (auto-scroll to their position)
- [ ] Cold-start handling (<30 members)
- [ ] Cohort leaderboard snapshot cron job (Sunday 8pm IST)

**Claude Code prompt:**

```
TASK: Cohort leaderboard page + snapshot cron
SPRINT: 2, Week 6, Day 30
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.2 + UI_UX_SYSTEM.md Section 11

ACCEPTANCE CRITERIA:
- /cohort page
- Top header: cohort name + total member count + active count
- Body: ranked list of top 100 by Focus Score (last 7 days)
- Each row: rank, handle, Focus Score
- User's row highlighted, auto-scroll into view
- Empty/cold state: "Cohort building (X members so far). Leaderboard activates at 30 members."
- /api/cohort/leaderboard returns current snapshot
- Cron: Sunday 8pm IST creates leaderboard_snapshots row per cohort

Files to create:
- app/cohort/page.js
- app/api/cohort/leaderboard/route.js
- app/api/cron/cohort-leaderboard-snapshot/route.js
- vercel.json add cron schedule

Focus Score formula (from existing progressUtils if available):
Focus Score = (study_minutes_this_week / 60) * consistency_factor * mastery_delta_this_week
Cap at 100. Normalize across cohort.

Snapshot generation:
async function snapshotCohortLeaderboards() {
  const cohorts = await supabase.from('cohorts').select('id');
  for (const cohort of cohorts) {
    const rankings = await computeRankingsForCohort(cohort.id);
    await supabase.from('cohort_leaderboard_snapshots').upsert({
      cohort_id: cohort.id,
      snapshot_date: today(),
      rankings,
    });
  }
}

vercel.json add:
{ "path": "/api/cron/cohort-leaderboard-snapshot", "schedule": "30 14 * * 0" }

UI patterns:
- Use shadcn/ui Table component
- Sticky header
- Smooth scroll to user's row on mount

VERIFICATION:
1. Manually trigger snapshot cron → snapshot rows created
2. /cohort renders top 100
3. Auto-scrolls to user's rank
4. Empty cohort → "Cohort building"
5. User in top 100 → highlighted
6. User outside top 100 → shown at bottom with "Your rank: #X"
```

**Time estimate:** 4-5 hours.

---

### Week 6 done test

```
[ ] Daily Briefing generated for active users (verified with manual trigger)
[ ] Briefing player widget works on dashboard
[ ] Cohort assignment on signup
[ ] Anonymous handles generated
[ ] Cohort presence widget showing live count
[ ] /cohort leaderboard page works
[ ] Weekly snapshot cron scheduled
[ ] No regressions
```

---

## Week 7 — Photo Doubt Cam + Pricing Live + Streak Freeze

The goal of Week 7: **first differentiation feature ships + pricing goes live + retention recovery mechanic.**

---

### Day 31 (Monday) — Photo Doubt Cam: backend

**Acceptance criteria:**
- [ ] `photo_doubts` table created
- [ ] `/api/photo-doubt` endpoint accepts image + optional text
- [ ] Calls GPT-4o Vision for question extraction + subject detection
- [ ] Uses extracted text for vector search in user's chunks
- [ ] Streams answer back via standard streaming protocol
- [ ] Stores image with 30-day expiry

**Claude Code prompt:**

```
TASK: Photo Doubt Cam — backend pipeline
SPRINT: 2, Week 7, Day 31
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.5 + AI_SYSTEMS_ARCHITECTURE.md Section 6 (Vision prompt)

ACCEPTANCE CRITERIA:
- Schema migration: photo_doubts table (id, user_id, conversation_id, image_url, recognized_text, subject_detected, created_at, delete_after)
- 30-day delete_after expiry
- /api/photo-doubt endpoint:
  - Multipart form upload
  - Image compressed to <800KB
  - Upload to Supabase Storage photo-doubts/<user_id>/<uuid>.jpg
  - GPT-4o Vision call extracts: question text, subject, topic, difficulty, clarity
  - If clarity is "unclear" → return error asking user to retake
  - Vector search on extracted text in document_chunks
  - Stream answer via /api/ask logic with photo context
- Cleanup cron: deletes photos past delete_after + storage files

Files to create:
- supabase/migrations/<ts>_photo_doubts_schema.sql
- app/api/photo-doubt/route.js
- lib/ai/visionRecognizer.js
- app/api/cron/cleanup-photo-doubts/route.js

Schema:
CREATE TABLE IF NOT EXISTS photo_doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  recognized_text TEXT,
  subject_detected TEXT,
  topic_detected TEXT,
  difficulty_estimate TEXT,
  image_clarity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delete_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX photo_doubts_user_idx ON photo_doubts (user_id, created_at DESC);
CREATE INDEX photo_doubts_delete_idx ON photo_doubts (delete_after);

Endpoint flow:
1. Parse multipart form (image file + optional question_hint + conversation_id)
2. Validate auth
3. Check tier limits (Free: 3/day, Student: 20/day, Pro: unlimited)
4. Upload image to storage
5. Call GPT-4o Vision with VISION_RECOGNITION_PROMPT
6. If clarity = unclear → return __ERROR__ with retake message
7. Embed recognized_text → vector search → top 5 chunks
8. Build prompt with image context + retrieved chunks
9. Stream answer using existing /api/ask streaming
10. Persist photo_doubt row with link to conversation

VISION prompt:
[from AI_SYSTEMS_ARCHITECTURE.md Section 6 Photo Doubt Vision prompt — full text]

Tier limit check pattern:
const todayCount = await supabase
  .from('photo_doubts')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .gte('created_at', startOfDay());
const limit = { free: 3, student: 20, pro: Infinity }[user.tier];
if (todayCount.count >= limit) {
  return new Response(JSON.stringify({ error: 'limit_reached', upgrade_to: 'student' }), { status: 429 });
}

VERIFICATION:
1. POST photo → recognized_text returned
2. Answer streams back with context from user's PDFs
3. photo_doubts row inserted
4. Tier limits enforced (test as free user)
5. Unclear image → graceful error
```

**Time estimate:** 6-7 hours.

---

### Day 32 (Tuesday) — Photo Doubt Cam: mobile UI

**Acceptance criteria:**
- [ ] Camera button in Q&A input bar on mobile
- [ ] Tap opens camera (`getUserMedia` or file picker fallback)
- [ ] Photo preview screen with optional text input
- [ ] Send → upload + stream answer
- [ ] Photo embedded inline in conversation
- [ ] Works on iOS Safari + Android Chrome

**Claude Code prompt:**

```
TASK: Photo Doubt Cam — mobile UI
SPRINT: 2, Week 7, Day 32
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.5 + MOBILE_AND_GAMIFICATION.md Section 4

ACCEPTANCE CRITERIA:
- Camera icon (📷) prominent in Q&A input bar on mobile
- Tap camera icon:
  - On supporting browsers: opens native camera via <input type="file" capture="environment">
  - Falls back to file picker on others
- After photo taken/picked:
  - Preview screen with thumbnail
  - Optional text input ("Add context...")
  - [Retake] [Send] buttons
- On Send:
  - Compress image client-side to max 1600px on long edge, ~800KB target
  - Upload via /api/photo-doubt
  - Stream answer like normal Q&A
  - Show photo inline in conversation thread

Files to create:
- components/qa/PhotoDoubtButton.jsx
- components/qa/PhotoDoubtPreview.jsx
- lib/imageCompression.js (canvas-based)

Files to modify:
- components/qa/InputBar.jsx (add camera button)
- components/qa/ConversationMessage.jsx (render image attachments)

Compression pattern:
async function compressImage(file, maxDim = 1600, quality = 0.85) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
}

VERIFICATION:
1. On Android Chrome → camera icon → native camera opens
2. On iOS Safari → file picker → camera option
3. Photo taken → preview shown
4. Send → uploads, compresses, streams answer
5. Image embeds in conversation
6. Desktop: file picker fallback works
```

**Time estimate:** 4-5 hours.

---

### Day 33 (Wednesday) — Pricing live: connect Razorpay to new tiers

**Acceptance criteria:**
- [ ] `/api/payments/create-order` returns correct amount per tier × cycle
- [ ] Razorpay checkout opens with right amount
- [ ] Successful payment → webhook activates subscription
- [ ] Failed payment → user can retry
- [ ] Trial → paid transition works (trial_ends_at cleared, payment_id set)

**Claude Code prompt:**

```
TASK: Connect Razorpay payments to new tier structure
SPRINT: 2, Week 7, Day 33
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.6

ACCEPTANCE CRITERIA:
- /api/payments/create-order accepts { tier, cycle }
- Returns Razorpay order with correct amount (in paise)
- Webhook /api/payments/webhook:
  - Verifies signature
  - Idempotency check (from Sprint 1)
  - Activates user_plans: plan=<tier>, billing_cycle=<cycle>, payment_id=<id>, trial_ends_at=NULL
  - Sends confirmation email (optional, defer to Sprint 3)
- Frontend payment flow:
  - Pricing page button → POST create-order → open Razorpay checkout
  - On success → /thank-you with subscription state
  - On failure → /pricing with friendly error
- Existing paying users grandfathered (no auto-migration)

Files to modify:
- app/api/payments/create-order/route.js
- app/api/payments/webhook/route.js
- components/pricing/CheckoutButton.jsx (or similar)

Amount table (in lib/pricing.js):
export const PRICING_AMOUNTS = {
  student: { monthly: 19900, yearly: 159900 },
  pro: { monthly: 39900, yearly: 299900 },
  family: { yearly: 449900 },
};

Webhook activation pattern:
async function activateSubscription(payload) {
  const orderId = payload.payment.entity.order_id;
  const paymentId = payload.payment.entity.id;
  const amount = payload.payment.entity.amount;
  
  // Lookup tier from order metadata (stored at create-order time)
  const order = await supabase.from('payment_orders').select('*').eq('order_id', orderId).single();
  
  await supabase.from('user_plans').upsert({
    user_id: order.user_id,
    plan: order.tier,
    billing_cycle: order.cycle,
    payment_id: paymentId,
    trial_ends_at: null,  // Clear trial
    activated_at: NOW(),
    expires_at: computeExpiry(order.cycle),
  });
  
  await logPaymentEvent({
    user_id: order.user_id,
    event: 'subscription_activated',
    payment_id: paymentId,
    tier: order.tier,
  });
}

VERIFICATION:
1. Click "Start Student" on pricing → Razorpay opens with ₹199 (monthly) or ₹1,599 (annual)
2. Complete test payment → webhook fires
3. user_plans updated: plan='student', payment_id set
4. User now has student-tier access
5. Pro trial converts to Student properly
6. Webhook duplicate test → no double activation
```

**Time estimate:** 5-6 hours.

---

### Day 34 (Thursday) — Streak Freeze auto-application + Cumulative Day Badge

**Acceptance criteria:**
- [ ] Daily cron at 12:30am IST evaluates each user's streak
- [ ] Active session yesterday → cumulative_study_days++, current_streak++
- [ ] 7-day milestone → freezes_available++ (cap 3)
- [ ] Missed day + freezes_available > 0 → freeze auto-applied, streak holds
- [ ] Missed day + 0 freezes → current_streak reset, cumulative_study_days unchanged
- [ ] `<StreakBadge />` shows "Consistent Learner — Day N"
- [ ] No streak-loss notification ever fires

**Claude Code prompt:**

```
TASK: Streak Freeze auto-application + Consistent Learner Badge
SPRINT: 2, Week 7, Day 34
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F2.4 + MOBILE_AND_GAMIFICATION.md Section 10 (Identity 1)

ACCEPTANCE CRITERIA:
- Migration: add columns to study_streaks
  - freezes_available INT DEFAULT 0
  - freezes_used INT DEFAULT 0
  - cumulative_study_days INT DEFAULT 0
  - last_freeze_earned_at TIMESTAMPTZ
  - last_freeze_used_at TIMESTAMPTZ
- Daily cron at 00:30 IST: evaluate_streak_states()
- Day counts only if session ≥5 min yesterday (use focus_progress)
- 7th consecutive day → +1 freeze (cap 3)
- Missed day + freezes > 0 → auto-apply
- Missed day + 0 freezes → reset current_streak, keep cumulative
- /api/streak/status returns { cumulative_days, current_streak, freezes_available, badge_label }
- <StreakBadge /> on dashboard shows "Consistent Learner — Day N"
- NEVER push "you lost your streak"

Files to create:
- supabase/migrations/<ts>_streak_freeze_columns.sql
- app/api/cron/evaluate-streaks/route.js
- app/api/streak/status/route.js
- components/identity/StreakBadge.jsx

Files to modify:
- Dashboard component (include StreakBadge)
- Migration: ensure REPLICA IDENTITY FULL on study_streaks for realtime updates

Cron pattern:
async function evaluateStreakStates() {
  const yesterday = subDays(new Date(), 1);
  // For each user with profile
  const users = await getUsersWithActivity();
  
  for (const user of users) {
    const streak = await getOrCreateStreak(user.id);
    const studiedYesterday = await hasMinimumSessionYesterday(user.id);
    
    if (studiedYesterday) {
      streak.cumulative_study_days += 1;
      streak.current_streak += 1;
      
      if (streak.current_streak % 7 === 0 && streak.freezes_available < 3) {
        streak.freezes_available += 1;
        streak.last_freeze_earned_at = NOW();
      }
    } else if (streak.freezes_available > 0) {
      streak.freezes_available -= 1;
      streak.freezes_used += 1;
      streak.last_freeze_used_at = NOW();
      // streak holds, day count unchanged
    } else {
      streak.current_streak = 0;
      // cumulative_study_days unchanged — never resets
    }
    
    await saveStreak(streak);
  }
}

UI for StreakBadge:
"🌱 Consistent Learner
 Day 247
 2 freezes available"

vercel.json add:
{ "path": "/api/cron/evaluate-streaks", "schedule": "0 19 * * *" }
(19 UTC = 00:30 IST next day)

VERIFICATION:
1. Test user with 7-day streak → freeze earned next day
2. Test user with 3 freezes → 4th 7-day milestone → still cap 3
3. Test user misses day with freeze available → freeze used, streak holds
4. Test user misses day with 0 freezes → current_streak resets to 0, cumulative unchanged
5. Welcome back screen handles cumulative properly
6. No notification fires about streak loss
```

**Time estimate:** 4-5 hours.

---

### Day 35 (Friday) — Week 7 polish + test full flow

**Tasks:**
- A. Test Photo Doubt Cam on real mobile device
- B. Test payment flow end-to-end (real test card)
- C. Polish copy on payment confirmation screens
- D. Bug fixes from week

---

### Week 7 done test

```
[ ] Photo Doubt Cam working on iOS + Android
[ ] New pricing live, real payments accepted
[ ] 7-day Pro trial converts to paid correctly
[ ] Streak Freeze auto-applies
[ ] Consistent Learner Badge displays
[ ] No regressions
[ ] At least 10-20 paying users (initial conversion from trials)
```

---

## Week 8 — Weekly Recap + Friday Quiz + Sprint 2 Polish

The goal of Week 8: **complete the weekly loop + polish all Sprint 2 features.**

---

### Day 36 (Monday) — Sunday Weekly Recap generation

**Acceptance criteria:**
- [ ] Cron at Sunday noon IST generates weekly recap per active user
- [ ] Includes: concepts mastered this week, time invested (with 4-week comparison), Brain Map diff, cohort rank movement, streak status, next week's planned focus
- [ ] Generates a 1080×1920 shareable image
- [ ] Generates a 90-second audio narration (TTS-1)
- [ ] Push notification Sunday 8pm IST

**Claude Code prompt:**

```
TASK: Sunday Weekly Recap pipeline
SPRINT: 2, Week 8, Day 36
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 3 (Sunday Recap)

ACCEPTANCE CRITERIA:
- Schema: weekly_recaps table (user_id, week_starting, audio_url, image_url, transcript, key_stats JSONB, delivered_at, viewed_at)
- Cron: 0 6 * * 0 (Sunday 11:30 IST UTC = 06:00 UTC)
- For each active user:
  1. Compute stats: concepts touched/mastered, time invested, mastery delta, cohort rank delta
  2. Generate transcript via gpt-4o-mini (similar to briefing but ~150 words for weekly)
  3. Generate TTS audio
  4. Generate visual image (server-side render to 1080×1920 PNG)
  5. Upload both
  6. Insert recap row
- Push notification Sunday 8pm IST (handled by dispatcher, special "weekly" type)
- /recap/[week] page displays full recap

Files to create:
- supabase/migrations/<ts>_weekly_recaps_schema.sql
- app/api/cron/generate-weekly-recaps/route.js
- lib/recaps/generator.js
- lib/recaps/imageRenderer.js (server-side render to image, use @vercel/og or puppeteer)
- app/recap/[week]/page.js
- app/api/recap/me/route.js

Image rendering:
Use @vercel/og for fast OG-style image generation:
import { ImageResponse } from 'next/og';
return new ImageResponse(
  <div style={{display:'flex', flexDirection:'column', ...}}>
    <h1>Week of {weekStart}</h1>
    <div>{conceptsMastered} concepts mastered</div>
    {/* etc */}
  </div>,
  { width: 1080, height: 1920 }
);

VERIFICATION:
1. Manually trigger Sunday cron → recap generated for test user
2. /recap/<thisWeek> page renders correctly
3. Audio plays
4. Image shareable to Instagram Stories
5. Sunday 8pm push fires correctly
```

**Time estimate:** 6-7 hours.

---

### Day 37 (Tuesday) — Friday Quiz of the Week

**Acceptance criteria:**
- [ ] Friday morning push: "Friday — 20 questions. Test what stuck."
- [ ] Tap → 20-question quiz from this week's studied concepts
- [ ] Score visible to user only
- [ ] Optional anonymous cohort share

**Claude Code prompt:**

```
TASK: Friday Quiz of the Week
SPRINT: 2, Week 8, Day 37
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 3 (Friday Week-end Practice)

ACCEPTANCE CRITERIA:
- /quiz/friday route generates a 20-question quiz from this week's concepts
- Questions: 70% from concepts touched this week, 30% review from last 2 weeks
- Difficulty mix: 40% easy, 50% medium, 10% hard
- Time limit: optional, suggest 15 min
- Submit → score + by-topic breakdown
- "Share to cohort" button (anonymous): adds your score to cohort weekly summary

Files to create:
- app/quiz/friday/page.js
- app/api/quiz/friday/generate/route.js
- app/api/quiz/friday/submit/route.js

Generation uses existing quiz generation infra. Special prompt to bias toward this week's concepts.

Push notification:
- Type: 'friday_quiz', delivered Friday morning at user's briefing_time
- Add 'friday_quiz' to notification dispatcher special types

VERIFICATION:
1. Trigger Friday push manually → notification arrives
2. Tap → quiz loads with 20 questions
3. Submit → score + breakdown
4. Share to cohort works (anonymous)
```

**Time estimate:** 4-5 hours.

---

### Day 38 (Wednesday) — Family tier basics

**Acceptance criteria:**
- [ ] Primary user can buy Family tier (₹4,499/yr)
- [ ] Family member invite via shareable link
- [ ] Up to 2 students + 1 parent dashboard
- [ ] Parent gets read-only view of children's progress (high level only, no conversation content)

**Claude Code prompt:**

```
TASK: Family tier — invite + parent dashboard
SPRINT: 2, Week 8, Day 38
ARCHITECTURE REFERENCE: ELITE_FEATURE_ARCHITECTURE.md F1.6

ACCEPTANCE CRITERIA:
- Family tier purchasable from /pricing
- Primary holder gets unique invite link
- Family member (child) signs up via link → gets Pro features, marked as family_member
- Parent role: invite link to parent → /parent dashboard
- Parent dashboard shows for each child:
  - Cumulative study days
  - Time invested this week
  - Mastery by subject (high-level)
  - DOES NOT show: conversation content, specific questions asked, Brain Map detail
- Primary holder can remove members

Schema additions:
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS family_role TEXT, -- 'primary' | 'child' | 'parent'
  ADD COLUMN IF NOT EXISTS family_primary_id UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- 'child' | 'parent'
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

Files to create:
- supabase/migrations/<ts>_family_tier_schema.sql
- app/api/family/invite/route.js
- app/api/family/redeem/route.js
- app/family/invite/[code]/page.js
- app/parent/page.js
- components/family/MembersList.jsx
- components/parent/ChildProgressCard.jsx

VERIFICATION:
1. Buy Family tier → primary status set
2. Generate invite link → unique URL
3. Open link, signup as child → user_plans family_member set, plan='pro' inherited
4. Generate parent invite → signup → /parent dashboard shows children
5. Parent CANNOT see conversation content
```

**Time estimate:** 6 hours.

---

### Day 39 (Thursday) — Welcome Back flow + Pause UX

**Acceptance criteria:**
- [ ] User who hasn't logged in 7+ days sees Welcome Back screen on next visit
- [ ] 3 options: pick up / start fresh / just looking
- [ ] Pause subscription UI from Sprint 1 polished
- [ ] Pause confirmation: "Your Brain Map, your progress, your cohort — all wait for you."

**Claude Code prompt:**

```
TASK: Welcome Back flow + polish Pause UX
SPRINT: 2, Week 8, Day 39
ARCHITECTURE REFERENCE: RETENTION_ENGINE_BLUEPRINT.md Section 7 (Recovery System)

ACCEPTANCE CRITERIA:
- On app load, if last_active_at > 7 days ago AND has account:
  → /welcome-back screen first
- 3 options:
  - "Pick up where I left off" → dashboard with last study plan
  - "Start fresh" → soft reset (clear active study plan but keep Brain Map)
  - "I'm not ready yet, just looking" → /library (passive browse mode)
- Copy follows STUDENT_PSYCHOLOGY_EXECUTION.md Section 17
- Track welcome_back_shown event
- Pause flow polish:
  - "Pause for 30/60/90 days"
  - Confirmation copy from psychology doc

Files to create:
- app/welcome-back/page.js
- components/welcome-back/WelcomeBackFlow.jsx

Files to modify:
- Root layout or middleware: redirect to /welcome-back when conditions met

VERIFICATION:
1. Test user idle 10 days → returns → /welcome-back shown
2. 3 options all work correctly
3. Pause flow works gently
```

**Time estimate:** 3-4 hours.

---

### Day 40 (Friday) — Sprint 2 polish, audit, deploy

**Tasks:**
- A. Test all 4 daily push touchpoints fire correctly
- B. Test Briefing audio on iOS and Android
- C. Verify cohort presence + leaderboard accurate
- D. Photo Doubt Cam stress test
- E. Pricing flow end-to-end on production
- F. Lighthouse re-audit
- G. Bug fixes from week

---

### Sprint 2 done test

```
[ ] Push notifications working (4 daily types)
[ ] Daily Briefing pipeline operational
[ ] Briefing player UI working
[ ] Cohort assignment + handles
[ ] Cohort presence (realtime)
[ ] Cohort leaderboard
[ ] Photo Doubt Cam shipped (mobile + backend)
[ ] New pricing live with real payments
[ ] Streak Freeze auto-applied
[ ] Consistent Learner Badge displayed
[ ] Sunday Weekly Recap generated
[ ] Friday Quiz live
[ ] Family tier basics
[ ] Welcome Back flow
[ ] Pause subscription polished
[ ] ≥50 paying users (target)
[ ] Day-7 retention ≥50% (target)
[ ] No major regressions
```

If all checked: Sprint 2 done. Tag: `git tag sprint-2-done && git push --tags`.

If <80% checked: apply cut list. Defer Family tier or Welcome Back to Sprint 3.

---

## What gets cut if Sprint 2 runs over

In order of cut:
1. Family tier polish (only primary purchase, defer invite system to Sprint 3)
2. Sunday Weekly Recap image generation (audio + page only, defer image to Sprint 3)
3. Friday Quiz of the Week (defer to Sprint 3)
4. Welcome Back flow (use simple "Welcome back" toast instead)

Never cut:
- Push infrastructure
- Daily Briefing pipeline
- Cohort system core
- Photo Doubt Cam (the differentiation feature)
- New pricing live
- Streak Freeze

---

*Next: `SPRINT_03_IMPLEMENTATION.md` for Weeks 9-12 — PYQ engine + FSRS + Mock Simulator + Decompression Mode.*
