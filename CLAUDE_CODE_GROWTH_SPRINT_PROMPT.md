# Claude Code Prompt — Growth Sprint: Activation + Trial Conversion Experience

**Purpose:** Implement the Day 3 Activation Moment (primary leverage point) followed by Day 7 Trial Conversion Experience (TCE). Built for Ask My Notes (Indian JEE/NEET aspirants).

**Estimated execution time:** 6-8 weeks. Broken into 7 phases. Each phase is independent and you stop between phases.

**Strategy reminder:** Activation (Day 1-3) is the disease. Day 7 conversion is the symptom. Fix activation first; then layer TCE on top. Targets: 12-18% trial→paid is too aggressive. Plan for 10-15% with Day-30 retention of 65-70%.

---

## How to use this prompt

1. Paste the **entire prompt below** into Claude Code in one shot
2. Claude Code reads the plan and acknowledges
3. You say: `Start Phase 1`
4. Claude Code executes Phase 1 (~1 week), reports findings
5. You review, approve fixes
6. You say: `Phase 1 approved, start Phase 2`
7. Repeat through Phase 7

---

## PASTE EVERYTHING BELOW INTO CLAUDE CODE

````
TASK: Growth Sprint — Activation + Trial Conversion Experience

CONTEXT
=======
Product: Ask My Notes (askmynotes.in) — AI study planner for Indian JEE Main, JEE Advanced, NEET UG aspirants.
Stack: Next.js + Supabase + OpenAI + Razorpay.
Pricing: Free | Student ₹199/mo | Pro ₹399/mo | Annual ₹4,499/yr.
Trial: 7-day Pro auto-activated on onboarding.

GOAL
====
Build a 2-tier conversion system:
TIER 1 (Day 3 Activation Moment): segment trial users by activation signal, run personalized interventions to recover dead trials and reinforce high-intent users. THIS IS THE BIG LEVER.
TIER 2 (Day 7 Trial Conversion Experience): minimalist decision page for activated users + WhatsApp recovery for lapsed users.

WHY THIS ORDER MATTERS
======================
- Day 7 conversion of an activated user: ~25-30%
- Day 7 conversion of an inactive user: ~3-5%
- Building TCE without fixing activation = polishing a tombstone
- Activation work makes TCE 3-5x more effective

ARCHITECTURE PRINCIPLES
=======================
1. WhatsApp is primary comms channel for India. Email is secondary. Push is supplemental.
2. Hinglish copy for WhatsApp/SMS. English for in-app UI.
3. UPI is default payment method, card is secondary.
4. Razorpay opens in <300ms from CTA tap. No interstitials.
5. Indian Rupee always: ₹199 (not Rs.199, not INR 199, not $2.50).
6. Loss-aversion framing works only if user activated. Otherwise use forward-momentum framing.
7. Parents are ~30-50% of buyers for JEE/NEET — add parent-referral flow.
8. Exam-cycle awareness: tag cohorts with exam_proximity_months_at_signup.
9. Track repeat aspirants (droppers) as separate cohort.
10. Coaching coexistence: position as "covers your memory" not "replaces coaching".

EXECUTION RULES
===============
- DO NOT chain phases. STOP after each phase, report, wait for "continue".
- Every database change requires migration in supabase/migrations/.
- Every WhatsApp template requires Meta approval — design + submit, don't wait for approval before building.
- Use existing FSRS, briefing, Brain Map, mock test data — don't recreate.
- Add minimal telemetry (6 events max). No vanity metrics.
- Test on real devices (iPhone Safari + Android Chrome) before shipping any UI.

REPORT FORMAT (after each phase)
================================
## Phase N Report: [Phase Name]

### What was built
- File: path/to/file.js — [purpose]
- Migration: supabase/migrations/YYYYMMDD_xxx.sql — [purpose]
- WhatsApp template submitted: [template name + status]

### What was tested
- Test: [what was verified] — PASS/FAIL
- Real device test: [device, browser, result]

### What's blocked
- [If anything is waiting on Meta approval, API access, etc.]

### Telemetry events firing
- event_name — fires on: [trigger] — last seen: [timestamp or "not yet"]

### Next phase ready?
[Yes/No] — staging suggested commit message.

================================================================================
PHASE 1: FOUNDATION — WHATSAPP INFRASTRUCTURE + EXTENDED USER SCHEMA
================================================================================

ESTIMATED TIME: 5-7 days
PRIORITY: P0 (everything else depends on this)
BLOCKER RISK: Meta template approval (~2-5 business days)

OBJECTIVES:
1. Set up WhatsApp Business API via Gupshup, AiSensy, or Interakt
2. Extend user schema with activation tracking, parent contact, repeat-aspirant flag
3. Build core WhatsApp message dispatch service
4. Submit initial WhatsApp templates to Meta for approval

DELIVERABLES:

A. WhatsApp Business API integration
   - Choose provider: Recommend AiSensy (cheapest, well-documented, India-focused)
   - Alternative: Gupshup (more enterprise) or Interakt (better UI)
   - Sign up at: https://www.aisensy.com
   - Get: API key, phone number ID (different from display number)
   - Cost: ~₹2-5K/mo setup + ~₹0.50-1 per message (within India)
   - Add env vars to .env.example:
     ```
     WHATSAPP_PROVIDER=aisensy  # or 'gupshup' or 'interakt'
     WHATSAPP_API_KEY=
     WHATSAPP_PHONE_NUMBER_ID=
     WHATSAPP_BUSINESS_ACCOUNT_ID=
     WHATSAPP_VERIFY_TOKEN=  # for webhook verification
     ```

