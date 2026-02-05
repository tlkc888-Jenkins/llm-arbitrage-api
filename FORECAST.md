# LLM Arbitrage API — Month 1 Financial Forecast

**Date:** 2026-02-04
**Scenario:** Conservative launch with organic growth

---

## Assumptions

### Market Context
- AI agents making 100-10,000 LLM calls/day each
- Developers seeking cost optimization (LLM costs are a real pain point)
- No marketing budget — organic/word-of-mouth only

### Pricing Model (Per Query)
| Endpoint | Price | Notes |
|----------|-------|-------|
| `/v1/cheapest` | $0.00002 | Simple lookup |
| `/v1/classify` | $0.00005 | Light compute |
| `/v1/route` (future) | $0.0001 | Proxy + margin |

### User Tiers
| User Type | Queries/Day | % of Users |
|-----------|-------------|------------|
| Hobbyist agent | 100 | 60% |
| Active developer | 1,000 | 30% |
| Production agent | 5,000 | 10% |

---

## Week-by-Week Forecast

### Week 1: Launch
- **New users:** 5 (friends, early adopters from HN/Reddit/Twitter)
- **Avg queries/user/day:** 200
- **Daily queries:** 1,000
- **Daily revenue:** $0.02
- **Weekly revenue:** $0.14

### Week 2: Early Traction
- **New users:** 10 (word of mouth, RapidAPI listing)
- **Total users:** 15
- **Avg queries/user/day:** 300
- **Daily queries:** 4,500
- **Daily revenue:** $0.09
- **Weekly revenue:** $0.63

### Week 3: Growing
- **New users:** 20
- **Total users:** 35
- **Avg queries/user/day:** 400
- **Daily queries:** 14,000
- **Daily revenue:** $0.28
- **Weekly revenue:** $1.96

### Week 4: Momentum
- **New users:** 35
- **Total users:** 70
- **Avg queries/user/day:** 500
- **Daily queries:** 35,000
- **Daily revenue:** $0.70
- **Weekly revenue:** $4.90

---

## Month 1 Summary

| Metric | Value |
|--------|-------|
| **Total users (end of month)** | 70 |
| **Total queries** | ~380,000 |
| **Total revenue** | **$7.63** |
| **Infrastructure cost** | ~$5 (VPS already paid) |
| **Net profit** | **$2.63** |

### Reality Check 🎯
Month 1 revenue: **Under $10**

This is expected. We're building infrastructure and proving the concept.

---

## What Changes the Numbers

### Scenario A: Viral Post (HN/Reddit front page)
- 500 users in week 1 instead of 5
- Month 1 queries: 15M+
- Month 1 revenue: **$300-500**

### Scenario B: One Production Customer
- Single agent platform integrates (100K queries/day)
- Month 1 queries: 3M+
- Month 1 revenue: **$60-100**

### Scenario C: Premium Tier Launch
- Add `/v1/route` proxy at $0.001/query (10x higher)
- 10% of queries use proxy
- Month 1 revenue: **$50-80**

---

## 6-Month Projection (Conservative)

| Month | Users | Queries/Month | Revenue | Notes |
|-------|-------|---------------|---------|-------|
| 1 | 70 | 380K | $7.63 | Launch |
| 2 | 200 | 2M | $40 | RapidAPI traction |
| 3 | 500 | 8M | $160 | First integrations |
| 4 | 1,000 | 25M | $500 | Word of mouth |
| 5 | 2,000 | 60M | $1,200 | Proxy tier launched |
| 6 | 4,000 | 150M | $3,000 | Compounding growth |

**Month 6 run rate:** ~$36K/year

---

## Break-Even Analysis

### Costs (Monthly)
| Item | Cost |
|------|------|
| VPS (existing) | $0 (already have) |
| Domain | $1 |
| Helicone API | $0 (free) |
| Time/maintenance | Your time |
| **Total** | **~$1/month** |

### Break-even: ~50,000 queries/month
At $0.00002/query average, need 50K queries to cover $1/month.
**Week 2 should hit break-even.**

---

## Real Upside: Not Query Revenue

The real value isn't per-query fees. It's:

### 1. Data Asset
- Usage patterns across 860+ models
- Which models agents actually use
- Price sensitivity data
- **Sellable insight to providers**

### 2. Proxy Revenue (Phase 2)
- `/v1/route` proxies actual requests
- Take 5-10% margin on token costs
- Agent spends $100/month on LLMs → you get $5-10

### 3. Enterprise Deals
- Company wants private instance
- $500-2000/month for dedicated deployment
- One customer = 6 months of query revenue

### 4. Acquisition Target
- OpenRouter, Helicone, LiteLLM might want this
- Acqui-hire or feature acquisition
- Small exit: $50-100K

---

## Realistic Month 1 Expectations

**Best case:** $50-100 (viral moment or early enterprise interest)
**Expected:** $5-15 (organic growth, proving concept)  
**Worst case:** $0.50 (nobody finds it)

**The point of Month 1 isn't revenue — it's:**
1. Prove the API works at scale
2. Get 10+ real users
3. Collect feedback
4. Iterate on features
5. Build case studies

Revenue comes in Month 3-6 when you have:
- Proven reliability
- Testimonials
- Proxy tier
- Enterprise features

---

## Action Items for Revenue

1. **Launch this week** — Get it live
2. **Post on HN/Reddit** — "Show HN: I built an API to find the cheapest LLM"
3. **List on RapidAPI** — Passive discovery
4. **Tweet/post results** — "Saved $X by routing to cheaper models"
5. **Add proxy tier** — Real revenue per request
6. **Track everything** — Usage data is valuable

---

*"The best time to plant a tree was 20 years ago. The second best time is now."*

Ship it, learn, iterate.
