# Mining Intelligence API — Deploy Checklist

## Code Changes (DONE ✅)
- [x] Added `lib/mining-intelligence.js` — data loader
- [x] Added `data/mining/` — labs, drillers, jobs, equipment, prices, announcements
- [x] Added routes to `server.js`:
  - `/api/mining/labs`
  - `/api/mining/drillers`
  - `/api/mining/jobs`
  - `/api/mining/equipment`
  - `/api/mining/prices`
  - `/api/mining/announcements`
  - `/api/mining/announcements/capital-raises`
  - `/api/mining/announcements/exploration`
- [x] Updated `/api/mining` root endpoint with new endpoints

## Stripe Products Needed

### Free Tier (No Stripe product)
- 100 queries/day
- All endpoints accessible
- Rate limited by IP

### Mining Pro — $99/month
- 10,000 queries/day
- All endpoints
- API key for tracking

### Mining Intelligence — $499/month  
- 100,000 queries/day
- All endpoints + priority support
- Signals & anomaly alerts (coming)
- API key for tracking

**Create in Stripe Dashboard:**
1. Product: "Mining Intelligence Pro" → Price: $99 AUD/month
2. Product: "Mining Intelligence Enterprise" → Price: $499 AUD/month

## Deploy Steps

1. **Git commit & push:**
   ```bash
   cd projects/llm-arbitrage-api
   git add .
   git commit -m "Add Mining Intelligence API endpoints"
   git push
   ```

2. **Render auto-deploys** from main branch

3. **Test endpoints:**
   ```bash
   curl https://tryautropic.com/api/mining
   curl https://tryautropic.com/api/mining/labs
   curl https://tryautropic.com/api/mining/jobs?work_type=FIFO
   ```

## Data Files
Located in `data/mining/`:
- `labs.json` — 13 Australian assay labs
- `drillers.json` — 10 drilling contractors
- `jobs.json` — 150 mining job listings
- `equipment.json` — 5 heavy equipment listings
- `commodity_prices.json` — Gold, copper, lithium, etc.
- `asx_data.json` — ASX announcements from 40+ mining companies

## Future: Real-time Data
- Jobs: Connect to Seek/Indeed APIs
- Prices: Connect to LME/metals.live APIs  
- Announcements: Scheduled ASX scraper (cron)
- Equipment: Scrape Machines4U, Ritchie Bros