B. Database schema changes
   Migration: YYYYMMDD_activation_schema.sql

   ```sql
   -- 1. Extend profiles for activation tracking
   ALTER TABLE profiles
     ADD COLUMN IF NOT EXISTS phone_number TEXT,
     ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
     ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true,
     ADD COLUMN IF NOT EXISTS parent_phone_number TEXT,
     ADD COLUMN IF NOT EXISTS is_repeat_aspirant BOOLEAN DEFAULT false,
     ADD COLUMN IF NOT EXISTS exam_proximity_months_at_signup INT,
     ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'; -- 'en' | 'hi' | 'hinglish'

   -- 2. Trial activation tracking
   CREATE TABLE IF NOT EXISTS trial_segments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     trial_started_at TIMESTAMPTZ NOT NULL,
     trial_ends_at TIMESTAMPTZ NOT NULL,
     evaluated_at TIMESTAMPTZ DEFAULT NOW(),
     segment TEXT CHECK (segment IN ('high_intent', 'low_intent', 'dead', 'unevaluated')),
     signals JSONB NOT NULL DEFAULT '{}'::jsonb,
     -- signals example: { briefings_opened: 2, questions_asked: 15, focus_sessions: 3, days_active: 2 }
     intervention_triggered TEXT, -- 'high_intent_reinforce' | 'low_intent_recover' | 'dead_revive' | null
     intervention_sent_at TIMESTAMPTZ,
     UNIQUE(user_id) -- one segment per user (overwrite on re-evaluation)
   );
   CREATE INDEX trial_segments_segment_idx ON trial_segments(segment);
   CREATE INDEX trial_segments_user_idx ON trial_segments(user_id);

   -- 3. WhatsApp message log (for delivery tracking + idempotency)
   CREATE TABLE IF NOT EXISTS whatsapp_messages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     phone_number TEXT NOT NULL,
     template_name TEXT NOT NULL,
     template_variables JSONB,
     idempotency_key TEXT UNIQUE NOT NULL, -- e.g. "trial_d3_revive_{user_id}"
     provider_message_id TEXT,
     status TEXT CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'replied', 'failed')),
     status_updated_at TIMESTAMPTZ DEFAULT NOW(),
     provider_response JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX wa_messages_user_idx ON whatsapp_messages(user_id);
   CREATE INDEX wa_messages_idempotency_idx ON whatsapp_messages(idempotency_key);
   CREATE INDEX wa_messages_status_idx ON whatsapp_messages(status);

   -- 4. Telemetry events table (if not exists)
   CREATE TABLE IF NOT EXISTS growth_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     event_name TEXT NOT NULL,
     properties JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX growth_events_user_idx ON growth_events(user_id);
   CREATE INDEX growth_events_name_idx ON growth_events(event_name);
   CREATE INDEX growth_events_created_idx ON growth_events(created_at DESC);

   -- 5. RLS policies (defense in depth)
   ALTER TABLE trial_segments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE growth_events ENABLE ROW LEVEL SECURITY;

   -- Users can read own data; service role bypasses for cron jobs
   CREATE POLICY "users_read_own_segment" ON trial_segments
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "users_read_own_messages" ON whatsapp_messages
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "users_read_own_events" ON growth_events
     FOR SELECT USING (auth.uid() = user_id);
   -- INSERT/UPDATE only via service role (cron, server-side)
````

C. WhatsApp dispatch service
File: lib/whatsapp/dispatch.js

Responsibilities:

- Send message using approved template
- Validate phone number format (must be +91XXXXXXXXXX for India)
- Idempotency check (if idempotency_key exists in whatsapp_messages with status != 'failed', skip)
- Log every send to whatsapp_messages
- Handle provider errors (retry once, then mark failed)
- Return success/failure with provider_message_id

API:

```js
await dispatchWhatsApp({
  userId,
  templateName: "trial_d3_revive_hinglish",
  variables: { name: "Priya", cards_count: 47 },
  idempotencyKey: `trial_d3_revive_${userId}`,
});
```

D. WhatsApp webhook handler
File: app/api/webhooks/whatsapp/route.js

- Verify webhook signature (provider-specific)
- Update whatsapp_messages.status based on delivery events
- Handle inbound replies (user replies "YES", "STOP", etc.)
- Replies → fire event: whatsapp_reply_received with reply text
- "STOP" → set profiles.whatsapp_opt_in = false

E. Phone number collection in onboarding
File: app/onboarding/components/PhoneCollection.jsx

- Add to existing onboarding flow (don't break it)
- Make REQUIRED (not optional — non-negotiable per strategy)
- Format: +91 prefix shown, 10-digit input
- OTP verification via WhatsApp Business API (or skip OTP, just collect)
- Save to profiles.phone_number
- Copy: "Hum tumhe study reminders WhatsApp pe bhejenge. Required."
  (Hinglish reduces friction here)

F. Parent contact collection (optional in onboarding)

- Same screen, secondary field: "Parent's WhatsApp (optional)"
- Save to profiles.parent_phone_number
- Copy: "Apne parents ko bhi updates bhejne hain? (optional)"

G. Repeat-aspirant flag

- Add question in onboarding: "Is this your first attempt at JEE/NEET?"
  Options: First attempt | Repeat / Dropper
- Save to profiles.is_repeat_aspirant

H. Exam proximity calculation

- On profile save: calculate exam_proximity_months_at_signup
- Formula: MONTHS_BETWEEN(NOW(), exam_date)
- Save snapshot at signup (don't recalculate)

I. Submit Meta WhatsApp templates (start approval process NOW)
These take 2-5 business days. Submit in parallel to building.

Template 1: trial_d3_revive_hinglish
Category: MARKETING
Body: "Hi {{1}}, tumne Ask My Notes start kiya tha 3 din pehle but kuch zyada study nahi hua.
Kya tumhe schedule change karna hai? Reply YES if you want help, ya STOP if you don't want messages."
Variables: {{1}} = first_name

Template 2: trial_d3_low_intent_hinglish
Category: MARKETING
Body: "{{1}}, briefing aaj 7am IST par bhejenge. Tumne {{2}} questions puchhe hain ab tak.
Continue karte raho — exam {{3}} mahine door hai."
Variables: {{1}} = first_name, {{2}} = questions_count, {{3}} = months_to_exam

Template 3: trial_d6_warmup_hinglish
Category: MARKETING
Body: "{{1}}, tumhara Pro trial kal khatam ho raha hai. Tumhare {{2}} FSRS cards
abhi tak schedule mein hain. Continue karna hai?"
Variables: {{1}} = first_name, {{2}} = cards_count

Template 4: trial_d8_recovery_hinglish
Category: MARKETING
Body: "Hi {{1}}, tumhara trial kal khatam ho gaya. {{2}} cards abhi bhi tumhara wait kar rahe hain.
Wapas aana hai? Reply YES for payment link, ya STOP to opt out."
Variables: {{1}} = first_name, {{2}} = cards_count

Template 5: parent_referral_hinglish
Category: UTILITY
Body: "Namaste, {{1}} (your child) is using Ask My Notes for JEE/NEET prep.
Ye Pro plan ka payment link hai: {{2}}. Pro plan ₹399/month hai, ya ₹4,499/year (saves ₹2,389)."
Variables: {{1}} = student_name, {{2}} = payment_link

Template 6: trial_d3_high_intent_reinforce
Category: UTILITY
Body: "{{1}}, tum {{2}} din se study kar rahe ho. Briefing on time mil rahi hai?
Settings mein time change kar sakte ho. Keep going."
Variables: {{1}} = first_name, {{2}} = days_active

TESTING CHECKLIST (Phase 1 done test):
[ ] Migration applied successfully to production
[ ] phone_number column populated for at least 1 test user
[ ] WhatsApp dispatch service sends test message to your own number
[ ] Webhook receives delivery confirmation, updates whatsapp_messages.status
[ ] Webhook handles inbound "STOP" → updates profiles.whatsapp_opt_in
[ ] 6 templates submitted to Meta (status: pending or approved)
[ ] Phone collection in onboarding works on real iPhone + Android
[ ] No PII (phone numbers) logged to Sentry

EXECUTE PHASE 1 → REPORT → STOP

================================================================================
PHASE 2: DAY 3 SEGMENTATION CRON
================================================================================

ESTIMATED TIME: 2-3 days
PRIORITY: P0 (this is the activation lever)
DEPENDENCY: Phase 1 complete

OBJECTIVE:
Every day at 6pm IST, evaluate all trial users on Day 3 of their trial. Segment into high_intent, low_intent, or dead. Trigger appropriate intervention.

WHY 6PM IST:

- Most students study after school/coaching (4-9pm)
- Capture "did they study today" signal at end-of-day
- Interventions sent in evening → seen during morning routine next day

DELIVERABLES:

A. Cron job: /api/cron/trial-d3-segment
File: app/api/cron/trial-d3-segment/route.js

```js
// Pseudocode
1. Query trial users on Day 3:
   SELECT user_id FROM user_plans
   WHERE plan = 'pro'
     AND is_trial = true
     AND trial_started_at >= NOW() - INTERVAL '3 days 1 hour'
     AND trial_started_at <= NOW() - INTERVAL '2 days 23 hours'
     AND NOT EXISTS (
       SELECT 1 FROM trial_segments WHERE user_id = user_plans.user_id
     )

