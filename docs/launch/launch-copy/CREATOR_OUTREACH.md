# Creator Outreach Templates
*Week 13, Day 89 — send 15 personalised emails*
*Customise `{creator_name}`, `{their_recent_content}`, `{their_audience_topic}` for each.*

---

## Target List Structure

Create `docs/launch/CREATOR_LIST.csv` with:
```
name, platform, follower_count, niche, contact, status, utm_code
```

**Status values:** `not_contacted | contacted | responded | partnership | declined`
**UTM codes:** `creator_<lastname>` (e.g. `creator_sharma`)

### Target 20 creators (mix of sizes):
- 5 mid-tier YouTubers (50K–200K subs) — JEE Physics, NEET Bio
- 5 small YouTubers (10K–50K subs) — faster to respond, more personal
- 5 Instagram educators (10K–100K) — visual content
- 3 Twitter accounts (active JEE/NEET discussion)
- 2 Reddit power users (high karma in r/JEE or r/NEET)

**How to find them:**
- YouTube: search "JEE Physics" → sort Upload Date → last month → top 10
- Same for "NEET Biology", "JEE Chemistry", "JEE Math"
- Instagram: hashtags #JEE2026 #NEET2026 #JEEPrep
- Twitter: "JEE prep" → filter People → sort followers

---

## Template 1 — Initial Outreach

**Subject:** 5-minute feedback on AI study tool for JEE/NEET?

```
Hi {creator_name},

I've been following your {their_audience_topic} content for a while.
Particularly liked {their_recent_content} — {specific thing you noticed}.

I built Ask-My-Notes — AI study companion for JEE/NEET. Currently in launch phase.

3 things your audience would find useful:
1. Brain Map: visualizes concept relationships automatically
2. 1000+ Official PYQs (saves time on practice)
3. Daily AI Briefing: helps with retention — which is your audience's biggest pain point

Would you have 5 minutes to:
1. Try it free (no card needed)
2. Tell me what you think
3. Consider if it'd help your audience

If you do mention it and your audience signs up, I'd love to share revenue
(20% commission, recurring). But genuine feedback is what I'm really after right now.

Link: [your trial link with utm_source=creator_{their_lastname}]

Thanks for considering it!

— [Your name]
[Your email]
[Your Twitter]
```

---

## Template 2 — Follow-up (7 days after no reply)

**Subject:** Re: Ask-My-Notes — quick follow-up

```
Hi {creator_name},

Following up on my note from last week about Ask-My-Notes.

Since then, we launched on Product Hunt (finished #[N] of the day) and got
[N] signups in the first week.

Quick question: is JEE/NEET tools content something your audience asks about?
If not, totally fine — would rather know now than waste your time.

If yes, I'd love to share a free account for you to try and give feedback.

Either way — appreciate you taking the time.

— [Your name]
```

---

## Template 3 — Partnership Details (for creators who responded positively)

**Subject:** Re: Ask-My-Notes — partnership details

```
Hi {creator_name},

Thanks for trying Ask-My-Notes and the kind feedback!
Glad {specific thing they liked}.

Here's how partnership works:

YOUR REFERRAL CODE: {unique code}
TRACKING URL: {unique URL}
COMMISSION: 20% of every paid subscription, lifetime (not just first month)

When someone signs up via your link and pays:
- Student tier ₹199/mo → ₹40/month commission (lifetime)
- Pro tier ₹399/mo → ₹80/month commission (lifetime)
- Annual: ₹520–600 commission per subscription

YOUR DASHBOARD: {link to /partners/dashboard}
Real-time view of:
- Signups from your link
- Conversions to paid
- Commission accrued
- Payouts received

PAYOUTS: Monthly, on the 5th. Via bank transfer or UPI.

CO-PROMOTION IDEAS (no obligation):
- Mention in your next video ("here's a tool I tried")
- Tweet/Instagram story
- Integration in a study plan video
- Live walkthrough with your audience

Whatever feels natural to you. I trust you to know your audience.

Any questions? Happy to jump on a call (15 min) if easier.

— [Your name]
```

---

## Tracking Sheet

Maintain in `docs/launch/CREATOR_LIST.csv`:

| Creator | Platform | Followers | Contact | Sent Date | Status | Response | Deal |
|---|---|---|---|---|---|---|---|
| [Name] | YouTube | 45K | email | [date] | contacted | — | — |

**Update weekly. Review every Monday.**

---

## Response Decision Tree

```
Creator responds positively?
  → Send Template 3 (partnership details) within 24h

Creator says "not my niche"?
  → Reply: "Totally understand — thanks for being direct. Keep up the great work!"
  → Mark declined, move on

Creator says "interested, what's in it for me?"
  → Send Template 3 immediately

Creator ignores initial email?
  → Send Template 2 at day 7
  → If no reply after day 14 → mark not_interested, stop

Creator posts negative feedback publicly?
  → Respond publicly: "Thanks for the honest take — [address the specific point]"
  → DM: "Would love to fix [issue]. Happy to give you extended trial."
```

---

## What NOT to Do

- Don't send mass emails — personalisation is required, they can tell
- Don't offer free accounts before asking for feedback first
- Don't pitch commission before they've tried the product
- Don't follow up more than twice
- Don't negotiate commission below 15% (sets bad precedent)
