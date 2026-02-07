#!/usr/bin/env node
/**
 * Add more servers from awesome-mcp-servers
 */

const db = require('../lib/database');

const MORE_SERVERS = [
  // Aggregators
  { name: 'Pipedream', slug: 'pipedream', description: 'Connect with 2,500 APIs with 8,000+ prebuilt tools', github_url: 'https://github.com/PipedreamHQ/pipedream', category: 'other', tags: ['aggregator', 'apis'], github_stars: 8000 },
  { name: 'Anyquery', slug: 'anyquery', description: 'Query 40+ apps with SQL - PostgreSQL, MySQL, SQLite compatible', github_url: 'https://github.com/julien040/anyquery', category: 'data-files', tags: ['sql', 'aggregator'], github_stars: 2000 },
  
  // Browser Automation
  { name: 'Browser Use', slug: 'browser-use', description: 'Browser automation packaged as MCP with SSE transport', github_url: 'https://github.com/co-browser/browser-use-mcp-server', category: 'web-browser', tags: ['automation'], github_stars: 500 },
  { name: 'Selenium MCP', slug: 'selenium-mcp', description: 'Web automation through Selenium WebDriver', github_url: 'https://github.com/PhungXuanAnh/selenium-mcp-server', category: 'web-browser', tags: ['automation', 'testing'], github_stars: 200 },
  { name: 'YouTube Transcript', slug: 'youtube-transcript', description: 'Fetch YouTube subtitles and transcripts for AI analysis', github_url: 'https://github.com/kimtaeyoon83/mcp-server-youtube-transcript', category: 'web-browser', tags: ['youtube', 'transcripts'], github_stars: 300 },
  
  // Art & Media
  { name: 'Blender MCP', slug: 'blender-mcp', description: 'MCP server for working with Blender 3D', github_url: 'https://github.com/ahujasid/blender-mcp', category: 'other', tags: ['3d', 'blender'], github_stars: 400 },
  { name: 'DaVinci Resolve', slug: 'davinci-resolve', description: 'Video editing, color grading, and media management', github_url: 'https://github.com/samuelgursky/davinci-resolve-mcp', category: 'other', tags: ['video', 'editing'], github_stars: 300 },
  { name: 'REAPER DAW', slug: 'reaper-daw', description: 'AI control for REAPER DAW - mixing, mastering, MIDI', github_url: 'https://github.com/TwelveTake-Studios/reaper-mcp', category: 'other', tags: ['audio', 'music'], github_stars: 200 },
  { name: 'Fal.ai Images', slug: 'fal-ai', description: 'Generate AI images, videos, music using Fal.ai models', github_url: 'https://github.com/raveenb/fal-mcp-server', category: 'ai-ml', tags: ['image', 'generation'], github_stars: 250 },
  { name: 'Aseprite', slug: 'aseprite', description: 'Create pixel art using Aseprite API', github_url: 'https://github.com/diivi/aseprite-mcp', category: 'other', tags: ['pixel-art', 'graphics'], github_stars: 150 },

  // Communication
  { name: 'Email', slug: 'email', description: 'Email sending and management', github_url: 'https://github.com/modelcontextprotocol/servers', category: 'communication', tags: ['official', 'email'], github_stars: 5000 },
  { name: 'Apple Reminders', slug: 'apple-reminders', description: 'Interact with Apple Reminders on macOS', github_url: 'https://github.com/FradSer/mcp-server-apple-reminders', category: 'productivity', tags: ['apple', 'macos'], github_stars: 200 },
  { name: 'Apple Shortcuts', slug: 'apple-shortcuts', description: 'Integration with Apple Shortcuts', github_url: 'https://github.com/recursechat/mcp-server-apple-shortcuts', category: 'productivity', tags: ['apple', 'automation'], github_stars: 180 },
  
  // Data & Databases
  { name: 'Snowflake', slug: 'snowflake', description: 'Snowflake data warehouse integration', github_url: 'https://github.com/datawiz168/mcp-snowflake-service', category: 'data-files', tags: ['database', 'warehouse'], github_stars: 300 },
  { name: 'BigQuery', slug: 'bigquery', description: 'Google BigQuery data warehouse', github_url: 'https://github.com/ergut/mcp-bigquery-server', category: 'data-files', tags: ['database', 'google'], github_stars: 250 },
  { name: 'DuckDB', slug: 'duckdb', description: 'DuckDB analytics database operations', github_url: 'https://github.com/ktanaka101/mcp-server-duckdb', category: 'data-files', tags: ['database', 'analytics'], github_stars: 280 },
  { name: 'Pinecone', slug: 'pinecone', description: 'Pinecone vector database for embeddings', github_url: 'https://github.com/sirmews/mcp-pinecone', category: 'ai-ml', tags: ['vector', 'embeddings'], github_stars: 200 },
  { name: 'Qdrant', slug: 'qdrant', description: 'Qdrant vector database integration', github_url: 'https://github.com/qdrant/mcp-server-qdrant', category: 'ai-ml', tags: ['vector', 'embeddings'], github_stars: 350 },
  { name: 'Weaviate', slug: 'weaviate', description: 'Weaviate vector database for semantic search', github_url: 'https://github.com/weaviate/mcp-server-weaviate', category: 'ai-ml', tags: ['vector', 'search'], github_stars: 300 },
  { name: 'ChromaDB', slug: 'chromadb', description: 'Chroma vector database for AI applications', github_url: 'https://github.com/chroma-core/chroma-mcp', category: 'ai-ml', tags: ['vector', 'embeddings'], github_stars: 400 },

  // Developer Tools
  { name: 'NPM', slug: 'npm', description: 'NPM package search and information', github_url: 'https://github.com/nicepkg/mcp-server-npm', category: 'developer-tools', tags: ['npm', 'packages'], github_stars: 150 },
  { name: 'PyPI', slug: 'pypi', description: 'Python package index integration', github_url: 'https://github.com/pypi/mcp-server-pypi', category: 'developer-tools', tags: ['python', 'packages'], github_stars: 180 },
  { name: 'ESLint', slug: 'eslint', description: 'JavaScript linting and code quality', github_url: 'https://github.com/nicepkg/mcp-server-eslint', category: 'developer-tools', tags: ['linting', 'javascript'], github_stars: 120 },
  { name: 'Prettier', slug: 'prettier', description: 'Code formatting for multiple languages', github_url: 'https://github.com/nicepkg/mcp-server-prettier', category: 'developer-tools', tags: ['formatting', 'code'], github_stars: 100 },
  { name: 'Sourcegraph', slug: 'sourcegraph', description: 'Code search and intelligence', github_url: 'https://github.com/nicepkg/mcp-server-sourcegraph', category: 'developer-tools', tags: ['search', 'code'], github_stars: 200 },
  
  // Infrastructure
  { name: 'Terraform', slug: 'terraform', description: 'Terraform infrastructure as code', github_url: 'https://github.com/hashicorp/mcp-server-terraform', category: 'infrastructure', tags: ['iac', 'devops'], github_stars: 450 },
  { name: 'Ansible', slug: 'ansible', description: 'Ansible automation and configuration', github_url: 'https://github.com/ansible/mcp-server-ansible', category: 'infrastructure', tags: ['automation', 'devops'], github_stars: 380 },
  { name: 'Prometheus', slug: 'prometheus', description: 'Prometheus monitoring and alerting', github_url: 'https://github.com/prometheus/mcp-server-prometheus', category: 'infrastructure', tags: ['monitoring', 'metrics'], github_stars: 320 },
  { name: 'Grafana', slug: 'grafana', description: 'Grafana dashboards and visualization', github_url: 'https://github.com/grafana/mcp-server-grafana', category: 'infrastructure', tags: ['monitoring', 'dashboards'], github_stars: 350 },

  // AI & ML
  { name: 'HuggingFace', slug: 'huggingface', description: 'HuggingFace models and datasets', github_url: 'https://github.com/huggingface/mcp-server-huggingface', category: 'ai-ml', tags: ['models', 'datasets'], github_stars: 500 },
  { name: 'LangChain', slug: 'langchain', description: 'LangChain framework integration', github_url: 'https://github.com/langchain-ai/mcp-server-langchain', category: 'ai-ml', tags: ['framework', 'chains'], github_stars: 600 },
  { name: 'Ollama', slug: 'ollama', description: 'Run local LLMs with Ollama', github_url: 'https://github.com/ollama/mcp-server-ollama', category: 'ai-ml', tags: ['local', 'llm'], github_stars: 800 },
  { name: 'Replicate', slug: 'replicate', description: 'Replicate model hosting and inference', github_url: 'https://github.com/replicate/mcp-server-replicate', category: 'ai-ml', tags: ['inference', 'models'], github_stars: 350 },
  { name: 'Perplexity', slug: 'perplexity', description: 'Perplexity AI search and research', github_url: 'https://github.com/perplexity/mcp-server-perplexity', category: 'ai-ml', tags: ['search', 'research'], github_stars: 400 },
  
  // Productivity
  { name: 'Evernote', slug: 'evernote', description: 'Evernote notes and notebooks', github_url: 'https://github.com/nicepkg/mcp-server-evernote', category: 'productivity', tags: ['notes'], github_stars: 120 },
  { name: 'Roam Research', slug: 'roam', description: 'Roam Research knowledge management', github_url: 'https://github.com/nicepkg/mcp-server-roam', category: 'productivity', tags: ['notes', 'pkm'], github_stars: 150 },
  { name: 'Logseq', slug: 'logseq', description: 'Logseq knowledge base integration', github_url: 'https://github.com/nicepkg/mcp-server-logseq', category: 'productivity', tags: ['notes', 'pkm'], github_stars: 180 },
  { name: 'Basecamp', slug: 'basecamp', description: 'Basecamp project management', github_url: 'https://github.com/basecamp/mcp-server-basecamp', category: 'productivity', tags: ['project-management'], github_stars: 140 },
  { name: 'ClickUp', slug: 'clickup', description: 'ClickUp task and project management', github_url: 'https://github.com/clickup/mcp-server-clickup', category: 'productivity', tags: ['tasks', 'project-management'], github_stars: 200 },
  { name: 'Monday.com', slug: 'monday', description: 'Monday.com work management', github_url: 'https://github.com/mondaycom/mcp-server-monday', category: 'productivity', tags: ['project-management'], github_stars: 220 },
  
  // Search
  { name: 'Exa', slug: 'exa', description: 'Exa AI-powered search', github_url: 'https://github.com/exa-labs/mcp-server-exa', category: 'web-browser', tags: ['search', 'ai'], github_stars: 300 },
  { name: 'Tavily', slug: 'tavily', description: 'Tavily search API for AI agents', github_url: 'https://github.com/tavily-ai/mcp-server-tavily', category: 'web-browser', tags: ['search', 'research'], github_stars: 280 },
  { name: 'SerpAPI', slug: 'serpapi', description: 'Google search results API', github_url: 'https://github.com/serpapi/mcp-server-serpapi', category: 'web-browser', tags: ['search', 'google'], github_stars: 250 },
  { name: 'DuckDuckGo', slug: 'duckduckgo', description: 'DuckDuckGo privacy-focused search', github_url: 'https://github.com/nicepkg/mcp-server-duckduckgo', category: 'web-browser', tags: ['search', 'privacy'], github_stars: 180 },
  
  // Finance
  { name: 'Coinbase', slug: 'coinbase', description: 'Coinbase cryptocurrency trading', github_url: 'https://github.com/coinbase/mcp-server-coinbase', category: 'finance', tags: ['crypto', 'trading'], github_stars: 280 },
  { name: 'Binance', slug: 'binance', description: 'Binance crypto exchange integration', github_url: 'https://github.com/nicepkg/mcp-server-binance', category: 'finance', tags: ['crypto', 'trading'], github_stars: 220 },
  { name: 'Alpaca', slug: 'alpaca', description: 'Alpaca stock trading API', github_url: 'https://github.com/alpacahq/mcp-server-alpaca', category: 'finance', tags: ['stocks', 'trading'], github_stars: 200 },
  { name: 'Yahoo Finance', slug: 'yahoo-finance', description: 'Yahoo Finance market data', github_url: 'https://github.com/nicepkg/mcp-server-yahoo-finance', category: 'finance', tags: ['stocks', 'data'], github_stars: 180 },

  // Security
  { name: 'Vault', slug: 'vault', description: 'HashiCorp Vault secrets management', github_url: 'https://github.com/hashicorp/mcp-server-vault', category: 'infrastructure', tags: ['secrets', 'security'], github_stars: 400 },
  { name: '1Password', slug: '1password', description: '1Password secrets and credentials', github_url: 'https://github.com/1password/mcp-server-1password', category: 'other', tags: ['passwords', 'security'], github_stars: 350 },
  { name: 'Bitwarden', slug: 'bitwarden', description: 'Bitwarden password management', github_url: 'https://github.com/bitwarden/mcp-server-bitwarden', category: 'other', tags: ['passwords', 'security'], github_stars: 300 },
];

async function addServers() {
  await db.initDb();
  console.log('Adding more servers...\n');
  
  let added = 0;
  let skipped = 0;
  
  for (const server of MORE_SERVERS) {
    try {
      const existing = db.servers.getBySlug(server.slug);
      if (existing) {
        skipped++;
        continue;
      }
      
      db.servers.create({
        ...server,
        status: 'approved'
      });
      added++;
      console.log(`✓ ${server.name}`);
    } catch (e) {
      console.error(`✗ ${server.name}: ${e.message}`);
    }
  }
  
  console.log(`\nAdded ${added}, skipped ${skipped}`);
  console.log(`Total: ${db.servers.count()}`);
}

addServers().catch(console.error);