2. For each user, gather activation signals (last 3 days):
   - briefings_opened: COUNT(*) FROM daily_briefings WHERE user_id = ? AND listened_at IS NOT NULL
   - questions_asked: COUNT(*) FROM conversations WHERE user_id = ?
   - focus_sessions: COUNT(*) FROM focus_progress WHERE user_id = ?
   - fsrs_cards_reviewed: COUNT(*) FROM srs_card_reviews WHERE user_id = ?
   - days_active: COUNT(DISTINCT DATE(started_at)) FROM focus_progress WHERE user_id = ?

3. Segment logic:
   - high_intent: days_active >= 2 AND (briefings_opened >= 2 OR questions_asked >= 10)
   - low_intent: days_active == 1 OR (questions_asked > 0 AND days_active < 2)
   - dead: days_active == 0 AND questions_asked == 0

4. INSERT into trial_segments with signals JSONB

5. Fire event: trial_d3_segment with segment + signals

6. Trigger intervention:
   - high_intent → send WhatsApp template trial_d3_high_intent_reinforce
   - low_intent → send WhatsApp template trial_d3_low_intent_hinglish
   - dead → send WhatsApp template trial_d3_revive_hinglish

7. Update trial_segments.intervention_triggered + intervention_sent_at
```

IMPORTANT:

- Use service role (this is a cron, not user request)
- Idempotency: skip users already in trial_segments
- Respect whatsapp_opt_in = false (skip WhatsApp, send push instead)
- Skip users with no phone_number (shouldn't happen post-Phase 1, but defensive)
- Cron schedule in vercel.json: "0 12 \* \* \*" (12:30pm UTC = 6pm IST)

B. Backfill script: scripts/backfill-trial-segments.js

- For testing: manually evaluate a specific user
- Usage: node scripts/backfill-trial-segments.js <user_id>
- Logs decision + signals, doesn't actually send WhatsApp

C. Admin debug page: app/admin/trial-segments/page.js

- List all trial_segments rows with filters
- Show: user, segment, signals, intervention status
- Useful for debugging cron output

D. Telemetry event integration
File: lib/telemetry/events.js

```js
export async function trackEvent(userId, eventName, properties) {
  // Insert into growth_events table
  // Also send to PostHog/Amplitude if configured
}
```

Fire from Phase 2:

- trial_d3_segment (with segment + signals + intervention_triggered)

E. Failure handling

- If WhatsApp send fails: log to whatsapp_messages.status = 'failed', mark
  intervention_triggered = 'failed_whatsapp'
- Fallback to push notification if WhatsApp fails (using existing push system)
- Never block the cron on a single user failure

TESTING CHECKLIST:
[ ] Cron runs without errors on test data (10 fake trial users)
[ ] Segmentation logic correctly bins users (verify against expected outcomes)
[ ] WhatsApp messages dispatched for each segment
[ ] Idempotency: running cron twice doesn't double-send
[ ] Real user test: create 3 test accounts (one for each segment), verify each gets correct message
[ ] trial_d3_segment events appearing in growth_events table

EXECUTE PHASE 2 → REPORT → STOP

================================================================================
PHASE 3: DAY 7 CONVERSION PAGE (TCE CORE)
================================================================================

ESTIMATED TIME: 4-5 days
PRIORITY: P0
DEPENDENCY: Phase 2 complete (so we have segmentation data)

OBJECTIVE:
Build the minimalist Day 7 decision page. ONE personal stat, ONE primary CTA, no clutter. Razorpay opens in <300ms.

CRITICAL DESIGN PRINCIPLES (do not violate):

- ONE number, huge. Not 4 panels. Not feature lists.
- ONE primary CTA: "Continue with Pro — ₹399/month"
- UPI as default Razorpay method
- "See other options" as text link, opens sheet
- No countdown timer
- No cohort leaderboard
- No "what you'll lose" framing for inactive users
- For dead-trial users: show different minimal screen, not TCE

DELIVERABLES:

A. Route: app/trial/decision/page.js

- Server component, requires auth
- Redirect logic:
  - If user.plan != 'pro' OR !user.is_trial: redirect to /dashboard
  - If trial_ends_at > NOW() + 1 day: redirect to /dashboard (too early)
  - If trial_ends_at < NOW() - 7 days: redirect to /dashboard (too late, use recovery flow)
  - Otherwise: render decision page

B. Hero variant selection logic
File: lib/conversion/heroVariant.js

```js
export function selectHeroVariant(user, signals) {
  // Priority order (first match wins):
  if (user.streak_days >= 3) {
    return {
      variant: "streak",
      hero_number: user.streak_days,
      hero_text: `${user.first_name}, you've studied ${user.streak_days} days straight. Keep it going.`,
    };
  }
  if (signals.questions_asked >= 10) {
    return {
      variant: "questions",
      hero_number: signals.questions_asked,
      hero_text: `You asked ${signals.questions_asked} questions this week. Your queue knows what you need next.`,
    };
  }
  if (signals.briefings_opened >= 4) {
    return {
      variant: "briefings",
      hero_number: signals.briefings_opened,
      hero_text: `You opened ${signals.briefings_opened} of 7 briefings. Tomorrow's is already prepared.`,
    };
  }
  if (signals.fsrs_cards_due_next_week >= 5) {
    return {
      variant: "fsrs_cards",
      hero_number: signals.fsrs_cards_due_next_week,
      hero_text: `${signals.fsrs_cards_due_next_week} cards are scheduled for you this week.`,
    };
  }
  // Low-activity user: show different minimal screen
  return {
    variant: "low_activity",
    redirect_to: "/trial/lapsed",
  };
}
```

C. Decision page UI
File: app/trial/decision/DecisionPage.jsx

Layout (mobile-first, single column):

```
[Padding: 24px]
[Avatar: 32x32 round]
[Greeting: "Hey {first_name}." — 16px, regular weight]

