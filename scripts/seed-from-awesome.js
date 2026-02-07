#!/usr/bin/env node
/**
 * Seed AutropicAI database from awesome-mcp-servers
 * Combined with expanded server list for 200+ servers
 * 
 * Run: npm run seed
 */

let db = require('../lib/database');
let expandedServers = [];
try {
  expandedServers = require('./expand-servers').EXPANDED_SERVERS || [];
} catch (e) {
  // expand-servers.js not available, continue with base list
}

// Curated list from awesome-mcp-servers + manual additions
// Categories: data-files, developer-tools, communication, productivity, web-browser, ai-ml, finance, infrastructure, other

const SEED_SERVERS = [
  // Official Anthropic servers
  { name: 'Filesystem', slug: 'filesystem', description: 'Read, write, and manage files on the local filesystem', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem', category: 'data-files', tags: ['official', 'files'], install_command: 'npx @modelcontextprotocol/server-filesystem', github_stars: 5000 },
  { name: 'GitHub', slug: 'github', description: 'Repository management, file operations, and GitHub API integration', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github', category: 'developer-tools', tags: ['official', 'git'], install_command: 'npx @modelcontextprotocol/server-github', github_stars: 5000 },
  { name: 'GitLab', slug: 'gitlab', description: 'GitLab API integration for projects, issues, and merge requests', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gitlab', category: 'developer-tools', tags: ['official', 'git'], install_command: 'npx @modelcontextprotocol/server-gitlab', github_stars: 5000 },
  { name: 'Google Drive', slug: 'google-drive', description: 'File access and search in Google Drive', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive', category: 'data-files', tags: ['official', 'cloud'], install_command: 'npx @modelcontextprotocol/server-gdrive', github_stars: 5000 },
  { name: 'PostgreSQL', slug: 'postgres', description: 'Read-only database access with schema inspection', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres', category: 'data-files', tags: ['official', 'database'], install_command: 'npx @modelcontextprotocol/server-postgres', github_stars: 5000 },
  { name: 'Slack', slug: 'slack', description: 'Channel management and messaging for Slack workspaces', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack', category: 'communication', tags: ['official', 'chat'], install_command: 'npx @modelcontextprotocol/server-slack', github_stars: 5000 },
  { name: 'Memory', slug: 'memory', description: 'Knowledge graph-based persistent memory system', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory', category: 'ai-ml', tags: ['official', 'memory'], install_command: 'npx @modelcontextprotocol/server-memory', github_stars: 5000 },
  { name: 'Puppeteer', slug: 'puppeteer', description: 'Browser automation and web scraping', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer', category: 'web-browser', tags: ['official', 'automation'], install_command: 'npx @modelcontextprotocol/server-puppeteer', github_stars: 5000 },
  { name: 'Brave Search', slug: 'brave-search', description: 'Web search using Brave Search API', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search', category: 'web-browser', tags: ['official', 'search'], install_command: 'npx @modelcontextprotocol/server-brave-search', github_stars: 5000 },
  { name: 'Google Maps', slug: 'google-maps', description: 'Location services, directions, and place details', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps', category: 'web-browser', tags: ['official', 'maps'], install_command: 'npx @modelcontextprotocol/server-google-maps', github_stars: 5000 },
  { name: 'Fetch', slug: 'fetch', description: 'Web content fetching and conversion for efficient LLM usage', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch', category: 'web-browser', tags: ['official', 'http'], install_command: 'npx @modelcontextprotocol/server-fetch', github_stars: 5000 },
  
  // Popular community servers
  { name: 'SQLite', slug: 'sqlite', description: 'SQLite database operations and queries', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite', category: 'data-files', tags: ['official', 'database'], install_command: 'npx @modelcontextprotocol/server-sqlite', github_stars: 5000 },
  { name: 'Sentry', slug: 'sentry', description: 'Error tracking and issue management with Sentry', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sentry', category: 'developer-tools', tags: ['official', 'monitoring'], install_command: 'npx @modelcontextprotocol/server-sentry', github_stars: 5000 },
  { name: 'Raygun', slug: 'raygun', description: 'Crash reporting and real-time error tracking', github_url: 'https://github.com/MindscapeHQ/mcp-server-raygun', category: 'developer-tools', tags: ['monitoring', 'errors'], install_command: 'npx mcp-server-raygun', github_stars: 150 },
  { name: 'Linear', slug: 'linear', description: 'Project management and issue tracking with Linear', github_url: 'https://github.com/jerhadf/linear-mcp-server', category: 'productivity', tags: ['project-management'], install_command: 'npx linear-mcp-server', github_stars: 200 },
  { name: 'Notion', slug: 'notion', description: 'Notion workspace integration for pages and databases', github_url: 'https://github.com/v-3/notion-server', category: 'productivity', tags: ['notes', 'workspace'], install_command: 'npx notion-mcp-server', github_stars: 300 },
  { name: 'Todoist', slug: 'todoist', description: 'Task management with Todoist', github_url: 'https://github.com/abhiz123/todoist-mcp-server', category: 'productivity', tags: ['tasks', 'todo'], install_command: 'npx todoist-mcp-server', github_stars: 100 },
  { name: 'Discord', slug: 'discord', description: 'Discord bot integration for servers and channels', github_url: 'https://github.com/v-3/discord-server', category: 'communication', tags: ['chat', 'community'], install_command: 'npx discord-mcp-server', github_stars: 180 },
  { name: 'Telegram', slug: 'telegram', description: 'Telegram messaging and bot API', github_url: 'https://github.com/nicepkg/mcp-server-telegram', category: 'communication', tags: ['chat', 'messaging'], install_command: 'npx mcp-server-telegram', github_stars: 120 },
  { name: 'Twitter', slug: 'twitter', description: 'Twitter/X API for posting and reading tweets', github_url: 'https://github.com/EnesCinr/twitter-mcp', category: 'communication', tags: ['social', 'twitter'], install_command: 'npx twitter-mcp', github_stars: 250 },
  { name: 'Playwright', slug: 'playwright', description: 'Browser automation with Playwright', github_url: 'https://github.com/executeautomation/mcp-playwright', category: 'web-browser', tags: ['automation', 'testing'], install_command: 'npx mcp-playwright', github_stars: 400 },
  { name: 'Browserbase', slug: 'browserbase', description: 'Cloud browser automation platform', github_url: 'https://github.com/nicepkg/mcp-server-browserbase', category: 'web-browser', tags: ['cloud', 'automation'], install_command: 'npx mcp-server-browserbase', github_stars: 90 },
  { name: 'Firecrawl', slug: 'firecrawl', description: 'Web scraping and crawling with Firecrawl', github_url: 'https://github.com/mendableai/firecrawl-mcp-server', category: 'web-browser', tags: ['scraping', 'crawling'], install_command: 'npx firecrawl-mcp-server', github_stars: 350 },
  { name: 'AWS KB Retrieval', slug: 'aws-kb', description: 'Amazon Bedrock knowledge base retrieval', github_url: 'https://github.com/aws/aws-mcp-server', category: 'ai-ml', tags: ['aws', 'rag'], install_command: 'npx aws-mcp-server', github_stars: 280 },
  { name: 'OpenAI', slug: 'openai', description: 'OpenAI API integration for GPT models', github_url: 'https://github.com/mzxrai/mcp-openai', category: 'ai-ml', tags: ['llm', 'gpt'], install_command: 'npx mcp-openai', github_stars: 220 },
  { name: 'Anthropic', slug: 'anthropic', description: 'Anthropic Claude API integration', github_url: 'https://github.com/anthropics/anthropic-mcp', category: 'ai-ml', tags: ['llm', 'claude'], install_command: 'npx anthropic-mcp', github_stars: 180 },
  { name: 'Docker', slug: 'docker', description: 'Docker container management and operations', github_url: 'https://github.com/ckreiling/mcp-server-docker', category: 'infrastructure', tags: ['containers', 'devops'], install_command: 'npx mcp-server-docker', github_stars: 320 },
  { name: 'Kubernetes', slug: 'kubernetes', description: 'Kubernetes cluster management', github_url: 'https://github.com/strowk/mcp-k8s-go', category: 'infrastructure', tags: ['k8s', 'devops'], install_command: 'go install github.com/strowk/mcp-k8s-go', github_stars: 280 },
  { name: 'Cloudflare', slug: 'cloudflare', description: 'Cloudflare Workers and KV management', github_url: 'https://github.com/cloudflare/mcp-server-cloudflare', category: 'infrastructure', tags: ['cloud', 'serverless'], install_command: 'npx mcp-server-cloudflare', github_stars: 400 },
  { name: 'Stripe', slug: 'stripe', description: 'Stripe payment processing API', github_url: 'https://github.com/stripe/mcp-server-stripe', category: 'finance', tags: ['payments'], install_command: 'npx mcp-server-stripe', github_stars: 350 },
  { name: 'Plaid', slug: 'plaid', description: 'Banking data via Plaid API', github_url: 'https://github.com/plaid/mcp-server-plaid', category: 'finance', tags: ['banking', 'fintech'], install_command: 'npx mcp-server-plaid', github_stars: 120 },
  { name: 'Time', slug: 'time', description: 'Current time and timezone operations', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time', category: 'other', tags: ['official', 'utility'], install_command: 'npx @modelcontextprotocol/server-time', github_stars: 5000 },
  { name: 'Sequential Thinking', slug: 'sequential-thinking', description: 'Structured problem-solving through thought sequences', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking', category: 'ai-ml', tags: ['official', 'reasoning'], install_command: 'npx @modelcontextprotocol/server-sequentialthinking', github_stars: 5000 },
  { name: 'Everything', slug: 'everything', description: 'Fast file search on Windows using Everything SDK', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everything', category: 'data-files', tags: ['official', 'search', 'windows'], install_command: 'npx @modelcontextprotocol/server-everything', github_stars: 5000 },
  { name: 'EverArt', slug: 'everart', description: 'AI image generation using EverArt API', github_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/everart', category: 'ai-ml', tags: ['official', 'image'], install_command: 'npx @modelcontextprotocol/server-everart', github_stars: 5000 },
  
  // More community servers
  { name: 'E2B', slug: 'e2b', description: 'Secure code execution in cloud sandboxes', github_url: 'https://github.com/e2b-dev/mcp-server', category: 'developer-tools', tags: ['sandbox', 'code'], install_command: 'npx e2b-mcp-server', github_stars: 280 },
  { name: 'Obsidian', slug: 'obsidian', description: 'Obsidian vault integration for notes and knowledge', github_url: 'https://github.com/MarkusPfworring/obsidian-mcp', category: 'productivity', tags: ['notes', 'pkm'], install_command: 'npx obsidian-mcp', github_stars: 380 },
  { name: 'Apple Notes', slug: 'apple-notes', description: 'Apple Notes access on macOS', github_url: 'https://github.com/suekou/mcp-apple-notes', category: 'productivity', tags: ['notes', 'macos'], install_command: 'npx mcp-apple-notes', github_stars: 90 },
  { name: 'Google Calendar', slug: 'google-calendar', description: 'Google Calendar event management', github_url: 'https://github.com/v-3/gcal-server', category: 'productivity', tags: ['calendar', 'google'], install_command: 'npx gcal-mcp-server', github_stars: 150 },
  { name: 'Airtable', slug: 'airtable', description: 'Airtable bases and records management', github_url: 'https://github.com/v-3/airtable-server', category: 'data-files', tags: ['database', 'spreadsheet'], install_command: 'npx airtable-mcp-server', github_stars: 130 },
  { name: 'Supabase', slug: 'supabase', description: 'Supabase database and auth integration', github_url: 'https://github.com/supabase/mcp-server-supabase', category: 'data-files', tags: ['database', 'auth'], install_command: 'npx mcp-server-supabase', github_stars: 420 },
  { name: 'MongoDB', slug: 'mongodb', description: 'MongoDB database operations', github_url: 'https://github.com/mongodb/mcp-server-mongodb', category: 'data-files', tags: ['database', 'nosql'], install_command: 'npx mcp-server-mongodb', github_stars: 310 },
  { name: 'Redis', slug: 'redis', description: 'Redis cache and data structure operations', github_url: 'https://github.com/nicepkg/mcp-server-redis', category: 'data-files', tags: ['cache', 'database'], install_command: 'npx mcp-server-redis', github_stars: 180 },
  { name: 'Elasticsearch', slug: 'elasticsearch', description: 'Elasticsearch search and analytics', github_url: 'https://github.com/elastic/mcp-server-elasticsearch', category: 'data-files', tags: ['search', 'analytics'], install_command: 'npx mcp-server-elasticsearch', github_stars: 220 },
  { name: 'Neo4j', slug: 'neo4j', description: 'Neo4j graph database queries', github_url: 'https://github.com/neo4j/mcp-neo4j', category: 'data-files', tags: ['graph', 'database'], install_command: 'npx mcp-neo4j', github_stars: 170 },
  { name: 'Jira', slug: 'jira', description: 'Atlassian Jira issue tracking', github_url: 'https://github.com/atlassian/mcp-server-jira', category: 'productivity', tags: ['project-management', 'atlassian'], install_command: 'npx mcp-server-jira', github_stars: 290 },
  { name: 'Confluence', slug: 'confluence', description: 'Atlassian Confluence wiki pages', github_url: 'https://github.com/atlassian/mcp-server-confluence', category: 'productivity', tags: ['wiki', 'atlassian'], install_command: 'npx mcp-server-confluence', github_stars: 180 },
  { name: 'Trello', slug: 'trello', description: 'Trello boards and cards management', github_url: 'https://github.com/v-3/trello-server', category: 'productivity', tags: ['kanban', 'project-management'], install_command: 'npx trello-mcp-server', github_stars: 140 },
  { name: 'Asana', slug: 'asana', description: 'Asana task and project management', github_url: 'https://github.com/asana/mcp-server-asana', category: 'productivity', tags: ['project-management'], install_command: 'npx mcp-server-asana', github_stars: 160 },
  { name: 'Vercel', slug: 'vercel', description: 'Vercel deployments and project management', github_url: 'https://github.com/vercel/mcp-server-vercel', category: 'infrastructure', tags: ['deployment', 'serverless'], install_command: 'npx mcp-server-vercel', github_stars: 380 },
  { name: 'Netlify', slug: 'netlify', description: 'Netlify site deployments and functions', github_url: 'https://github.com/netlify/mcp-server-netlify', category: 'infrastructure', tags: ['deployment', 'jamstack'], install_command: 'npx mcp-server-netlify', github_stars: 240 },
  { name: 'Heroku', slug: 'heroku', description: 'Heroku app management and deployments', github_url: 'https://github.com/heroku/mcp-server-heroku', category: 'infrastructure', tags: ['deployment', 'paas'], install_command: 'npx mcp-server-heroku', github_stars: 190 },
  { name: 'AWS', slug: 'aws', description: 'AWS services integration', github_url: 'https://github.com/aws/mcp-server-aws', category: 'infrastructure', tags: ['cloud', 'aws'], install_command: 'npx mcp-server-aws', github_stars: 520 },
  { name: 'GCP', slug: 'gcp', description: 'Google Cloud Platform integration', github_url: 'https://github.com/google/mcp-server-gcp', category: 'infrastructure', tags: ['cloud', 'google'], install_command: 'npx mcp-server-gcp', github_stars: 380 },
  { name: 'Azure', slug: 'azure', description: 'Microsoft Azure services integration', github_url: 'https://github.com/microsoft/mcp-server-azure', category: 'infrastructure', tags: ['cloud', 'microsoft'], install_command: 'npx mcp-server-azure', github_stars: 420 },
  
  // AutropicAI (our own!)
  { name: 'AutropicAI', slug: 'autropicai', description: 'Find the cheapest LLM for any task - cost optimization for AI agents', github_url: 'https://github.com/tlkc888-Jenkins/autropicai-mcp', category: 'ai-ml', tags: ['cost', 'optimization', 'llm'], install_command: 'npx github:tlkc888-Jenkins/autropicai-mcp', github_stars: 50, verified: 1, featured: 1 },

  // === MORE SERVERS FROM AWESOME-MCP-SERVERS ===
  
  // Browser & Search
  { name: 'YouTube Transcript', slug: 'youtube-transcript', description: 'Fetch YouTube subtitles and transcripts for AI analysis', github_url: 'https://github.com/kimtaeyoon83/mcp-server-youtube-transcript', category: 'web-browser', tags: ['youtube', 'transcripts'], install_command: 'npx mcp-server-youtube-transcript', github_stars: 300 },
  { name: 'Exa Search', slug: 'exa', description: 'Exa AI-powered neural search engine', github_url: 'https://github.com/exa-labs/exa-mcp-server', category: 'web-browser', tags: ['search', 'ai'], install_command: 'npx exa-mcp-server', github_stars: 400 },
  { name: 'Tavily', slug: 'tavily', description: 'Tavily search API optimized for AI agents', github_url: 'https://github.com/tavily-ai/tavily-mcp', category: 'web-browser', tags: ['search', 'research'], install_command: 'npx tavily-mcp', github_stars: 350 },
  { name: 'Web Search', slug: 'web-search', description: 'Free web searching using Google results, no API keys', github_url: 'https://github.com/pskill9/web-search', category: 'web-browser', tags: ['search', 'free'], install_command: 'npx @pskill9/web-search', github_stars: 200 },
  
  // Art & Media
  { name: 'Blender', slug: 'blender', description: 'Control Blender 3D modeling and animation', github_url: 'https://github.com/ahujasid/blender-mcp', category: 'other', tags: ['3d', 'modeling'], install_command: 'npx blender-mcp', github_stars: 500 },
  { name: 'DaVinci Resolve', slug: 'davinci-resolve', description: 'Video editing and color grading automation', github_url: 'https://github.com/samuelgursky/davinci-resolve-mcp', category: 'other', tags: ['video', 'editing'], install_command: 'python davinci-resolve-mcp', github_stars: 300 },
  { name: 'Manim', slug: 'manim', description: 'Generate mathematical animations with Manim', github_url: 'https://github.com/abhiemj/manim-mcp-server', category: 'other', tags: ['animation', 'math'], install_command: 'python manim-mcp-server', github_stars: 200 },
  { name: 'Fal.ai', slug: 'fal-ai', description: 'AI image generation using FLUX and Stable Diffusion', github_url: 'https://github.com/raveenb/fal-mcp-server', category: 'ai-ml', tags: ['image', 'generation'], install_command: 'python fal-mcp-server', github_stars: 250 },
  
  // Vector Databases
  { name: 'Pinecone', slug: 'pinecone', description: 'Pinecone vector database for embeddings and RAG', github_url: 'https://github.com/sirmews/mcp-pinecone', category: 'ai-ml', tags: ['vector', 'embeddings'], install_command: 'npx mcp-pinecone', github_stars: 300 },
  { name: 'Qdrant', slug: 'qdrant', description: 'Qdrant vector search engine', github_url: 'https://github.com/qdrant/mcp-server-qdrant', category: 'ai-ml', tags: ['vector', 'search'], install_command: 'npx @qdrant/mcp-server-qdrant', github_stars: 400 },
  { name: 'ChromaDB', slug: 'chromadb', description: 'Chroma embedding database for AI apps', github_url: 'https://github.com/chroma-core/chroma-mcp', category: 'ai-ml', tags: ['vector', 'embeddings'], install_command: 'npx chroma-mcp', github_stars: 350 },
  
  // More Databases
  { name: 'DuckDB', slug: 'duckdb', description: 'DuckDB analytical SQL database', github_url: 'https://github.com/ktanaka101/mcp-server-duckdb', category: 'data-files', tags: ['database', 'analytics'], install_command: 'npx mcp-server-duckdb', github_stars: 280 },
  { name: 'MySQL', slug: 'mysql', description: 'MySQL database operations and queries', github_url: 'https://github.com/nicepkg/mcp-server-mysql', category: 'data-files', tags: ['database', 'sql'], install_command: 'npx mcp-server-mysql', github_stars: 250 },
  { name: 'Snowflake', slug: 'snowflake', description: 'Snowflake data warehouse integration', github_url: 'https://github.com/datawiz168/mcp-snowflake-service', category: 'data-files', tags: ['database', 'warehouse'], install_command: 'npx mcp-snowflake-service', github_stars: 200 },
  { name: 'BigQuery', slug: 'bigquery', description: 'Google BigQuery data warehouse', github_url: 'https://github.com/ergut/mcp-bigquery-server', category: 'data-files', tags: ['database', 'google'], install_command: 'npx mcp-bigquery-server', github_stars: 220 },
  
  // AI & LLM
  { name: 'Ollama', slug: 'ollama', description: 'Run local LLMs with Ollama', github_url: 'https://github.com/ollama/ollama-mcp', category: 'ai-ml', tags: ['local', 'llm'], install_command: 'npx ollama-mcp', github_stars: 800 },
  { name: 'Replicate', slug: 'replicate', description: 'Run ML models in the cloud via Replicate', github_url: 'https://github.com/replicate/replicate-mcp', category: 'ai-ml', tags: ['inference', 'models'], install_command: 'npx replicate-mcp', github_stars: 350 },
  { name: 'HuggingFace', slug: 'huggingface', description: 'Access HuggingFace models and datasets', github_url: 'https://github.com/huggingface/huggingface-mcp', category: 'ai-ml', tags: ['models', 'datasets'], install_command: 'npx huggingface-mcp', github_stars: 450 },
  
  // Infrastructure & DevOps
  { name: 'Terraform', slug: 'terraform', description: 'Terraform infrastructure as code', github_url: 'https://github.com/hashicorp/terraform-mcp', category: 'infrastructure', tags: ['iac', 'devops'], install_command: 'npx terraform-mcp', github_stars: 400 },
  { name: 'GitHub Actions', slug: 'github-actions', description: 'Manage GitHub Actions workflows', github_url: 'https://github.com/nicepkg/mcp-server-github-actions', category: 'developer-tools', tags: ['ci-cd', 'automation'], install_command: 'npx mcp-server-github-actions', github_stars: 250 },
  { name: 'CircleCI', slug: 'circleci', description: 'CircleCI pipeline management', github_url: 'https://github.com/circleci/circleci-mcp', category: 'developer-tools', tags: ['ci-cd'], install_command: 'npx circleci-mcp', github_stars: 180 },
  
  // Productivity
  { name: 'Google Calendar', slug: 'gcal', description: 'Google Calendar event management', github_url: 'https://github.com/nicepkg/mcp-server-gcal', category: 'productivity', tags: ['calendar', 'google'], install_command: 'npx mcp-server-gcal', github_stars: 200 },
  { name: 'Apple Notes', slug: 'apple-notes-mcp', description: 'Access Apple Notes on macOS', github_url: 'https://github.com/suekou/mcp-apple-notes', category: 'productivity', tags: ['notes', 'macos'], install_command: 'npx mcp-apple-notes', github_stars: 150 },
  { name: 'Logseq', slug: 'logseq', description: 'Logseq knowledge management', github_url: 'https://github.com/nicepkg/mcp-server-logseq', category: 'productivity', tags: ['notes', 'pkm'], install_command: 'npx mcp-server-logseq', github_stars: 180 },
  { name: 'ClickUp', slug: 'clickup', description: 'ClickUp task and project management', github_url: 'https://github.com/nicepkg/mcp-server-clickup', category: 'productivity', tags: ['tasks', 'project-management'], install_command: 'npx mcp-server-clickup', github_stars: 170 },
  
  // Finance & Crypto
  { name: 'Coinbase', slug: 'coinbase', description: 'Coinbase cryptocurrency trading and data', github_url: 'https://github.com/coinbase/coinbase-mcp', category: 'finance', tags: ['crypto', 'trading'], install_command: 'npx coinbase-mcp', github_stars: 300 },
  { name: 'Yahoo Finance', slug: 'yahoo-finance', description: 'Stock quotes and market data', github_url: 'https://github.com/nicepkg/mcp-server-yahoo-finance', category: 'finance', tags: ['stocks', 'data'], install_command: 'npx mcp-server-yahoo-finance', github_stars: 180 },
  
  // Security
  { name: 'Vault', slug: 'vault', description: 'HashiCorp Vault secrets management', github_url: 'https://github.com/hashicorp/vault-mcp', category: 'infrastructure', tags: ['secrets', 'security'], install_command: 'npx vault-mcp', github_stars: 350 },
  { name: '1Password', slug: '1password', description: '1Password credential access', github_url: 'https://github.com/1password/1password-mcp', category: 'other', tags: ['passwords', 'security'], install_command: 'npx 1password-mcp', github_stars: 300 },
  
  // Aggregators & Meta
  { name: 'Pipedream', slug: 'pipedream', description: 'Connect 2,500+ APIs with 8,000+ prebuilt tools', github_url: 'https://github.com/PipedreamHQ/pipedream', category: 'other', tags: ['aggregator', 'apis'], install_command: 'npx pipedream-mcp', github_stars: 8000 },
  { name: 'Anyquery', slug: 'anyquery', description: 'Query 40+ apps with SQL', github_url: 'https://github.com/julien040/anyquery', category: 'data-files', tags: ['sql', 'aggregator'], install_command: 'anyquery', github_stars: 2000 },
  { name: 'MindsDB', slug: 'mindsdb', description: 'Connect AI with databases and data sources', github_url: 'https://github.com/mindsdb/mindsdb', category: 'ai-ml', tags: ['database', 'ml'], install_command: 'pip install mindsdb', github_stars: 20000 },
  
  // Communication extras
  { name: 'WhatsApp', slug: 'whatsapp', description: 'WhatsApp messaging integration', github_url: 'https://github.com/nicepkg/mcp-server-whatsapp', category: 'communication', tags: ['chat', 'messaging'], install_command: 'npx mcp-server-whatsapp', github_stars: 200 },
  { name: 'Matrix', slug: 'matrix', description: 'Matrix chat protocol integration', github_url: 'https://github.com/nicepkg/mcp-server-matrix', category: 'communication', tags: ['chat', 'decentralized'], install_command: 'npx mcp-server-matrix', github_stars: 150 },
  
  // Home & IoT
  { name: 'Home Assistant', slug: 'homeassistant', description: 'Home Assistant smart home control', github_url: 'https://github.com/nicepkg/mcp-server-homeassistant', category: 'other', tags: ['iot', 'smart-home'], install_command: 'npx mcp-server-homeassistant', github_stars: 300 },
  { name: 'MQTT', slug: 'mqtt', description: 'MQTT IoT messaging protocol', github_url: 'https://github.com/nicepkg/mcp-server-mqtt', category: 'other', tags: ['iot', 'messaging'], install_command: 'npx mcp-server-mqtt', github_stars: 150 },
];

async function seedServers(externalDb = null) {
  // Use passed db or module-level db
  const database = externalDb || db;
  
  let added = 0;
  let skipped = 0;
  
  // Combine base servers with expanded list
  const allServers = [...SEED_SERVERS, ...expandedServers];
  
  for (const server of allServers) {
    try {
      // Check if already exists
      const existing = database.servers.getBySlug(server.slug);
      if (existing) {
        skipped++;
        continue;
      }
      
      database.servers.create({
        ...server,
        status: 'approved'
      });
      added++;
    } catch (e) {
      console.error(`✗ Failed: ${server.name} - ${e.message}`);
    }
  }
  
  return { added, skipped, total: allServers.length };
}

// Export for use in server.js
module.exports = { seedServers, SEED_SERVERS };

// Run directly if called as script
if (require.main === module) {
  (async () => {
    await db.initDb();
    console.log('Database initialized\n');
    const { added, skipped } = await seedServers();
    console.log(`\nDone! Added ${added} servers, skipped ${skipped} existing.`);
    console.log(`Total servers: ${db.servers.count()}`);
  })().catch(console.error);
}
