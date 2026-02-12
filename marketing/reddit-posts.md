# Reddit Posts — AutropicAI Tool Discovery

## r/ClaudeAI (180k members)

**Title:** I built runtime tool discovery for Claude — no more pre-configuring every MCP server

**Body:**
Been building AI agents and got tired of the MCP setup dance: find server → configure → restart → test → repeat.

So I built something different: **runtime tool discovery**. Your agent discovers and uses tools mid-conversation with zero pre-configuration.

**Live demo:** https://tryautropic.com/demo

Type "What time is in Tokyo?" or "Bitcoin price" and watch it:
1. Query `/discover?q=time` → finds the best tool
2. Call `/mcp/time/tools/call` → executes it
3. Returns result → done

Three HTTP calls. No MCP client needed. No local servers.

**10 hosted tools ready now:** time, weather, crypto prices, calculator, web search, geolocation, memory, JSON utils, web fetch, email

**Why this matters for agents:**
- Agents can expand their capabilities mid-task
- No need to pre-configure every possible tool
- Works from any environment (cloud, serverless, mobile)

Directory has 230+ MCP servers indexed too if you need the full catalog.

GitHub: https://github.com/tlkc888-Jenkins/llm-arbitrage-api
API docs: https://tryautropic.com/api/v1/hosted

Would love feedback on what tools you'd want hosted. We're adding more weekly.

---

## r/LocalLLaMA (400k members)

**Title:** Built a zero-config tool API for local LLMs — discover and call tools via HTTP

**Body:**
Local models are great but tool use is still a pain. Most MCP servers need Node/Python runtimes, specific versions, API keys...

I built an HTTP API that lets any LLM discover and use tools with simple REST calls. No local setup needed.

**Try it:** https://tryautropic.com/demo

**How it works:**
```bash
# 1. Discover what tool can help
curl "https://tryautropic.com/discover?q=weather+london"

# 2. Call it directly
curl -X POST https://tryautropic.com/mcp/weather/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"get_weather","arguments":{"location":"London"}}'
```

That's it. Works with Ollama, llama.cpp, LM Studio — anything that can make HTTP calls.

**10 tools available now:**
- time (timezone conversions)
- weather (wttr.in backend)
- crypto-prices (CoinGecko)
- calculator (safe math eval)
- search (SearXNG/DuckDuckGo)
- geo (geocoding, distance)
- memory (persistent k/v store)
- json (parse, query, format)
- fetch (web scraping)
- email (via Resend API)

Zero API keys needed for most tools. Completely free.

GitHub (all open source): https://github.com/tlkc888-Jenkins/llm-arbitrage-api

What tools would you want added? Building this for the local LLM community.

---

## r/AutoGPT (170k members)

**Title:** Runtime tool discovery for autonomous agents — expand capabilities mid-task

**Body:**
Autonomous agents need to acquire new capabilities on the fly. Pre-configuring every possible tool doesn't scale.

Built an API that lets agents discover and use tools at runtime:

**Demo:** https://tryautropic.com/demo

**Agent workflow:**
1. Agent realizes it needs weather data
2. `GET /discover?q=weather` → returns endpoint + schema
3. `POST /mcp/weather/tools/call` → executes, returns data
4. Agent continues with new information

No configuration. No restarts. No MCP client library needed.

**Available tools:** time, weather, crypto prices, calculator, search, geolocation, memory, JSON, web fetch, email

**Why this matters for AutoGPT-style agents:**
- Dynamic capability expansion
- Works in sandboxed/cloud environments
- Persistent memory across sessions (backed by Supabase)
- Zero setup — just HTTP calls

The `/discover` endpoint is essentially tool search for agents. Describe what you need, get back the right tool.

All open source: https://github.com/tlkc888-Jenkins/llm-arbitrage-api

We're building infrastructure for autonomous agents. What would make this more useful for your projects?

---

## r/MachineLearning (3M members) — SAVE FOR LATER (higher bar)

**Title:** [P] Runtime Tool Discovery API for LLM Agents — Zero-Config MCP Server Access

**Body:**
Sharing a project that might be useful for anyone building tool-using LLM agents.

**Problem:** MCP (Model Context Protocol) servers require local installation and pre-configuration. This doesn't work well for cloud-based agents, serverless functions, or dynamically expanding agent capabilities.

**Solution:** HTTP API for runtime tool discovery and execution. Agents can find and use tools mid-task without pre-configuration.

**Architecture:**
- `/discover?q=<need>` — semantic search over tool catalog
- `/mcp/:server/tools/list` — get tool schemas (MCP-compatible)
- `/mcp/:server/tools/call` — execute tools

**Hosted tools (no API keys required):**
- Time/timezone operations
- Weather (wttr.in)
- Cryptocurrency prices (CoinGecko)
- Calculator (sandboxed eval)
- Web search (SearXNG)
- Geolocation (OpenStreetMap)
- Persistent memory (Supabase-backed)
- JSON utilities
- Web fetch/scraping
- Email (Resend, BYOK)

**Interactive demo:** https://tryautropic.com/demo

**GitHub:** https://github.com/tlkc888-Jenkins/llm-arbitrage-api

Built on Express.js, SQLite for the directory (230+ MCP servers indexed), and free-tier APIs for hosted tools.

Looking for feedback on the discovery mechanism and what additional tools would be valuable.