[Padding: 48px]
[Hero number: huge — 96px font-size, semibold, single number]
[Hero text: 20px, line-height 1.3, max 2 lines]

[Padding: 32px]
[Secondary line: "Your study schedule continues without interruption." — 14px, muted]

[Padding: 24px]
[PRIMARY CTA — full width button, 56px tall]
[Text: "Continue with Pro — ₹399/month"]
[On tap: opens Razorpay sheet directly, NO confirmation modal]

[Padding: 16px]
[Link: "See other options" — center, 14px, underline]

[Padding: 24px]
[Tiny text: "Cancel anytime in Settings. Refund within 7 days."]
```

Important:

- Single button, single decision
- Razorpay opens via direct integration, no intermediate page
- No tooltips, no extra info, no "learn more"
- Background: white (or app default), no decorative imagery

D. Options sheet (modal/sheet that opens on "See other options")
File: app/trial/decision/OptionsSheet.jsx

Three options stacked:

1.  Annual (highlighted with subtle border):
    Title: "Pro Annual"
    Price: "₹4,499/year"
    Savings: "Save ₹2,389 vs monthly"
    Button: "Choose Annual"
    Below button (tiny): "One payment, full year. Most popular with parents."

2.  Student tier (no highlight):
    Title: "Student"
    Price: "₹199/month"
    Description: "Slower briefings. No Brain Map. Fewer mock tests."
    Button: "Choose Student"

3.  Free (no highlight, plain):
    Title: "Continue free"
    Description: "Keep your data, lose Pro features."
    Button: "Switch to Free" (text-only, not prominent)

IMPORTANT: When user taps Free, just switch them. NO retention modal. No "are you sure?". Respect the choice.

E. Razorpay integration optimizations
File: lib/payments/razorpayCheckout.js

- Open Razorpay checkout sheet directly on CTA tap
- Preconfigure: prefer UPI method, then Card, then Netbanking
- prefill user.email and user.phone_number
- Customize theme: brand color matching app
- Handler on success: redirect to /trial/success (no celebration confetti — just a thank-you)
- Handler on dismiss: stay on decision page, no judgment

F. Parent referral flow
File: app/trial/decision/ParentReferralButton.jsx

- Small text link below the options sheet: "Need to ask your parent?"
- On click: opens modal with:
  - Pre-filled message preview (Hinglish)
  - Send button → triggers WhatsApp template parent_referral_hinglish to profiles.parent_phone_number
  - If parent_phone_number not set: prompt to add it
- Generates unique payment link with utm_source=parent_referral
- Track event: parent_referral_initiated

G. Lapsed/low-activity trial screen
File: app/trial/lapsed/page.js

For users who didn't activate (segment = 'dead'):

- Minimal screen: "Your Pro trial ended."
- "Want to give it another try?" — link to /trial/decision with a fresh approach
- "Continue free" — switch them to free, no friction
- DO NOT use loss-aversion framing here (no schedule was built to lose)

H. Telemetry
Fire from Phase 3:

- trial_d7_page_viewed (with hero_variant, time_to_load_ms)
- trial_decision_made (with outcome, time_on_page_sec)
- parent_referral_initiated (with parent_phone_set: bool)

I. Edge cases to handle:

- User on trial day 6.5 tries to visit /trial/decision → allow (graceful early access)
- User already paid → redirect to /dashboard with "Welcome to Pro" toast
- User on free plan tries to visit → redirect to /pricing
- User from old trial cohort (pre-TCE) → redirect to legacy pricing page
- Network failure during Razorpay → graceful error, retry button, no double-charge

TESTING CHECKLIST:
[ ] Decision page renders correctly for each hero variant
[ ] Razorpay opens in <300ms from CTA tap (measure with performance.now())
[ ] UPI is default payment method in Razorpay sheet
[ ] Parent referral sends WhatsApp to correct number
[ ] "See other options" sheet works on mobile (no overflow, no horizontal scroll)
[ ] Free option works in one tap, no retention modal
[ ] Lapsed screen shows for low_activity users
[ ] Test on real iPhone 12+ (Safari) and Android (Chrome)
[ ] Lighthouse mobile score ≥85
[ ] All telemetry events fire correctly

EXECUTE PHASE 3 → REPORT → STOP

================================================================================
PHASE 4: PRE-DECISION WARM-UP (DAY 5-6)
================================================================================

ESTIMATED TIME: 2-3 days
PRIORITY: P1
DEPENDENCY: Phases 1-3 complete

OBJECTIVE:
Prime activated users for the Day 7 decision with low-pressure reminders that anchor on their existing investment.

DESIGN PRINCIPLE:
Only message users who have activated. Don't waste warm-up on dead trials — they get the Day 8 recovery instead.

DELIVERABLES:

A. Cron: /api/cron/trial-d5-warmup
Schedule: "30 12 \* \* \*" (6pm IST)
File: app/api/cron/trial-d5-warmup/route.js

```
1. Query trial users on Day 5:
   Users where trial_started_at is ~5 days ago
   AND trial_segments.segment IN ('high_intent', 'low_intent')
   (exclude 'dead' segment)

