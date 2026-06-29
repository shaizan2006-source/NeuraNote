/**
 * Generates: docs/launch/GROWTH_SPRINT_MANUAL_ACTIONS.pdf
 * Run: node scripts/generate-manual-actions-pdf.js
 */

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "fs";
import { resolve } from "path";

// Works whether run via `node scripts/...` or piped
const ROOT = resolve(process.cwd());
const OUT  = resolve(ROOT, "docs/launch/GROWTH_SPRINT_MANUAL_ACTIONS.pdf");
mkdirSync(resolve(ROOT, "docs/launch"), { recursive: true });

const doc = new PDFDocument({ margin: 50, size: "A4" });
doc.pipe(createWriteStream(OUT));

// ── Colours & helpers ──────────────────────────────────────────────────────
const PURPLE   = "#7C3AED";
const DARK     = "#111827";
const MUTED    = "#6B7280";
const RED      = "#DC2626";
const GREEN    = "#059669";
const AMBER    = "#D97706";
const BG_LIGHT = "#F5F3FF";

let y = 50;

function heading1(text) {
  doc.fontSize(22).fillColor(PURPLE).font("Helvetica-Bold").text(text, 50, y);
  y = doc.y + 4;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(PURPLE).lineWidth(1.5).stroke();
  y += 14;
}

function heading2(text) {
  doc.fontSize(14).fillColor(DARK).font("Helvetica-Bold").text(text, 50, y);
  y = doc.y + 6;
}

function heading3(text, color = DARK) {
  doc.fontSize(11).fillColor(color).font("Helvetica-Bold").text(text, 50, y);
  y = doc.y + 4;
}

function para(text, indent = 0) {
  doc.fontSize(10).fillColor(DARK).font("Helvetica").text(text, 50 + indent, y, { width: 495 - indent });
  y = doc.y + 6;
}

function muted(text, indent = 0) {
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(text, 50 + indent, y, { width: 495 - indent });
  y = doc.y + 4;
}

function bullet(text, indent = 16) {
  doc.fontSize(10).fillColor(DARK).font("Helvetica")
    .text("•  " + text, 50 + indent, y, { width: 495 - indent });
  y = doc.y + 4;
}

function checkBox(label, urgent = false) {
  const color = urgent ? RED : DARK;
  doc.rect(50, y, 10, 10).strokeColor(color).lineWidth(1).stroke();
  doc.fontSize(10).fillColor(color).font(urgent ? "Helvetica-Bold" : "Helvetica")
    .text(label, 66, y + 1, { width: 480 });
  y = doc.y + 6;
}

function tag(text, color) {
  const w = text.length * 6.5 + 12;
  doc.roundedRect(50, y, w, 16, 3).fillColor(color + "22").stroke(color);
  doc.fontSize(8).fillColor(color).font("Helvetica-Bold").text(text, 56, y + 4);
  y += 22;
}

function divider() {
  y += 4;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
  y += 10;
}

function newPage() {
  doc.addPage();
  y = 50;
}

function warn(text) {
  doc.rect(50, y, 495, 14 + doc.heightOfString(text, { width: 479 }))
    .fillColor("#FEF3C7").stroke("#D97706");
  doc.fontSize(9.5).fillColor("#92400E").font("Helvetica")
    .text("⚠  " + text, 58, y + 7, { width: 479 });
  y = doc.y + 14;
}

// ══════════════════════════════════════════════════════════════════════════════
// COVER
// ══════════════════════════════════════════════════════════════════════════════

doc.rect(0, 0, 595, 200).fillColor(PURPLE).fill();
doc.fontSize(28).fillColor("#FFFFFF").font("Helvetica-Bold")
  .text("Growth Sprint", 50, 60);
doc.fontSize(16).fillColor("#DDD6FE").font("Helvetica")
  .text("Manual Actions Required — Do Before Launch", 50, 100);
doc.fontSize(10).fillColor("#A78BFA")
  .text("Ask My Notes  •  askmynotes.in  •  Generated " + new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), 50, 130);

y = 220;

