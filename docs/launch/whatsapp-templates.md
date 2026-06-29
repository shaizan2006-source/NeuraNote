# WhatsApp Templates — Meta Submission

Submit all 6 templates to Meta Business Manager **on Day 1** of Phase 1.
Approval takes 2-5 business days. Build in parallel; do not block on approval.

Submit at: Meta Business Manager → WhatsApp Manager → Message Templates → Create Template

---

## Template 1: trial_d3_revive_hinglish

| Field | Value |
|---|---|
| **Name** | `trial_d3_revive_hinglish` |
| **Category** | MARKETING |
| **Language** | Hindi (or Hinglish — select Hindi) |

**Body text:**
```
Hi {{1}}, tumne Ask My Notes start kiya tha 3 din pehle but kuch zyada study nahi hua. Kya tumhe schedule change karna hai? Reply YES if you want help, ya STOP if you don't want messages.
```

**Variables:**
| Index | Key | Example |
|---|---|---|
| {{1}} | first_name | Priya |

**Trigger:** Day 3 cron, `segment = 'dead'`

---

## Template 2: trial_d3_low_intent_hinglish

| Field | Value |
|---|---|
| **Name** | `trial_d3_low_intent_hinglish` |
| **Category** | MARKETING |
| **Language** | Hindi |

**Body text:**
```
{{1}}, briefing aaj 7am IST par bhejenge. Tumne {{2}} questions puchhe hain ab tak. Continue karte raho — exam {{3}} mahine door hai.
```

**Variables:**
| Index | Key | Example |
|---|---|---|
| {{1}} | first_name | Aryan |
| {{2}} | questions_count | 5 |
| {{3}} | months_to_exam | 8 |

**Trigger:** Day 3 cron, `segment = 'low_intent'`

---

## Template 3: trial_d3_high_intent_reinforce

| Field | Value |
|---|---|
| **Name** | `trial_d3_high_intent_reinforce` |
| **Category** | UTILITY |
| **Language** | Hindi |

**Body text:**
```
{{1}}, tum {{2}} din se study kar rahe ho. Briefing on time mil rahi hai? Settings mein time change kar sakte ho. Keep going.
```

**Variables:**
| Index | Key | Example |
|---|---|---|
| {{1}} | first_name | Sneha |
| {{2}} | days_active | 3 |

**Trigger:** Day 3 cron, `segment = 'high_intent'`

---

## Template 4: trial_d6_warmup_hinglish

| Field | Value |
|---|---|
| **Name** | `trial_d6_warmup_hinglish` |
| **Category** | MARKETING |
| **Language** | Hindi |

**Body text:**
```
{{1}}, tumhara Pro trial kal khatam ho raha hai. Tumhare {{2}} FSRS cards abhi tak schedule mein hain. Continue karna hai?
```

**Variables:**
| Index | Key | Example |
|---|---|---|
| {{1}} | first_name | Rohan |
| {{2}} | cards_count | 47 |

**Trigger:** Day 5 cron (warm-up), activated users only

---

## Template 5: trial_d8_recovery_hinglish

| Field | Value |
|---|---|
| **Name** | `trial_d8_recovery_hinglish` |
| **Category** | MARKETING |
| **Language** | Hindi |

**Body text:**
```
Hi {{1}}, tumhara trial kal khatam ho gaya. {{2}} cards abhi bhi tumhara wait kar rahe hain. Wapas aana hai? Reply YES for payment link, ya STOP to opt out.
```

**Variables:**
| Index | Key | Example |
|---|---|---|
| {{1}} | first_name | Kavya |
| {{2}} | cards_count | 63 |

**Trigger:** Day 8 cron, lapsed activated users

---

## Template 6: parent_referral_hinglish

| Field | Value |
|---|---|
| **Name** | `parent_referral_hinglish` |
| **Category** | UTILITY |
| **Language** | Hindi |

**Body text:**
```
Namaste, {{1}} (your child) is using Ask My Notes for JEE/NEET prep. Ye Pro plan ka payment link hai: {{2}}. Pro plan ₹399/month hai, ya ₹4,499/year (saves ₹2,389).
```

**Variables:**
| Index | Key | Example |
|---|---|---|
| {{1}} | student_name | Aditya |
| {{2}} | payment_link | https://askmynotes.in/parent-pay?token=... |

**Trigger:** Parent referral flow (Phase 6), initiated by student on Day 7 decision page

---

## Submission checklist

- [ ] All 6 templates submitted in Meta Business Manager
- [ ] Category set correctly (MARKETING vs UTILITY — affects billing)
- [ ] Each template has sample variable values filled in (required by Meta)
- [ ] Phone number verified in Meta Business Manager
- [ ] Business verified (may require documents for MARKETING category)
- [ ] Track approval status — approvals typically arrive within 2-5 business days

## Post-approval

Once approved, update `WHATSAPP_PHONE_NUMBER_ID` in Vercel environment variables
and test each template by sending to your own number using the dispatch service:

```js
import { dispatchWhatsApp } from "@/lib/whatsapp/dispatch";

await dispatchWhatsApp({
  userId: "your-user-id",
  phoneNumber: "+91XXXXXXXXXX",
  templateName: "trial_d3_revive_hinglish",
  variables: { "1": "Test" },
  idempotencyKey: `test_${Date.now()}`,
});
```