2. For each user, calculate:
   - fsrs_cards_due_next_week: count of cards scheduled in next 7 days

3. Send WhatsApp via existing dispatch:
   Template: trial_d6_warmup_hinglish
   Variables: { name, cards_count }
   Idempotency key: trial_d5_warmup_{user_id}

4. Fire event: trial_d5_warmup_sent
```

B. Day 6 morning briefing custom line
File: lib/briefings/generateBriefing.js (modify existing)

- Before generating briefing audio, check if user is on Day 6 of trial
- If yes, prepend custom line to script:
  - English: "Your trial ends tomorrow. Your queue continues with Pro."
  - Hinglish: "Tumhara trial kal khatam ho raha hai. Pro lo to queue continue rahegi."
- Use user.preferred_language to choose
- Don't make it longer than 1 sentence — briefing should still feel like a briefing, not a sales pitch

C. Push notification on Day 6 evening (backup)
File: lib/notifications/d6Push.js

- Send only if WhatsApp template was not delivered (fallback)
- 6pm IST schedule
- Short copy: "Trial ends tomorrow. Your schedule continues with Pro."
- Deep link to /trial/decision

D. Don't over-message

- If user already opened /trial/decision on Day 5 or 6, suppress warm-up messages
- Respect quiet hours (10pm-7am IST)
- Skip if exam_date is within 7 days (let them focus on exam, not on us)

TESTING CHECKLIST:
[ ] Day 5 cron sends correct WhatsApp template only to activated users
[ ] Day 6 briefing includes trial-ending line in correct language
[ ] No duplicate sends (idempotency works)
[ ] Quiet hours respected
[ ] Exam-proximity check skips users with exam within 7 days

EXECUTE PHASE 4 → REPORT → STOP

================================================================================
PHASE 5: DAY 8 RECOVERY VIA WHATSAPP (NOT EMAIL, NOT DISCOUNT)
================================================================================

ESTIMATED TIME: 2-3 days
PRIORITY: P1
DEPENDENCY: Phases 1-4 complete

OBJECTIVE:
Recover lapsed trials via reply-based WhatsApp flow. NO discount code in initial message — frame as re-engagement, not desperation.

WHY NOT DISCOUNT FIRST:

- Discounts train users to wait
- Reddit screenshots of "I got 50% off by waiting" hurt brand
- Reply-flow has higher engagement than link-flow in India
- Discount can be offered if user replies showing interest, not blasted to all

DELIVERABLES:

A. Cron: /api/cron/trial-d8-recovery
Schedule: "0 12 \* \* \*" (5:30pm IST — captures evening study window)
File: app/api/cron/trial-d8-recovery/route.js

```
1. Query users where:
   - trial_ends_at = 1 day ago
   - user_plans.plan now = 'free' (didn't convert)
   - trial_segments.segment IN ('high_intent', 'low_intent') (only activated users)
   - whatsapp_opt_in = true
   - NOT EXISTS in whatsapp_messages with template trial_d8_recovery_hinglish

2. For each user, calculate fsrs_cards_pending (still scheduled, not reviewed)

3. Send WhatsApp:
   Template: trial_d8_recovery_hinglish
   Variables: { name, cards_count }
   Idempotency key: trial_d8_recovery_{user_id}

4. Fire event: trial_d8_recovery_sent
```

B. Reply handler (extends existing WhatsApp webhook from Phase 1)
File: app/api/webhooks/whatsapp/route.js (extend)

Handle inbound messages:

- "YES" / "yes" / "Yes" → send payment link via WhatsApp (template with link)
  - Generate one-time payment URL valid for 72 hours
  - URL: https://askmynotes.in/recover?token=<jwt>&utm_source=whatsapp_d8
  - Token includes user_id + expiry
- "STOP" / "stop" → set whatsapp_opt_in = false, send opt-out confirmation
- Other replies → forward to founder's email + log as "manual_review_required"
- Fire event: whatsapp_reply_received

C. Recovery payment page
File: app/recover/page.js

- Validate JWT token
- If valid: show simplified version of decision page (no warm-up data, just CTA)
- If expired: show "This link expired. Want to start fresh?" with link to /pricing
- Auto-fill UPI in Razorpay
- On payment success: fire event trial_recovered with recovery_channel: 'whatsapp'

D. Only if recovery rate < 5% after 4 weeks: introduce limited discount
File: lib/conversion/recoveryDiscount.js

- This is a fallback, not the primary plan
- Discount: "First month ₹199 instead of ₹399" (50% off, ONE month only)
- Code: WELCOME_BACK
- Only valid for 72 hours after first send
- Track usage: how many redeem, what's their D30 retention
- If discounted users have worse D30 retention than full-price: kill the discount

E. Inbound message rate limiting

- If a user sends >10 WhatsApp messages in an hour: rate limit response, flag for manual review
- Prevents abuse of the reply flow

TESTING CHECKLIST:
[ ] Day 8 WhatsApp sends only to activated lapsed users (not dead trials)
[ ] Reply "YES" generates valid payment link
[ ] Reply "STOP" updates opt-in flag
[ ] Recovery page renders with valid token
[ ] Recovery page rejects expired tokens gracefully
[ ] Payment via recovery link tracks correct UTM source
[ ] trial_recovered event fires on successful payment

EXECUTE PHASE 5 → REPORT → STOP

================================================================================
PHASE 6: PARENT-AS-BUYER FLOW + REPEAT-ASPIRANT VARIANT
================================================================================

ESTIMATED TIME: 3-4 days
PRIORITY: P1
DEPENDENCY: Phases 1-5 complete

OBJECTIVE:
Build the parent referral flow (30-50% of buyers in this market) and customize Day 7 page for repeat aspirants (different psychology, different copy).

DELIVERABLES:

A. Parent referral flow (full implementation)

- Already stubbed in Phase 3, now make it production-ready
- File: app/api/parent-referral/route.js

```
POST /api/parent-referral
Body: { user_id }
Logic:
1. Fetch user.parent_phone_number
2. If missing, return 400 with "parent_phone_required" code
3. Generate one-time payment link (JWT, 7-day expiry)
4. URL: https://askmynotes.in/parent-pay?token=<jwt>&utm_source=parent_referral
5. Send WhatsApp template parent_referral_hinglish to parent_phone_number
6. Fire event: parent_referral_sent
7. Return success
```

B. Parent payment page
File: app/parent-pay/page.js

- Simpler than student page (parents aren't power users)
- Show: child's name, plan (Pro Annual ₹4,499 — highlighted as "recommended for parents")
- Single CTA: "Pay for Annual ₹4,499" (parents prefer one-time over recurring)
- Secondary: "Pay Monthly ₹399 instead"
- UPI default, GST shown if applicable
- On success: send confirmation WhatsApp to both parent and student

C. Repeat-aspirant hero variants
File: lib/conversion/heroVariant.js (extend)

- If user.is_repeat_aspirant === true, use different copy:
  - Streak variant: "You've shown up {streak} days. Different from last year."
  - Questions variant: "You've asked {questions} sharper questions this week."
  - FSRS variant: "You're using the queue properly this time."
- Acknowledges experience without patronizing

D. Parent-aware messaging

- On Day 6 warmup: if parent_phone_number is set, send parent a heads-up
- Template: parent_d6_heads_up (submit to Meta)
- Body: "Namaste, {{1}}'s Pro trial ends tomorrow. Pro plan is ₹399/month or ₹4,499/year. Reply YES to pay."

E. Track decision source
File: lib/conversion/decisionSource.js

- When tracking trial_decision_made event, include:
  - decision_source: 'self' | 'parent_referred' | 'whatsapp_recovery' | 'parent_d6_heads_up'
- Required for honest cohort analysis later

TESTING CHECKLIST:
[ ] Parent referral generates valid payment link
[ ] WhatsApp template sent to parent_phone_number correctly
[ ] Parent payment page works on parent's device (often older phones, Android 8+)
[ ] Annual is default highlight on parent page
[ ] Repeat-aspirant hero variants render correctly
[ ] decision_source tracked accurately

EXECUTE PHASE 6 → REPORT → STOP

================================================================================
PHASE 7: ANALYTICS DASHBOARD + COHORT ANALYSIS
================================================================================

ESTIMATED TIME: 2-3 days
PRIORITY: P2
DEPENDENCY: Phases 1-6 complete + at least 2 weeks of data

OBJECTIVE:
Single SQL query (no fancy dashboard) that tells you in 30 days whether TCE worked. Add cohort tags for exam-cycle awareness.

DELIVERABLES:

A. Master conversion query
File: docs/queries/tce-master.sql

```sql
-- Run this query weekly
WITH cohort AS (
  SELECT
    p.id as user_id,
    p.created_at as signup_date,
    p.is_repeat_aspirant,
    p.exam_proximity_months_at_signup,
    up.trial_started_at,
    up.trial_ends_at,
    ts.segment as d3_segment,
    ts.signals as d3_signals
  FROM profiles p
  JOIN user_plans up ON up.user_id = p.id
  LEFT JOIN trial_segments ts ON ts.user_id = p.id
  WHERE up.is_trial = true
    AND up.trial_started_at >= NOW() - INTERVAL '30 days'
),
decisions AS (
  SELECT
    user_id,
    (properties->>'outcome') as outcome,
    (properties->>'decision_source') as decision_source,
    created_at as decision_at
  FROM growth_events
  WHERE event_name = 'trial_decision_made'
),
d30_retention AS (
  SELECT
    user_id,
    (properties->>'sessions_in_d30')::int as sessions,
    (properties->>'churn_signal')::bool as churned
  FROM growth_events
  WHERE event_name = 'trial_paid_d30_retained'
)
SELECT
  'TCE Performance — Last 30 days' as report,
  COUNT(*) as cohort_size,
  -- Activation health
  COUNT(*) FILTER (WHERE d3_segment = 'high_intent') as high_intent,
  COUNT(*) FILTER (WHERE d3_segment = 'low_intent') as low_intent,
  COUNT(*) FILTER (WHERE d3_segment = 'dead') as dead,
  ROUND(100.0 * COUNT(*) FILTER (WHERE d3_segment = 'high_intent') / NULLIF(COUNT(*), 0), 1) as pct_high_intent,
  -- Conversion outcomes
  COUNT(*) FILTER (WHERE d.outcome = 'pro_monthly') as pro_monthly,
  COUNT(*) FILTER (WHERE d.outcome = 'pro_annual') as pro_annual,
  COUNT(*) FILTER (WHERE d.outcome = 'student') as student,
  COUNT(*) FILTER (WHERE d.outcome = 'free') as free,
  COUNT(*) FILTER (WHERE d.outcome = 'abandoned') as abandoned,
  -- Conversion rate
  ROUND(100.0 * COUNT(*) FILTER (WHERE d.outcome IN ('pro_monthly', 'pro_annual', 'student')) / NULLIF(COUNT(*), 0), 1) as conversion_pct,
  -- Quality of conversion (D30 retention of paid)
  ROUND(100.0 * COUNT(*) FILTER (WHERE r.churned = false) / NULLIF(COUNT(*) FILTER (WHERE d.outcome IN ('pro_monthly', 'pro_annual', 'student')), 0), 1) as d30_retention_pct,
  -- Source breakdown
  COUNT(*) FILTER (WHERE d.decision_source = 'self') as self_decisions,
  COUNT(*) FILTER (WHERE d.decision_source = 'parent_referred') as parent_decisions,
  COUNT(*) FILTER (WHERE d.decision_source = 'whatsapp_recovery') as recovery_decisions
FROM cohort c
LEFT JOIN decisions d ON d.user_id = c.user_id
LEFT JOIN d30_retention r ON r.user_id = c.user_id;
```

B. Cohort-by-exam-proximity slicer
File: docs/queries/tce-by-exam-proximity.sql

- Same query but GROUP BY exam_proximity_months_at_signup buckets:
  - < 3 months (panic mode)
  - 3-6 months (focused)
  - 6-12 months (committed)
  - > 12 months (early)
- Different cohorts will have wildly different conversion rates

C. Repeat aspirant cohort comparison
File: docs/queries/tce-by-repeat.sql

- Same query but GROUP BY is_repeat_aspirant
- First-attempt vs. repeat: different conversion + retention patterns

D. Day-30 retention cron
File: app/api/cron/d30-retention-eval/route.js
Schedule: daily at 1am IST

- For users who converted to paid 30 days ago:
  - Calculate sessions in last 30 days
  - Determine churn_signal: TRUE if sessions < 5
- Fire event: trial_paid_d30_retained
- Updates the d30_retention CTE in master query

E. Decision rule (post-30-day review)
Document in docs/strategy/TCE_DECISION_RULES.md:

```
IF pct_high_intent < 35%:
  PROBLEM: Activation is broken upstream of TCE
  ACTION: Investigate onboarding, briefing timing, push notification copy
  DO NOT: Iterate on TCE page

IF pct_high_intent ≥ 35% AND conversion_pct < 10%:
  PROBLEM: Day 7 page or pricing
  ACTION: Test hero variants, simplify CTA, check Razorpay friction

IF conversion_pct ≥ 12% AND d30_retention_pct < 60%:
  PROBLEM: Converting people who shouldn't have
  ACTION: Reduce conversion pressure, lengthen trial, improve activation

IF parent_decisions > self_decisions AND d30_retention_pct < 50%:
  PROBLEM: Parents are buying for kids who don't use it
  ACTION: Require student approval step before parent payment
```

F. Founder weekly review template
File: docs/strategy/weekly-tce-review.md

```
# Week of [date]

## Cohort
- New trials this week: ___
- Day 3 segments: high=__% low=__% dead=__%

## Conversion
- Trial→Paid: __% (vs target 10-15%)
- Decision sources: self __% parent __% recovery __%

## Quality
- D30 retention of paid: __% (vs target 65-70%)

## Diagnosis (which rule fires)
- ___

## Action this week
- ___
```

TESTING CHECKLIST:
[ ] Master query runs in <5 seconds on production data
[ ] Returns sensible numbers (sanity check against manual counts)
[ ] All 6 telemetry events have data flowing in
[ ] D30 retention cron runs without errors
[ ] Cohort slicers segment correctly
[ ] No PII exposed in queries (anonymized for sharing)

EXECUTE PHASE 7 → REPORT → STOP

================================================================================
FINAL: GO-LIVE CHECKLIST + ROLLOUT STRATEGY
================================================================================

After all 7 phases complete:

ROLLOUT STRATEGY (do not skip):

1. Internal test: trigger for 5 founder/team accounts, verify end-to-end
2. Soft launch: enable for 10% of new trials (use feature flag)
3. Wait 7 days, check D7 metrics
4. If conversion is in expected range (8-12%), expand to 50%
5. Wait 14 days more, check D30 retention
6. If retention holds, expand to 100%
7. Continue measuring weekly

FEATURE FLAGS:

- Add flag: TCE_ENABLED (default false initially)
- Add flag: TCE_ROLLOUT_PERCENTAGE (default 10)
- Random assignment based on user_id hash
- Document flags in lib/featureFlags.js

GO-LIVE CHECKLIST:
[ ] All 7 phases tested individually
[ ] Master query runs successfully
[ ] All WhatsApp templates approved by Meta
[ ] Feature flag mechanism tested
[ ] Sentry alerts configured for cron failures
[ ] Rollback plan documented (how to disable TCE if metrics tank)
[ ] Founder + team trained on weekly review process

POST-LAUNCH MONITORING:

- Week 1: Daily check of conversion + activation
- Week 2-4: Weekly check using master query
- Month 2: Full cohort analysis with retention
- Month 3: Decision point — iterate, expand, or pivot

ANTI-GOALS (what NOT to do post-launch):

- Don't A/B test 10 hero variants before you have 1000+ trials
- Don't add more panels to the decision page
- Don't introduce countdown timers
- Don't email-blast lapsed users with discounts
- Don't measure success by conversion alone — retention matters more

================================================================================
END OF GROWTH SPRINT PLAN
================================================================================

Wait for my command to "Start Phase 1". Do not begin until I confirm.

```

---

## How to use this prompt effectively

### Initial paste

When you paste this into Claude Code:
- Claude Code will read the plan and acknowledge it
- It will summarize the 7 phases and ask "Ready to start Phase 1?"
- You say: `Start Phase 1`

### Per-phase workflow

1. Claude Code executes the phase (3-7 days depending on phase)
2. Claude Code reports what was built, tested, and any blockers
3. You review the report
4. You approve fixes or request changes
5. You say: `Phase N approved, start Phase N+1`

### Timeline summary

| Phase | Time | Priority | Cumulative |
|---|---|---|---|
| 1. WhatsApp + Schema Foundation | 5-7 days | P0 | Week 1 |
| 2. Day 3 Segmentation Cron | 2-3 days | P0 | Week 2 |
| 3. Day 7 Decision Page | 4-5 days | P0 | Week 3 |
| 4. Day 5-6 Warm-up | 2-3 days | P1 | Week 4 |
| 5. Day 8 WhatsApp Recovery | 2-3 days | P1 | Week 4-5 |
| 6. Parent Flow + Repeat Aspirant | 3-4 days | P1 | Week 5-6 |
| 7. Analytics + Cohort Queries | 2-3 days | P2 | Week 6-7 |
| Soft launch + rollout | 2 weeks | — | Week 8-9 |

**Total: 8-9 weeks for full implementation + rollout.**

### Critical-only path (if short on time)

If you must ship faster, do this minimum:
- **Phase 1 (WhatsApp + Schema)** — non-negotiable foundation
- **Phase 2 (Day 3 Segmentation)** — the actual lever
- **Phase 3 (Day 7 page, but stripped down to Pro CTA only)** — basic TCE
- **Phase 5 (Day 8 recovery via WhatsApp)** — captures lost users

Skip 4, 6, 7 for v1. Add them after measuring v1.

**Critical-only timeline: 4-5 weeks.**

### When to skip a phase entirely

Tell Claude Code:
```

Skip Phase 6 for now. We'll come back to parent flow after measuring v1. Start Phase 7.

```

It'll log the skip and move on.

### What gets built

By end of Phase 7, you'll have:
- WhatsApp Business API fully integrated (with templates, dispatch, webhook)
- 4 new tables (trial_segments, whatsapp_messages, growth_events, + schema extensions)
- 4 new cron jobs (Day 3 segment, Day 5 warmup, Day 8 recovery, D30 retention eval)
- 1 new user-facing page (/trial/decision)
- 1 new recovery flow (/recover)
- 1 new parent flow (/parent-pay)
- 6 telemetry events firing
- 1 master SQL query for weekly review
- 6 approved WhatsApp templates (assuming Meta approves)
- Feature flag system for safe rollout

### Pro tips for execution

1. **Start Meta template approvals on Day 1.** They take 2-5 business days. Don't block on them.
2. **Set up AiSensy/Gupshup account before starting Phase 1.** The signup + verification can take 1-2 days.
3. **Test on real Indian phone numbers.** WhatsApp Business API has slightly different behavior on Jio vs. Airtel vs. VI networks. Test all three if possible.
4. **Run Phase 2 cron in dry-run mode first.** Log what it would do without actually sending messages. Verify segmentation logic before sending.
5. **Don't roll out TCE during exam season (April-June).** Wait until July-August for cleanest signal.
6. **Track parent decisions separately.** They behave differently — different conversion rate, different D30 retention.

---

## What you'll have after this prompt executes

- A growth system grounded in activation (the actual lever)
- TCE layered on activated users (where it works 3-5x better)
- WhatsApp infrastructure for India-first comms
- Parent referral flow (captures 30-50% of buyers)
- Repeat-aspirant awareness (different cohort, different psychology)
- 6 telemetry events that tell you in 30 days whether it worked
- Cohort analysis by exam proximity (honest measurement)
- A decision framework for what to do if metrics aren't what you hoped

**Estimated revenue lift:** If you currently convert 6%, this should get you to 12-15% sustainably (not from the TCE page alone — from the combination of activation + TCE + parent referral + recovery).

**Estimated cost:** ~₹3-7K/month in WhatsApp messages + AiSensy/Gupshup fees, against ~₹20-40K/month MRR lift at 1000 trials/month volume. ROI is clear.

---

## Final note

This prompt assumes you'll do the strategic work of:
- Watching the metrics weekly
- Not over-iterating on the TCE page before you have data
- Killing features that don't work after 30 days
- Building activation upstream if Day 3 segments skew "dead"

The code can be perfect and the metrics can still be bad. The code is here to give you the infrastructure to learn. The learning is on you.

**Now paste the prompt and ship it.**
```
