---
title: I indexed 231 MCP servers so you don't have to dig through GitHub
published: false
tags: mcp, ai, claude, llm, opensource
---

## The Problem

If you've tried to find MCP (Model Context Protocol) servers for Claude or other AI agents, you know the pain. They're scattered across:

- The official Anthropic repo
- awesome-mcp-servers (400+ entries, barely organized)
- Random GitHub repos
- Hacker News comments

Want a database connector? Good luck finding which of the 50 Postgres MCP servers actually works.

## The Solution

I built **[AutropicAI](https://tryautropic.com)** — a searchable directory with 231 MCP servers indexed and categorized.

**Features:**
- 🔍 Search by name or description
- 📂 Filter by category (Databases, AI/ML, DevTools, etc.)
- 📋 One-click Claude Desktop config copy
- 📤 Submit your own servers

## The Meta Twist

AutropicAI is itself an MCP server. Your AI agent can discover other tools:

```json
{
  "mcpServers": {
    "autropicai": {
      "command": "npx",
      "args": ["-y", "github:tlkc888-Jenkins/autropicai-mcp"]
    }
  }
}
```

Then in Claude:
> "I need an MCP server that can send emails"

And it returns matching servers with install instructions.

## What's Indexed?

| Category | Examples |
|----------|----------|
| Data & Files | PostgreSQL, MongoDB, SQLite, Google Drive |
| Developer Tools | GitHub, GitLab, Sentry, Docker |
| Communication | Slack, Discord, Telegram, email |
| Productivity | Notion, Linear, Todoist, calendars |
| Web & Browser | Puppeteer, Playwright, Brave Search |
| AI & ML | OpenAI, Anthropic, Ollama, vector DBs |
| Infrastructure | AWS, Kubernetes, Cloudflare |

## Open Source

The whole thing is MIT licensed:
- 🔗 [GitHub](https://github.com/tlkc888-Jenkins/llm-arbitrage-api)
- 🌐 [tryautropic.com](https://tryautropic.com)

## What's Missing?

I'd love feedback:
- What servers should I add?
- What features would help?
- Any bugs?

Drop a comment or submit servers directly on the site!

---

*Built by [Autropic](https://autropic.com) — we're building tools for the agent economy.*