doc.fontSize(10).fillColor(MUTED).font("Helvetica")
  .text("This document lists every action that Claude Code cannot perform for you — account sign-ups, API keys, template submissions, database commands, and device testing. Complete everything in this list before going live.", 50, y, { width: 495 });
y = doc.y + 20;

warn("Start WhatsApp provider sign-up and Meta template submission ON DAY 1 — both take 2-5 business days and will block you if left for the end.");

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — WHATSAPP SETUP
// ══════════════════════════════════════════════════════════════════════════════

divider();
heading1("1.  WhatsApp Business API Setup");
tag("BLOCKS Phase 1", RED);

heading2("1a.  Choose and sign up with a provider");
para("Recommendation: AiSensy — cheapest, best docs, India-focused.");
bullet("Go to https://www.aisensy.com → sign up for Business account");
bullet("Verify your WhatsApp Business number (takes 1-2 business days)");
bullet("Estimated cost: ₹2,000–5,000/mo setup + ₹0.50–1 per message");
bullet("Alternatives: Gupshup (https://www.gupshup.io) or Interakt (https://www.interakt.shop)");
y += 4;

heading2("1b.  Collect these credentials after sign-up");
para("Add each value to .env.local AND Vercel project environment variables:");
y += 4;

const envVars = [
  ["WHATSAPP_PROVIDER",           "aisensy  (or gupshup / interakt)"],
  ["WHATSAPP_API_KEY",            "From your provider dashboard"],
  ["WHATSAPP_PHONE_NUMBER_ID",    "Phone number ID (not the display number)"],
  ["WHATSAPP_BUSINESS_ACCOUNT_ID","From Meta Business Manager"],
  ["WHATSAPP_VERIFY_TOKEN",       "Generate: openssl rand -base64 32 (any secret string)"],
];

for (const [k, v] of envVars) {
  doc.fontSize(9).fillColor("#7C3AED").font("Helvetica-Bold").text(k, 66, y);
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(v, 66, y + 11, { width: 460 });
  y += 26;
}

heading2("1c.  Register the webhook URL in your provider dashboard");
bullet("URL: https://askmynotes.in/api/webhooks/whatsapp");
bullet("Events to subscribe: message_status_updates, messages (inbound)");
bullet("Set WHATSAPP_VERIFY_TOKEN to the same value used in the URL above");

divider();
heading1("2.  Meta WhatsApp Template Submission");
tag("2–5 BUSINESS DAYS", AMBER);

para("Submit all 6 templates in Meta Business Manager → WhatsApp Manager → Message Templates → Create Template.");
para("Do this on Day 1 in parallel with building. Templates block sending until approved.");
y += 4;

const templates = [
  { name: "trial_d3_revive_hinglish",        cat: "MARKETING", vars: "{{1}} = first_name",                               trigger: "Day 3 cron — dead segment" },
  { name: "trial_d3_low_intent_hinglish",    cat: "MARKETING", vars: "{{1}} = first_name, {{2}} = questions, {{3}} = months_to_exam", trigger: "Day 3 cron — low_intent segment" },
  { name: "trial_d3_high_intent_reinforce",  cat: "UTILITY",   vars: "{{1}} = first_name, {{2}} = days_active",           trigger: "Day 3 cron — high_intent segment" },
  { name: "trial_d6_warmup_hinglish",        cat: "MARKETING", vars: "{{1}} = first_name, {{2}} = cards_count",           trigger: "Day 5 warm-up cron" },
  { name: "trial_d8_recovery_hinglish",      cat: "MARKETING", vars: "{{1}} = first_name, {{2}} = cards_count",           trigger: "Day 8 recovery cron" },
  { name: "parent_referral_hinglish",        cat: "UTILITY",   vars: "{{1}} = student_name, {{2}} = payment_link",        trigger: "Parent referral button (Day 7 page)" },
];

