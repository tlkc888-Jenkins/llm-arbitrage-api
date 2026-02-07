#!/usr/bin/env node
/**
 * Seed MCPHub database from awesome-mcp-servers
 * 
 * Run: npm run seed
 */

const db = require('../lib/database');

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
];

async function seed() {
  await db.initDb();
  console.log('Database initialized\n');
  
  let added = 0;
  let skipped = 0;
  
  for (const server of SEED_SERVERS) {
    try {
      // Check if already exists
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
      console.log(`✓ Added: ${server.name}`);
    } catch (e) {
      console.error(`✗ Failed: ${server.name} - ${e.message}`);
    }
  }
  
  console.log(`\nDone! Added ${added} servers, skipped ${skipped} existing.`);
  console.log(`Total servers: ${db.servers.count()}`);
}

seed().catch(console.error);
