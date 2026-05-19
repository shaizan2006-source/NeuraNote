# Metrics & SQL Queries for Launch Phase
*All tracking queries you'll run during Sprints 4-6*
*Copy directly into Supabase SQL editor*

---

## How to use this document

These are the SQL queries you'll run to measure your launch. Save this file. Use the queries weekly.

**Workflow:**
1. Open Supabase Dashboard → SQL Editor
2. Paste a query
3. Run it
4. Copy results to your weekly metrics log

---

## 1. Daily Signup Tracking

### 1.1 — Today's signups by source

```sql
-- Run daily during launch weeks
SELECT
  COALESCE(utm_source, 'direct') as source,
  COUNT(*) as signups_today,
  COUNT(*) FILTER (WHERE onboarding_completed = true) as completed_onboarding,
  ROUND(100.0 * COUNT(*) FILTER (WHERE onboarding_completed = true) / NULLIF(COUNT(*), 0), 1) as onboarding_pct
FROM profiles
WHERE created_at >= CURRENT_DATE
GROUP BY source
ORDER BY signups_today DESC;
```

**What to look for:**
- Which source is driving the most signups today?
- Which source has the best onboarding completion rate?

---

### 1.2 — Weekly signup trend

```sql
-- Weekly cohort view
SELECT
  DATE_TRUNC('week', created_at)::DATE as week_starting,
  COUNT(*) as total_signups,
  COUNT(*) FILTER (WHERE utm_source = 'producthunt') as ph_signups,
  COUNT(*) FILTER (WHERE utm_source LIKE 'reddit%') as reddit_signups,
  COUNT(*) FILTER (WHERE utm_source = 'email_waitlist') as email_signups,
  COUNT(*) FILTER (WHERE utm_source LIKE 'partner%') as partner_signups,
  COUNT(*) FILTER (WHERE utm_source IS NULL) as direct_signups
FROM profiles
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY week_starting
ORDER BY week_starting DESC;
```

**What to look for:**
- Week-over-week growth
- Which channel is consistent vs spikey
- When channels saturate

---

## 2. Conversion Funnel

### 2.1 — Full funnel by signup source

```sql
-- The most important query: conversion at each step
WITH funnel AS (
  SELECT 
    COALESCE(utm_source, 'direct') as channel,
    COUNT(DISTINCT p.id) as step_1_signups,
    COUNT(DISTINCT CASE WHEN p.onboarding_completed THEN p.id END) as step_2_onboarded,
    COUNT(DISTINCT CASE WHEN EXISTS(
      SELECT 1 FROM conversations c WHERE c.user_id = p.id
    ) THEN p.id END) as step_3_asked_question,
    COUNT(DISTINCT CASE WHEN EXISTS(
      SELECT 1 FROM focus_progress fp WHERE fp.user_id = p.id 
      AND fp.started_at >= p.created_at + INTERVAL '1 day'
    ) THEN p.id END) as step_4_returned_day_2,
    COUNT(DISTINCT CASE WHEN p.last_active_at >= p.created_at + INTERVAL '6 days' THEN p.id END) as step_5_active_day_7,
    COUNT(DISTINCT CASE WHEN up.activated_at IS NOT NULL AND up.plan IN ('student', 'pro', 'family') THEN p.id END) as step_6_paid
  FROM profiles p
  LEFT JOIN user_plans up ON p.id = up.user_id
  WHERE p.created_at >= NOW() - INTERVAL '60 days'
  GROUP BY channel
)
SELECT
  channel,
  step_1_signups,
  step_2_onboarded,
  ROUND(100.0 * step_2_onboarded / NULLIF(step_1_signups, 0), 1) as pct_onboarded,
  step_3_asked_question,
  ROUND(100.0 * step_3_asked_question / NULLIF(step_2_onboarded, 0), 1) as pct_asked,
  step_4_returned_day_2,
  ROUND(100.0 * step_4_returned_day_2 / NULLIF(step_3_asked_question, 0), 1) as pct_d2,
  step_5_active_day_7,
  ROUND(100.0 * step_5_active_day_7 / NULLIF(step_1_signups, 0), 1) as pct_d7,
  step_6_paid,
  ROUND(100.0 * step_6_paid / NULLIF(step_1_signups, 0), 1) as conversion_pct
FROM funnel
ORDER BY step_1_signups DESC;
```

**What to look for:**
- Biggest drop-off step = biggest leak
- Channel with highest conversion = double down
- Channel with most signups but low conversion = wasted effort

---