for (const t of templates) {
  doc.rect(50, y, 495, 52).fillColor(BG_LIGHT).fill();
  doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text(t.name, 60, y + 8);
  const catColor = t.cat === "MARKETING" ? AMBER : GREEN;
  doc.fontSize(8).fillColor(catColor).font("Helvetica-Bold").text(t.cat, 60, y + 24);
  doc.fontSize(8.5).fillColor(MUTED).font("Helvetica").text("Vars: " + t.vars, 60, y + 36, { width: 300 });
  doc.fontSize(8.5).fillColor(MUTED).font("Helvetica").text("Trigger: " + t.trigger, 280, y + 24, { width: 255 });
  y += 60;
}

muted("Full template body text: docs/launch/whatsapp-templates.md");

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — DATABASE
// ══════════════════════════════════════════════════════════════════════════════

newPage();
heading1("3.  Database Migrations");
tag("APPLY BEFORE TESTING", RED);

para("Run this command after merging Phase 1 code to production:");
y += 4;

doc.rect(50, y, 495, 28).fillColor("#1E1E2E").fill();
doc.fontSize(10).fillColor("#A78BFA").font("Helvetica").text("supabase db push", 62, y + 9);
y += 38;

para("Or paste the SQL manually in the Supabase SQL Editor:");
bullet("File: supabase/migrations/20260523000001_activation_schema.sql");
y += 4;

heading2("What the migration creates");

const migrations = [
  ["profiles columns added",     "phone_number, whatsapp_opt_in, parent_phone_number, is_repeat_aspirant, exam_proximity_months_at_signup, preferred_language"],
  ["user_plans columns added",   "is_trial (BOOLEAN), trial_started_at (TIMESTAMPTZ)"],
  ["New table: trial_segments",  "Stores Day 3 activation signals and segment per user"],
  ["New table: whatsapp_messages","Idempotent log of every WhatsApp message sent"],
  ["New table: growth_events",   "Telemetry events for conversion analytics"],
  ["RLS policies",               "Users can read own rows; service role bypasses for crons"],
];

