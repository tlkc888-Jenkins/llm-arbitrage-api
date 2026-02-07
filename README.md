# AutropicAI — The MCP Server Marketplace

Find the perfect MCP server for your AI agent. Discover, search, and install tools for Claude, GPT, and any MCP-compatible agent. 

## Features

- **Search** 50+ MCP servers by name or description
- **Filter** by category (Data, DevTools, Communication, etc.)
- **Install** with one-click copy of install commands
- **Submit** new servers for review

## Quick Start

```bash
npm install
npm run seed  # Populate with initial servers
npm start
```

Visit http://localhost:8080

## API

### Public Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/servers` | List/search servers |
| `GET /api/v1/servers/:slug` | Get server details |
| `GET /api/v1/categories` | List categories |
| `GET /api/v1/stats` | Get stats |
| `POST /api/v1/submit` | Submit a server |

### Query Parameters

- `search` - Search by name/description
- `category` - Filter by category slug
- `limit` - Max results (default 100)
- `featured` - Only featured servers

## Categories

- Data & Files
- Developer Tools
- Communication
- Productivity
- Web & Browser
- AI & ML
- Finance
- Infrastructure
- Other

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `ADMIN_KEY` | Admin API key | auto-generated |

## License

MIT — Autropic Pty Ltd
