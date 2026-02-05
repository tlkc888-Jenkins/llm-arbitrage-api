# LLM Arbitrage API — Specification

**Project:** LLM pricing arbitrage router for AI agents
**Codename:** `routr` (or `cheapllm` or `tokenomics`)
**Status:** MVP in development
**Date:** 2026-02-04

---

## Problem Statement

AI agents burn money on LLM calls. They often use expensive models for simple tasks.
No service currently offers **real-time, task-aware routing** to the cheapest capable model.

## Solution

An API that:
1. Takes a task/prompt complexity indicator
2. Returns the cheapest model(s) that can handle it
3. Optionally proxies the request to that provider

**High frequency × low margin = sustainable revenue**

---

## Core Features (MVP)

### 1. GET /v1/cheapest
Returns cheapest models for a given task tier.

**Request:**
```
GET /v1/cheapest?tier=simple&limit=5
GET /v1/cheapest?tier=complex&max_input_cost=5
```

**Tiers:**
- `simple` — Basic Q&A, formatting, extraction (use Haiku/Mistral-small/Groq)
- `standard` — General chat, summarization (use Sonnet/GPT-4o-mini)
- `complex` — Reasoning, coding, analysis (use Opus/GPT-4/Claude)
- `max` — Best available regardless of cost

**Response:**
```json
{
  "tier": "simple",
  "recommendations": [
    {
      "provider": "GROQ",
      "model": "llama-3.1-8b-instant",
      "input_cost_per_1m": 0.05,
      "output_cost_per_1m": 0.08,
      "total_cost_1k_tokens": 0.000065,
      "endpoint": "https://api.groq.com/openai/v1",
      "notes": "Fastest, cheapest, good for simple tasks"
    },
    {
      "provider": "ANTHROPIC", 
      "model": "claude-3-haiku-20240307",
      "input_cost_per_1m": 0.25,
      "output_cost_per_1m": 1.25,
      "total_cost_1k_tokens": 0.00075,
      "endpoint": "https://api.anthropic.com/v1"
    }
  ],
  "cached_at": "2026-02-04T20:58:00Z",
  "query_cost_usd": 0.00001
}
```

### 2. POST /v1/classify
Classifies a prompt into a tier (simple/standard/complex).

**Request:**
```json
{
  "prompt": "What is 2+2?",
  "system": "You are a helpful assistant"
}
```

**Response:**
```json
{
  "tier": "simple",
  "confidence": 0.95,
  "reasoning": "Basic arithmetic question",
  "recommended_models": ["groq/llama-3.1-8b", "anthropic/haiku"]
}
```

### 3. POST /v1/route (Phase 2)
Proxy mode — actually routes the request to cheapest provider.

**Request:**
```json
{
  "messages": [{"role": "user", "content": "Hello"}],
  "tier": "auto",
  "max_cost_per_1k": 0.01
}
```

**Response:** Standard OpenAI-compatible chat completion response.

---

## Data Sources

### Primary: Helicone API (FREE)
```bash
curl "https://www.helicone.ai/api/llm-costs"
```
- 1,121 models
- Updated regularly
- No auth required
- Covers: OpenAI, Anthropic, Google, Mistral, Groq, Together, Cohere, etc.

### Refresh Strategy
- Cache pricing data locally (refresh every 6 hours)
- Store in SQLite or JSON file
- Track price changes over time (could be interesting data)

---

## Task Classification Logic

### Simple (Tier 1) — Use cheapest models
- Short prompts (<500 tokens)
- Basic questions, formatting, extraction
- No reasoning required
- Keywords: "what is", "list", "format", "extract"

### Standard (Tier 2) — Use mid-tier models  
- Medium prompts (500-2000 tokens)
- Summarization, general chat
- Light reasoning
- Keywords: "summarize", "explain", "help me"

### Complex (Tier 3) — Use premium models
- Long prompts or context (>2000 tokens)
- Coding, analysis, multi-step reasoning
- Keywords: "analyze", "debug", "write code", "compare"

### Max (Tier 4) — Use best available
- When quality is critical
- User explicitly requests best

---

## Revenue Model

### Option A: Per-Query Fee
- $0.00005 per /cheapest query
- $0.0001 per /classify query
- $0.0002 per /route query (includes margin on token cost)

### Option B: Subscription
- Free: 1,000 queries/day
- Pro ($19/mo): 100,000 queries/day
- Enterprise: Unlimited + SLA

### Option C: Savings Share
- Track what user would have paid (naive approach)
- Track what they actually paid (our routing)
- Take 10% of the difference

**MVP: Start free, add monetization once there's traction**

---

## Technical Stack

### MVP (Simple)
- **Runtime:** Node.js or Python (FastAPI)
- **Data:** JSON file with cached Helicone data
- **Hosting:** Tom's VPS (Hostinger)
- **Auth:** API keys (simple UUID)

### Scale (Later)
- Redis for caching
- PostgreSQL for usage tracking
- Rate limiting
- Usage analytics dashboard

---

## API Design Principles

1. **OpenAI-compatible** — Easy drop-in for existing agents
2. **Fast** — <50ms response time for /cheapest
3. **Transparent** — Show exactly why we recommended what
4. **No lock-in** — We return endpoints, user calls providers directly

---

## Competitive Landscape

| Service | What they do | Gap we fill |
|---------|--------------|-------------|
| OpenRouter | Unified API, markup pricing | We optimize for cheapest, not just unified |
| LiteLLM | Self-hosted router | We're hosted, no setup required |
| Helicone | Monitoring/analytics | We route, they track |
| Direct APIs | Single provider | We compare all providers |

**Our edge:** Task-aware routing + hosted simplicity + agent-focused

---

## MVP Milestones

### Day 1 (Today)
- [x] Spec document
- [ ] Fetch and cache Helicone pricing data
- [ ] Build /v1/cheapest endpoint
- [ ] Basic tier filtering

### Day 2
- [ ] Build /v1/classify endpoint (simple heuristics first)
- [ ] Deploy to VPS
- [ ] Basic API key auth

### Day 3
- [ ] Documentation
- [ ] Landing page (simple)
- [ ] List on RapidAPI?

### Week 2
- [ ] /v1/route proxy mode
- [ ] Usage tracking
- [ ] Improve classification (maybe use cheap LLM)

---

## Open Questions

1. **Name?** routr / cheapllm / tokenomics / inferex / ????
2. **Proxy mode risk?** Handling API keys for multiple providers is sensitive
3. **Classification accuracy?** Heuristics vs using a cheap LLM to classify
4. **Marketing?** How do we get agents to use this?

---

## Success Metrics

- **Adoption:** API calls per day
- **Savings delivered:** $ saved vs naive approach
- **Revenue:** When we add monetization

---

## Notes

- Helicone data is open source: https://github.com/Helicone/helicone/tree/main/costs
- Could contribute back if we find pricing errors
- Agent economy is growing fast — timing is good