for (const [label, desc] of migrations) {
  doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text(label, 66, y);
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(desc, 66, y + 13, { width: 460 });
  y += 28;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — VERCEL ENV VARS
// ══════════════════════════════════════════════════════════════════════════════

divider();
heading1("4.  Vercel Environment Variables");
tag("BEFORE DEPLOY", RED);

para("Add these in Vercel Dashboard → Project → Settings → Environment Variables:");
y += 6;

const vercelVars = [
  ["WHATSAPP_PROVIDER",           "aisensy", "All environments"],
  ["WHATSAPP_API_KEY",            "From AiSensy dashboard", "Production + Preview"],
  ["WHATSAPP_PHONE_NUMBER_ID",    "From AiSensy dashboard", "Production + Preview"],
  ["WHATSAPP_BUSINESS_ACCOUNT_ID","From Meta Business Manager", "Production + Preview"],
  ["WHATSAPP_VERIFY_TOKEN",       "Same value as .env.local", "All environments"],
];

// Table header
doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold")
  .text("Variable", 50, y).text("Value", 220, y).text("Environment", 420, y);
y += 14;
doc.moveTo(50, y).lineTo(545, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
y += 6;

for (const [varName, val, env] of vercelVars) {
  doc.fontSize(9).fillColor(PURPLE).font("Helvetica").text(varName, 50, y, { width: 165 });
  doc.fontSize(9).fillColor(DARK).font("Helvetica").text(val, 220, y, { width: 190 });
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(env, 420, y, { width: 120 });
  y += 16;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — DEVICE TESTING
// ══════════════════════════════════════════════════════════════════════════════

newPage();
heading1("5.  Real Device Testing");
tag("BEFORE LAUNCH", AMBER);

para("Claude Code cannot test on physical devices. Test every UI change on both platforms before shipping.");
y += 6;

heading2("Phase 1 — Onboarding phone collection step");
checkBox("iPhone 12 or later — Safari: phone input, parent phone, repeat aspirant toggle");
checkBox("Android (any) — Chrome: same flow");
checkBox("Verify +91 prefix shows correctly, 10-digit limit enforced");
checkBox("Verify STOP → whatsapp_opt_in = false updates in DB");
y += 4;

heading2("Phase 3 — Day 7 decision page");
checkBox("iPhone Safari: hero number renders at 96px, no overflow");
checkBox("Android Chrome: hero number renders at 96px, no overflow");
checkBox("Options sheet: no horizontal scroll on small screens (320px width)");
checkBox("Razorpay opens in <300ms — measure with DevTools Network or performance.now() log");
checkBox("UPI appears as first payment method in Razorpay sheet");
checkBox("Free option: one tap, no extra modal, goes to /dashboard");
checkBox("Parent referral modal: message preview correct, send button works");
para("Lighthouse mobile score target: ≥85", 16);
y += 4;

heading2("WhatsApp message tests (after AiSensy is live)");
checkBox("Send test message to your own +91 number using dispatch service");
checkBox("Verify delivery confirmation updates whatsapp_messages.status");
checkBox("Reply STOP → confirm whatsapp_opt_in = false in DB");
checkBox("Reply YES → confirm growth_events row with action='requested_payment_link'");
checkBox("Test all 3 providers if you switch: AiSensy, Gupshup, Interakt have different payload shapes");

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ROLLOUT STEPS
// ══════════════════════════════════════════════════════════════════════════════

divider();
heading1("6.  Rollout Sequence (after all phases built)");
tag("DO NOT SKIP", RED);

const rollout = [
  ["Internal test",    "Trigger TCE for 5 founder/team accounts. Verify end-to-end: onboarding → Day 3 cron → Day 7 page → payment."],
  ["Soft launch 10%",  "Set TCE_ENABLED=true, TCE_ROLLOUT_PERCENTAGE=10 in Vercel. Random assignment via user_id hash."],
  ["Wait 7 days",      "Check D7 metrics with master SQL query (docs/queries/tce-master.sql after Phase 7 builds it)."],
  ["Expand to 50%",    "If conversion is in 8-12% range: set TCE_ROLLOUT_PERCENTAGE=50."],
  ["Wait 14 days",     "Check D30 retention. Target ≥65%."],
  ["Full rollout",     "Set TCE_ROLLOUT_PERCENTAGE=100 if retention holds."],
  ["Weekly review",    "Run master query every Monday. Follow decision rules in docs/strategy/TCE_DECISION_RULES.md (Phase 7)."],
];

for (const [step, desc] of rollout) {
  doc.rect(50, y, 495, 36).fillColor(y % 72 === 0 ? "#F9FAFB" : "#FFFFFF").fill();
  doc.rect(50, y, 4, 36).fillColor(PURPLE).fill();
  doc.fontSize(10).fillColor(DARK).font("Helvetica-Bold").text(step, 62, y + 8);
  doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(desc, 62, y + 22, { width: 475 });
  y += 42;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — ANTI-GOALS
// ══════════════════════════════════════════════════════════════════════════════

divider();
heading1("7.  Anti-Goals (what NOT to do post-launch)");

const antiGoals = [
  "Don't A/B test 10 hero variants before you have 1,000+ trials.",
  "Don't add more panels to the decision page.",
  "Don't introduce countdown timers.",
  "Don't email-blast lapsed users with discounts.",
  "Don't measure success by conversion alone — retention matters more.",
  "Don't change pricing or copy on the TCE page without 2 weeks of baseline data.",
];

for (const ag of antiGoals) {
  doc.rect(50, y, 8, 8).fillColor(RED + "33").stroke(RED);
  doc.fontSize(10).fillColor(DARK).font("Helvetica").text(ag, 68, y + 0.5, { width: 470 });
  y = doc.y + 6;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — WEEKLY MONITORING CHECKLIST
// ══════════════════════════════════════════════════════════════════════════════

newPage();
heading1("8.  Weekly Monitoring Checklist");
tag("POST-LAUNCH ONGOING", GREEN);

para("Run every Monday after launch. Takes ~15 minutes.");
y += 4;

heading2("Week 1 (daily)");
checkBox("Check new trial sign-ups — phone collection working?");
checkBox("Check Day 3 cron logs in Vercel — any errors?");
checkBox("Manually check 1-2 users in /admin/trial-segments — segments correct?");
checkBox("Verify WhatsApp messages delivered (check whatsapp_messages table)");
y += 4;

heading2("Week 2-4 (weekly — run master SQL query)");
checkBox("cohort_size: total trials this period");
checkBox("pct_high_intent: target ≥35% (if lower, activation is broken upstream)");
checkBox("conversion_pct: target 10-15%");
checkBox("d30_retention_pct: target ≥65%");
checkBox("parent_decisions vs self_decisions: track split");
y += 4;

heading2("Decision rules (from Phase 7)");
const rules = [
  { cond: "pct_high_intent < 35%",                         action: "Fix activation upstream (onboarding, briefing timing, push copy) — do NOT iterate on TCE page." },
  { cond: "pct_high_intent ≥ 35% AND conversion < 10%",   action: "Test hero variants, simplify CTA, check Razorpay friction." },
  { cond: "conversion ≥ 12% AND d30_retention < 60%",     action: "Converting wrong users — reduce conversion pressure, lengthen trial." },
  { cond: "parent_decisions > self AND d30_retention < 50%", action: "Add student approval step before parent payment." },
];

for (const r of rules) {
  doc.rect(50, y, 495, 38).fillColor("#FEF9C3").fill();
  doc.rect(50, y, 3, 38).fillColor(AMBER).fill();
  doc.fontSize(9).fillColor("#92400E").font("Helvetica-Bold").text("IF " + r.cond, 60, y + 6, { width: 475 });
  doc.fontSize(9).fillColor(DARK).font("Helvetica").text("→ " + r.action, 60, y + 22, { width: 475 });
  y += 44;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUICK REFERENCE CHECKLIST
// ══════════════════════════════════════════════════════════════════════════════

newPage();
heading1("Quick Reference — Master Checklist");
para("Print this page. Check off each item before launch.");
y += 10;

const sections = [
  { title: "Infrastructure", items: [
    ["Sign up with AiSensy (or Gupshup/Interakt)", true],
    ["Get API key + Phone Number ID + Business Account ID", true],
    ["Submit 6 Meta WhatsApp templates (start Day 1)", true],
    ["Set WHATSAPP_* env vars in Vercel", true],
    ["Set WHATSAPP_VERIFY_TOKEN in provider + Vercel", true],
    ["Register webhook URL in provider dashboard", true],
  ]},
  { title: "Database", items: [
    ["Apply migration: 20260523000001_activation_schema.sql", true],
    ["Verify new columns exist in profiles + user_plans", false],
    ["Verify trial_segments, whatsapp_messages, growth_events tables created", false],
  ]},
  { title: "Device Testing", items: [
    ["iPhone Safari: onboarding phone step", false],
    ["Android Chrome: onboarding phone step", false],
    ["iPhone Safari: Day 7 decision page", false],
    ["Android Chrome: Day 7 decision page", false],
    ["Razorpay opens in <300ms (measure on real device)", false],
    ["UPI is default payment method", false],
  ]},
  { title: "WhatsApp Live Test", items: [
    ["Send test message to own number using dispatch service", false],
    ["Verify delivery confirmation updates DB", false],
    ["Reply STOP → verify opt-out works", false],
    ["All 6 templates approved by Meta", true],
  ]},
  { title: "Rollout", items: [
    ["Internal test on 5 founder accounts", false],
    ["Set TCE_ENABLED=true, TCE_ROLLOUT_PERCENTAGE=10", false],
    ["Wait 7 days, check D7 metrics", false],
    ["Expand to 50% if conversion 8-12%", false],
    ["Wait 14 days, check D30 retention", false],
    ["Full rollout to 100%", false],
  ]},
];

for (const section of sections) {
  heading3(section.title, PURPLE);
  for (const [label, urgent] of section.items) {
    checkBox(label, urgent);
  }
  y += 4;
}

// ══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ══════════════════════════════════════════════════════════════════════════════

doc.fontSize(8).fillColor(MUTED)
  .text("Ask My Notes — Growth Sprint Manual Actions  •  askmynotes.in  •  Generated by Claude Code", 50, 800, { align: "center", width: 495 });

doc.end();

console.log("✓ PDF generated:", OUT);