### 2.2 — Channel ROI calculation

```sql
-- Which channel actually drives revenue
SELECT
  COALESCE(utm_source, 'direct') as channel,
  COUNT(DISTINCT p.id) as total_signups,
  COUNT(DISTINCT CASE WHEN up.activated_at IS NOT NULL THEN p.id END) as paid_users,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN up.activated_at IS NOT NULL THEN p.id END) / NULLIF(COUNT(DISTINCT p.id), 0), 2) as conversion_rate,
  SUM(CASE 
    WHEN up.plan = 'student' THEN 199 
    WHEN up.plan = 'pro' THEN 399 
    WHEN up.plan = 'family' THEN 4499/12  -- amortized
    ELSE 0 
  END) as estimated_mrr_inr
FROM profiles p
LEFT JOIN user_plans up ON p.id = up.user_id AND up.activated_at IS NOT NULL
WHERE p.created_at >= NOW() - INTERVAL '60 days'
GROUP BY channel
ORDER BY estimated_mrr_inr DESC;
```

**What to look for:**
- Which channel pays for itself fastest
- Which channel produces the most "real" users (paying)
- Where to spend more time

---

## 3. Retention Metrics

### 3.1 — Day-7 retention by week-of-signup

```sql
-- Are recent cohorts retaining better than older ones?
SELECT
  DATE_TRUNC('week', p.created_at)::DATE as signup_week,
  COUNT(*) as cohort_size,
  COUNT(*) FILTER (
    WHERE p.last_active_at >= p.created_at + INTERVAL '6 days'
  ) as day_7_returned,
  ROUND(100.0 * COUNT(*) FILTER (
    WHERE p.last_active_at >= p.created_at + INTERVAL '6 days'
  ) / NULLIF(COUNT(*), 0), 1) as day_7_retention_pct
FROM profiles p
WHERE p.created_at >= NOW() - INTERVAL '10 weeks'
  AND p.created_at <= NOW() - INTERVAL '7 days'  -- Only count complete weeks
GROUP BY signup_week
ORDER BY signup_week DESC;
```

**Target:** Day-7 retention ≥40%

---

### 3.2 — Day-30 retention (first cohort hits week 6)

```sql
-- Day-30 retention for cohorts that have reached day 30
SELECT
  DATE_TRUNC('week', p.created_at)::DATE as signup_week,
  COUNT(*) as cohort_size,
  COUNT(*) FILTER (
    WHERE p.last_active_at >= p.created_at + INTERVAL '29 days'
  ) as day_30_returned,
  ROUND(100.0 * COUNT(*) FILTER (
    WHERE p.last_active_at >= p.created_at + INTERVAL '29 days'
  ) / NULLIF(COUNT(*), 0), 1) as day_30_retention_pct
FROM profiles p
WHERE p.created_at >= NOW() - INTERVAL '12 weeks'
  AND p.created_at <= NOW() - INTERVAL '30 days'  -- Only cohorts that hit day 30
GROUP BY signup_week
ORDER BY signup_week DESC;
```

**Target:** Day-30 retention ≥20%

---

### 3.3 — Churn analysis

```sql
-- Who's leaving and when
SELECT
  CASE
    WHEN last_active_at IS NULL THEN 'never_studied'
    WHEN last_active_at < created_at + INTERVAL '1 day' THEN 'churned_day_1'
    WHEN last_active_at < created_at + INTERVAL '7 days' THEN 'churned_week_1'
    WHEN last_active_at < created_at + INTERVAL '14 days' THEN 'churned_week_2'
    WHEN last_active_at < created_at + INTERVAL '30 days' THEN 'churned_month_1'
    WHEN last_active_at < NOW() - INTERVAL '7 days' THEN 'recently_churned'
    ELSE 'still_active'
  END as cohort,
  COUNT(*) as users
FROM profiles
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY cohort
ORDER BY 
  CASE cohort
    WHEN 'never_studied' THEN 1
    WHEN 'churned_day_1' THEN 2
    WHEN 'churned_week_1' THEN 3
    WHEN 'churned_week_2' THEN 4
    WHEN 'churned_month_1' THEN 5
    WHEN 'recently_churned' THEN 6
    ELSE 7
  END;
```

**What to look for:**
- "never_studied" >30% = onboarding broken
- "churned_day_1" >40% = product doesn't deliver instant value
- "churned_week_1" >50% = no return hook
- "still_active" >40% = doing well

---

## 4. Engagement & Feature Adoption

### 4.1 — Feature usage rates

