# AutropicAI API

**You're paying Opus prices for extraction tasks. That's dumb. We fix it for $10/mo.**

AutropicAI tells your agent which LLM to use for each task. 800+ models indexed. One API call before each LLM call. Your agent saves money automatically.

Built for agents doing 100+ LLM calls/day who are bleeding money on model selection.

## Why AutropicAI?

| Feature | OpenRouter | AutropicAI |
|---------|------------|----------|
| Model | Proxy (routes your calls) | Advisory (recommends, you call direct) |
| Pricing | 5.5% of usage | Flat subscription |
| Lock-in | Yes (their API) | No (keep direct provider relationships) |
| At $500/mo spend | $27.50 fee | $25.95 flat |
| At $5000/mo spend | $275 fee | $25.95 flat |

## Pricing

- **Free Trial**: 30 days, 500 queries
- **Starter**: $9.95/mo — 5,000 queries
- **Pro**: $25.95/mo — Unlimited

## MCP Server (For AI Agents)

Add AutropicAI to Claude Desktop or any MCP-compatible agent:

```json
{
  "mcpServers": {
    "autropicai": {
      "command": "npx",
      "args": ["github:tlkc888-Jenkins/autropicai-mcp"]
    }
  }
}
```

Your agent gets a `get_cheapest_model` tool — ask it to find the cheapest model for any task.

**GitHub:** https://github.com/tlkc888-Jenkins/autropicai-mcp

---

## Quick Start

### 1. Sign Up

```bash
curl -X POST https://tryautropic.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "your-password"}'
```

Response includes your API key (save it — only shown once!):
```json
{
  "apiKey": "atp_live_abc123...",
  "trialEndsAt": "2026-03-07T00:00:00.000Z"
}
```

### 2. Find the Cheapest Model

```bash
curl https://tryautropic.com/v1/cheapest?tier=standard \
  -H "Authorization: Bearer atp_live_abc123..."
```

```json
{
  "tier": "standard",
  "recommendations": [
    {
      "provider": "GROQ",
      "model": "llama-3.1-8b-instant",
      "inputCostPer1m": 0.05,
      "outputCostPer1m": 0.08,
      "endpoint": "https://api.groq.com/openai/v1"
    }
  ]
}
```

### 3. Classify Your Task

```bash
curl -X POST https://tryautropic.com/v1/classify \
  -H "Authorization: Bearer atp_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Write a Python function to sort a list"}'
```

```json
{
  "tier": "complex",
  "confidence": 0.75,
  "reasoning": "Complex task indicators detected",
  "recommendedModels": ["groq/llama-3.1-70b", "anthropic/claude-3-haiku"]
}
```

## API Endpoints

### Public

| Endpoint | Description |
|----------|-------------|
| `GET /` | API info and pricing |
| `GET /health` | Health check |
| `GET /v1/tiers` | List tier definitions |

### Authenticated (API Key required)

| Endpoint | Description |
|----------|-------------|
| `GET /v1/cheapest` | Get cheapest models for a tier |
| `POST /v1/classify` | Classify prompt and get recommendations |
| `GET /v1/models` | List all models with pricing |

### Account Management (JWT or API Key)

| Endpoint | Description |
|----------|-------------|
| `GET /account/me` | Your account details |
| `GET /account/keys` | List your API keys |
| `POST /account/keys` | Create new API key |
| `GET /account/usage` | Your usage stats |
| `POST /billing/checkout` | Start subscription |
| `GET /billing/portal` | Manage subscription |

## Tiers

| Tier | Max Input $/1M | Max Output $/1M | Use Case |
|------|----------------|-----------------|----------|
| simple | $1.00 | $5.00 | Basic Q&A, formatting |
| standard | $5.00 | $20.00 | General chat, summarization |
| complex | $20.00 | $80.00 | Coding, analysis |
| max | unlimited | unlimited | Best available |

## Self-Hosting

```bash
# Clone
git clone https://github.com/tlkc888-Jenkins/llm-arbitrage-api.git
cd llm-arbitrage-api

# Configure
cp .env.example .env
# Edit .env with your Stripe keys

# Install & Run
npm install
npm start
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | Yes | Price ID for $9.95 plan |
| `STRIPE_PRICE_PRO` | Yes | Price ID for $25.95 plan |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `BASE_URL` | No | Base URL for callbacks |
| `PORT` | No | Server port (default: 8080) |

## Deploy to Render

1. Push to GitHub
2. Connect repo in Render dashboard
3. Add environment variables
4. Deploy

## License

MIT — Autropic Pty Ltd
