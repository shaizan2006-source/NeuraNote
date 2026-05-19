# Email Templates
*5 templates for Sprints 4-6 — paste into your email tool*
*Customise all `[brackets]` before sending.*

---

## Template 1 — Friends & Family Beta Invite
*Use: Day 92 (Week 14) — send to 100 personal contacts*

**Subject:** Inviting you to test something I built (Ask-My-Notes)

```
Hi [Name],

I've been working on something for 3 months and want you to be one of
the first 100 to try it.

It's called Ask-My-Notes — AI study companion specifically for Indian
competitive exams (JEE/NEET).

3 things I'm most proud of:
1. Brain Map — visualizes everything you learn (your "second brain")
2. Daily Briefing — 90-second audio every morning, tailored to your weak spots
3. 1000+ Official PYQs from JEE Main, NEET, JEE Advanced

Free 7-day Pro trial. No card.

[Your personal link with utm_source=beta_friends]

If you (or your sibling, cousin, friend) are prepping for these exams,
give it a shot. 5 min upload, then ask it 3 questions.

Then tell me what's broken or missing. I'll respond within 24h.

Thanks for being someone I can show this to first.

— [Your name]
```

**Personalisation tip:** Add 1 sentence about how you know them or why you think it's relevant for them specifically.

---

## Template 2 — Waitlist Activation
*Use: Week 15, Day 99 (public launch week)*

**Subject:** Ask-My-Notes is live (you get early access)

```
Hi [Name],

You signed up for the Ask-My-Notes waitlist back in [month].
We just went public this week on Product Hunt and Reddit.

You're getting early access before the algorithm catches up.

What's available now:
✓ Brain Map (see your knowledge connect)
✓ Daily Briefing (90-sec AI audio every morning)
✓ 1000+ JEE/NEET PYQs (with solutions)
✓ Mock test simulator
✓ Anonymous cohort (other students prepping)

7-day Pro trial. No card required.

[Direct link with utm_source=email_waitlist_activation]

If you have 10 minutes, would love to hear what you think.
Honest feedback only.

— [Your name]
P.S. Built solo over 90 days. This launch is week 1 of public.
```

---

## Template 3 — Beta User Re-engagement
*Use: Week 14, Day 95 — for beta users who signed up but didn't return*

**Subject:** Quick question about Ask-My-Notes (2 min reply)

```
Hi [Name],

You signed up for Ask-My-Notes during our beta last week.
I noticed you didn't come back after day [X].

Wanted to ask directly: what stopped you?

Common answers I get:
- "Too much friction in onboarding"
- "Couldn't figure out how to use Brain Map"
- "Didn't seem worth ₹399 vs free alternatives"
- "AI answers weren't as good as I hoped"
- "Bug/confusion"
- "Just got busy"
- "Other: ___"

Whatever it is, I'd love to know. Reply with 1-2 sentences.

I'll send you 1 month of free Pro just for replying.

Thanks for trying it.

— [Your name]
```

---

## Template 4 — Trial Ending Soon
*Use: Triggered 2 days before trial ends (automated via cron)*

**Subject:** Your free trial ends in [X] days

```
Hi [Name],

Your 7-day Pro trial ends [date].

Here's what you've used so far:
- Asked [N] questions
- Studied [N] concepts (Brain Map shows [N] connections)
- Took [N] mock tests
- Listened to [N] daily briefings

To keep all of this + unlock everything:
→ Student: ₹199/month (₹1599/year, save 33%)
→ Pro: ₹399/month (₹2999/year, save 33%)
→ Family: ₹4499/year (4 students)

[Upgrade link with utm_source=email_trial_end]

Or stay free with limits:
- Free tier: 20 questions/day, basic Brain Map, limited PYQs
- Your data is preserved either way

Questions? Reply directly to this email.

— [Your name]
```

**Note:** Populate [N] fields from the database before sending. See METRICS_SQL_QUERIES.md for queries.

---

## Template 5 — Paying User Referral
*Use: Week 16+ — for users who have been paying for 2+ weeks*

**Subject:** Small favor (1 min, you get free Pro)

```
Hi [Name],

Thanks for being one of Ask-My-Notes' early paying users. Means a lot.

Small ask: do you know 1-3 friends prepping for JEE/NEET who'd benefit from this?

Share your referral link: [their unique referral link]

For each friend who signs up and tries it (no purchase needed):
→ I'll add 1 month of free Pro to your account.
→ Up to 3 months free total.

3 friends try it = 3 months free Pro for you.

No pressure. But if you've found the tool useful, your friends might too.

What's been working for you specifically? I'd love to know — it helps me
explain it better to others.

— [Your name]
```

---

## Sending Checklist

### Template 1 (Beta invites):
- [ ] 100 emails with personalised first line
- [ ] Each link has unique UTM: `utm_source=beta_friends&utm_medium=email&utm_campaign=week14`
- [ ] Sent over 2-3 days, not all at once (avoid spam filters)

### Template 2 (Waitlist):
- [ ] Pull full waitlist from `waitlist_emails` table
- [ ] UTM: `utm_source=email_waitlist_activation`
- [ ] Send Tuesday morning, Week 15

### Template 3 (Re-engagement):
- [ ] Query: users who signed up during beta but 0 sessions in last 3 days
- [ ] Personalise day number they dropped off

### Template 4 (Trial ending):
- [ ] Automated — trigger 48h before `trial_ends_at`
- [ ] Pull actual usage stats from DB before sending

### Template 5 (Referral):
- [ ] Target users with `payment_id IS NOT NULL` and `created_at < NOW() - 14 days`
- [ ] Unique referral code per user (generate via `/api/admin/referrals`)

---

## Subject Line A/B Tests (Week 16+)

| Template | Version A | Version B |
|---|---|---|
| Waitlist | "Ask-My-Notes is live (you get early access)" | "Early access for you — Ask-My-Notes launched" |
| Trial end | "Your free trial ends in [X] days" | "Before your trial ends — a quick note" |
| Referral | "Small favor (1 min, you get free Pro)" | "3 months free Pro — here's how" |

Pick version based on open rate after 100 sends.