```sql
-- What features are users actually using?
SELECT
  COUNT(DISTINCT p.id) as total_users,
  
  -- Brain Map usage
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM analytics_events ae 
    WHERE ae.user_id = p.id AND ae.event_type = 'brain_map_view'
  ) THEN p.id END) as used_brain_map,
  
  -- Q&A usage  
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM conversations c WHERE c.user_id = p.id
  ) THEN p.id END) as asked_question,
  
  -- Briefing usage
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM daily_briefings db WHERE db.user_id = p.id AND db.listened_at IS NOT NULL
  ) THEN p.id END) as listened_briefing,
  
  -- PYQ practice
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM pyq_attempts pa WHERE pa.user_id = p.id
  ) THEN p.id END) as practiced_pyqs,
  
  -- Mock tests
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM mock_tests mt WHERE mt.user_id = p.id AND mt.completed_at IS NOT NULL
  ) THEN p.id END) as took_mock_test,
  
  -- Focus mode
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM focus_progress fp WHERE fp.user_id = p.id
  ) THEN p.id END) as used_focus_mode,
  
  -- Photo doubt
  COUNT(DISTINCT CASE WHEN EXISTS(
    SELECT 1 FROM photo_doubts pd WHERE pd.user_id = p.id
  ) THEN p.id END) as used_photo_doubt

FROM profiles p
WHERE p.created_at >= NOW() - INTERVAL '60 days'
  AND p.last_active_at >= NOW() - INTERVAL '14 days';
```

