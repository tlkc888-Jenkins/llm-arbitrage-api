# AutropicAI — The MCP Server Marketplace

**🔍 Find the perfect MCP server for your AI agent.**

Discover, search, and install 231+ Model Context Protocol servers for Claude, GPT, and any MCP-compatible agent.

🌐 **Live:** [tryautropic.com](https://tryautropic.com)

## Why AutropicAI?

MCP servers are scattered across hundreds of GitHub repos. Finding the right one is painful. We index them all in one searchable directory.

- **231+ servers** indexed and categorized
- **Search** by name, description, or tags
- **Filter** by category (Databases, AI/ML, DevTools, etc.)
- **One-click install** — copy Claude Desktop config
- **Submit your own** servers for review

## For AI Agents 🤖

AutropicAI itself is an MCP server! Let your agent discover tools dynamically:

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

**Tools:**
- `find_mcp_server` — "I need to send emails" → returns matching servers
- `list_mcp_servers` — Browse by category
- `get_mcp_server_details` — Full install instructions

## Categories

| Category | Servers |
|----------|---------|
| Data & Files | Databases, file systems, cloud storage |
| Developer Tools | GitHub, GitLab, code execution |
| Communication | Slack, Discord, Telegram, email |
| Productivity | Notion, Linear, calendars |
| Web & Browser | Puppeteer, Playwright, search |
| AI & ML | LLMs, embeddings, vector DBs |
| Finance | Stripe, Plaid, crypto |
| Infrastructure | AWS, Kubernetes, Docker |
| Other | Everything else |

## API

### Public Endpoints

```
GET  /api/v1/servers          # List/search servers
GET  /api/v1/servers/:slug    # Get server details
GET  /api/v1/categories       # List categories
GET  /api/v1/stats            # Get stats
POST /api/v1/submit           # Submit a server
```

### Query Parameters

- `search` — Search by name/description
- `category` — Filter by category slug
- `limit` — Max results (default 100)
- `featured` — Only featured servers

## Self-Host

```bash
git clone https://github.com/tlkc888-Jenkins/llm-arbitrage-api
cd llm-arbitrage-api
npm install
npm run seed  # Seeds 231 servers
npm start     # http://localhost:8080
```

## Contributing

Submit servers via the website or PR. We welcome contributions!

## Links

- 🌐 [tryautropic.com](https://tryautropic.com)
- 🐦 [@AutropicAI](https://twitter.com/AutropicAI)
- 📧 hello@autropic.com

## License

MIT — [Autropic Pty Ltd](https://autropic.com) (ABN 90 691 505 718)
