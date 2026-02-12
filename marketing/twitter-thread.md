# Twitter/X Thread — AutropicAI Tool Discovery

## Thread (for Tom to post or adapt)

---

**1/7**
What if your AI agent could discover new tools mid-conversation?

No pre-configuration. No restarts. Just "I need weather data" → tool found → tool used.

Built it. Here's a live demo 🧵

https://tryautropic.com/demo

---

**2/7**
The problem with MCP servers:
- Find the server
- Install dependencies
- Configure your client
- Restart everything
- Hope it works

For EVERY tool. That doesn't scale.

---

**3/7**
Our approach: Runtime discovery

Agent: "I need current time in Tokyo"

→ GET /discover?q=time
→ POST /mcp/time/tools/call

Two HTTP calls. Done.

No MCP client needed. Works anywhere.

---

**4/7**
10 tools hosted and ready:
🕐 Time/timezone
🌤️ Weather
₿ Crypto prices
🧮 Calculator
🔍 Web search
📍 Geolocation
💾 Memory (persistent!)
📋 JSON utils
🌐 Web fetch
📧 Email

Zero API keys for most.

---

**5/7**
Why this matters for agents:

✅ Expand capabilities mid-task
✅ Works in serverless/cloud
✅ No local dependencies
✅ Agents can self-improve

The agent doesn't need to know tools exist beforehand. It discovers them when needed.

---

**6/7**
Plus: 230+ MCP servers indexed in our directory

Search by capability, not by name. Find what you need.

https://tryautropic.com

---

**7/7**
All open source:
https://github.com/tlkc888-Jenkins/llm-arbitrage-api

Building infrastructure for the agent economy.

What tools should we host next?

---

## Shorter version (single tweet + thread starter)

**Main tweet:**
Built runtime tool discovery for AI agents.

Your agent can now discover + use tools mid-conversation. No pre-config needed.

🔍 /discover?q=weather → finds tool
⚡ /mcp/weather/tools/call → executes it

Live demo: tryautropic.com/demo

10 hosted tools. 230+ indexed. All free.

---

## Engagement-bait version

**Tweet:**
Spent 2 weeks building tool discovery for AI agents.

The demo is 3 HTTP calls:
1. "What can help with weather?"
2. Gets endpoint
3. Calls it

No SDK. No config. No API keys.

Try it: tryautropic.com/demo

If this gets 100 likes I'll add 10 more tools this week 🧵