**Calculate percentages:**
- Brain Map: should be >60% of active users
- Q&A: should be >70%
- Briefing: should be >40% (it's once a day, may be skipped)
- PYQs: should be >50% for serious users
- Mock tests: 20-40% (advanced feature)

---

### 4.2 — Most popular features (engagement depth)

```sql
-- Which feature gets used MOST per user
WITH user_feature_counts AS (
  SELECT 
    p.id as user_id,
    (SELECT COUNT(*) FROM conversations WHERE user_id = p.id) as questions,
    (SELECT COUNT(*) FROM pyq_attempts WHERE user_id = p.id) as pyqs,
    (SELECT COUNT(*) FROM mock_tests WHERE user_id = p.id AND completed_at IS NOT NULL) as mocks,
    (SELECT COUNT(*) FROM focus_progress WHERE user_id = p.id) as focus_sessions,
    (SELECT COUNT(*) FROM photo_doubts WHERE user_id = p.id) as photos,
    (SELECT COUNT(*) FROM daily_briefings WHERE user_id = p.id AND listened_at IS NOT NULL) as briefings
  FROM profiles p
  WHERE p.last_active_at >= NOW() - INTERVAL '14 days'
)
SELECT
  COUNT(*) as users_in_sample,
  AVG(questions) as avg_questions_per_user,
  AVG(pyqs) as avg_pyqs,
  AVG(mocks) as avg_mocks,
  AVG(focus_sessions) as avg_focus_sessions,
  AVG(photos) as avg_photo_doubts,
  AVG(briefings) as avg_briefings_listened,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY questions) as median_questions
FROM user_feature_counts;
```

---

## 5. Revenue Metrics

### 5.1 — MRR (Monthly Recurring Revenue)

```sql
-- Current MRR
SELECT
  COUNT(*) FILTER (WHERE plan = 'student') as student_users,
  COUNT(*) FILTER (WHERE plan = 'pro') as pro_users,
  COUNT(*) FILTER (WHERE plan = 'family') as family_users,
  COUNT(*) as total_paid_users,
  
  -- Monthly MRR calculation
  COUNT(*) FILTER (WHERE plan = 'student' AND billing_cycle = 'monthly') * 199 +
  COUNT(*) FILTER (WHERE plan = 'student' AND billing_cycle = 'yearly') * 133 +  -- amortized
  COUNT(*) FILTER (WHERE plan = 'pro' AND billing_cycle = 'monthly') * 399 +
  COUNT(*) FILTER (WHERE plan = 'pro' AND billing_cycle = 'yearly') * 250 +  -- amortized
  COUNT(*) FILTER (WHERE plan = 'family') * 375  -- ₹4499/12
  as estimated_mrr_inr

FROM user_plans
WHERE activated_at IS NOT NULL 
  AND (expires_at IS NULL OR expires_at > NOW());
```

---

### 5.2 — Conversion rate over time

```sql
-- Trial-to-paid conversion by cohort
SELECT
  DATE_TRUNC('week', up.created_at)::DATE as trial_started_week,
  COUNT(DISTINCT up.user_id) as trials_started,
  COUNT(DISTINCT CASE 
    WHEN up.activated_at IS NOT NULL AND up.plan IN ('student', 'pro', 'family') 
    THEN up.user_id 
  END) as converted_to_paid,
  ROUND(100.0 * COUNT(DISTINCT CASE 
    WHEN up.activated_at IS NOT NULL AND up.plan IN ('student', 'pro', 'family') 
    THEN up.user_id 
  END) / NULLIF(COUNT(DISTINCT up.user_id), 0), 1) as conversion_rate
FROM user_plans up
WHERE up.created_at >= NOW() - INTERVAL '12 weeks'
  AND up.created_at <= NOW() - INTERVAL '1 week'  -- Allow time to convert
GROUP BY trial_started_week
ORDER BY trial_started_week DESC;
```

**Target:** Trial-to-paid ≥10%, growing weekly

---

## 6. Cost Tracking (AI + Infrastructure)

### 6.1 — AI cost per user

```sql
-- Are we within cost budget?
SELECT
  DATE_TRUNC('day', created_at)::DATE as date,
  COUNT(DISTINCT user_id) as active_users,
  SUM(cost_usd) as total_cost_usd,
  ROUND(SUM(cost_usd) / NULLIF(COUNT(DISTINCT user_id), 0), 4) as avg_cost_per_user_usd,
  ROUND(SUM(cost_usd) / NULLIF(COUNT(DISTINCT user_id), 0) * 83, 2) as avg_cost_per_user_inr,
  
  -- By model
  SUM(cost_usd) FILTER (WHERE model = 'gpt-4o-mini') as mini_cost,
  SUM(cost_usd) FILTER (WHERE model = 'gpt-4o') as gpt4o_cost,
  SUM(cost_usd) FILTER (WHERE model = 'text-embedding-3-small') as embedding_cost,
  SUM(cost_usd) FILTER (WHERE model = 'tts-1') as tts_cost
FROM ai_call_log
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY date
ORDER BY date DESC;
```

**Target:**
- Free tier: <$0.05 per user/day = ~$1.50/user/month
- Paid tier: <$0.15 per user/day = ~$4.50/user/month
- Pro tier: <$0.30 per user/day = ~$9.00/user/month

If exceeding: enable more aggressive caching, route more to mini.

---

### 6.2 — Cache hit rate

```sql
-- Is caching working?
SELECT
  DATE_TRUNC('day', queried_at)::DATE as date,
  COUNT(*) as total_qa_queries,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  COUNT(*) FILTER (WHERE cache_hit = false) as cache_misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / NULLIF(COUNT(*), 0), 1) as hit_rate_pct
FROM qa_cache_log  -- assumed table that logs cache lookups
WHERE queried_at >= NOW() - INTERVAL '14 days'
GROUP BY date
ORDER BY date DESC;
```

**Target:** Cache hit rate >30% (reduces costs significantly)

---

## 7. SEO Performance (Sprint 6)

### 7.1 — Blog post traffic

```sql
-- Which blog posts drive signups
SELECT
  bp.slug,
  bp.title,
  bp.published_at,
  COUNT(DISTINCT pv.user_id) as unique_visitors,
  COUNT(DISTINCT p.id) FILTER (WHERE p.utm_source = bp.slug) as signups_from_post,
  COUNT(DISTINCT CASE 
    WHEN p.utm_source = bp.slug AND up.activated_at IS NOT NULL 
    THEN p.id 
  END) as paid_from_post
FROM blog_posts bp
LEFT JOIN page_views pv ON pv.path LIKE '/blog/' || bp.slug
LEFT JOIN profiles p ON p.utm_source = bp.slug
LEFT JOIN user_plans up ON up.user_id = p.id
WHERE bp.published_at IS NOT NULL
  AND bp.published_at <= NOW() - INTERVAL '14 days'  -- 2 weeks aged
GROUP BY bp.slug, bp.title, bp.published_at
ORDER BY signups_from_post DESC;
```

---

### 7.2 — PYQ page traffic

```sql
-- Which PYQ pages drive organic signups
SELECT
  pq.slug,
  pq.subject,
  pq.chapter,
  pq.exam_type,
  COUNT(DISTINCT p.id) FILTER (WHERE p.utm_source = pq.slug) as signups,
  AVG(EXTRACT(EPOCH FROM (p.last_active_at - p.created_at))) as avg_session_minutes
FROM pyqs pq
LEFT JOIN profiles p ON p.utm_source = pq.slug OR p.utm_medium = 'pyq_page'
WHERE p.created_at >= NOW() - INTERVAL '30 days'
GROUP BY pq.slug, pq.subject, pq.chapter, pq.exam_type
HAVING COUNT(DISTINCT p.id) > 0
ORDER BY signups DESC
LIMIT 20;
```

---

## 8. Partner/Creator Tracking

### 8.1 — Partner performance

```sql
-- Which partners are driving the most paid users
SELECT
  pt.partner_code,
  pt.tier,
  pt.commission_rate,
  COUNT(DISTINCT ps.user_id) as total_referrals,
  COUNT(DISTINCT CASE WHEN ps.converted_to_paid_at IS NOT NULL THEN ps.user_id END) as paid_conversions,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ps.converted_to_paid_at IS NOT NULL THEN ps.user_id END) / NULLIF(COUNT(DISTINCT ps.user_id), 0), 1) as conversion_rate,
  SUM(ps.commission_amount_inr) as commission_owed_inr
FROM partners pt
LEFT JOIN partner_signups ps ON pt.id = ps.partner_id
WHERE pt.approved_at IS NOT NULL
GROUP BY pt.partner_code, pt.tier, pt.commission_rate
ORDER BY paid_conversions DESC;
```

---

## 9. Weekly Reporting Template

Run these 5 queries every Monday to generate your weekly report:

### Query 1: Last week vs week before
```sql
SELECT
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '7 days') as signups_this_week,
  (SELECT COUNT(*) FROM profiles WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as signups_last_week,
  (SELECT COUNT(*) FROM user_plans WHERE activated_at >= NOW() - INTERVAL '7 days') as paid_this_week,
  (SELECT COUNT(*) FROM user_plans WHERE activated_at >= NOW() - INTERVAL '14 days' AND activated_at < NOW() - INTERVAL '7 days') as paid_last_week,
  (SELECT COUNT(*) FROM user_plans WHERE expires_at < NOW() AND expires_at >= NOW() - INTERVAL '7 days') as churned_this_week;
```

### Query 2: This week's MRR
```sql
SELECT
  SUM(CASE 
    WHEN plan = 'student' AND billing_cycle = 'monthly' THEN 199
    WHEN plan = 'student' AND billing_cycle = 'yearly' THEN 1599/12
    WHEN plan = 'pro' AND billing_cycle = 'monthly' THEN 399  
    WHEN plan = 'pro' AND billing_cycle = 'yearly' THEN 2999/12
    WHEN plan = 'family' THEN 4499/12
    ELSE 0
  END) as current_mrr_inr
FROM user_plans
WHERE activated_at IS NOT NULL 
  AND (expires_at IS NULL OR expires_at > NOW());
```

### Query 3: Conversion funnel snapshot
(Use query 2.1 from above)

### Query 4: Retention check
(Use query 3.1 from above)

### Query 5: Best channel this week
```sql
SELECT
  COALESCE(utm_source, 'direct') as source,
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE EXISTS(
    SELECT 1 FROM user_plans WHERE user_id = profiles.id AND activated_at IS NOT NULL
  )) as paid
FROM profiles
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY source
ORDER BY paid DESC
LIMIT 5;
```

---

## 10. Weekly Metrics Log Template

After running queries, fill out this template:

```markdown
# Week [N] Metrics Report
Date: [Current date]
Sprint: [4/5/6] Week [W]

## Growth
- Signups this week: [N] (vs [N] last week, +/- [%])
- Cumulative signups: [N]
- Paid users this week: [N] (vs [N] last week)
- Cumulative paid users: [N]
- Current MRR: ₹[N]
- Churned this week: [N]

## Conversion
- Trial-to-paid this week: [%]
- Best converting channel: [name] at [%]

## Retention
- Day-7 retention (cohort from 1 week ago): [%]
- Day-30 retention (cohort from 4 weeks ago): [%]

## Top Channels
1. [Source]: [N] signups, [N] paid
2. [Source]: [N] signups, [N] paid
3. [Source]: [N] signups, [N] paid

## Top Issues
1. [Issue from feedback]
2. [Issue from feedback]
3. [Issue from feedback]

## Wins
- [Specific positive thing]
- [Specific positive thing]
- [Specific positive thing]

## Next Week Priority
1. [Top priority]
2. [Secondary priority]
3. [Stretch goal]
```

Save this in `docs/launch/weekly-reports/week-NN.md`.

By Week 24, you'll have 12 weekly reports showing the journey from launch to validation.
