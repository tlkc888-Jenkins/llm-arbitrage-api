#!/usr/bin/env node
/**
 * Expand AutropicAI database with 150+ new servers
 * Sourced from awesome-mcp-servers and other directories
 * 
 * Run: node scripts/expand-servers.js
 */

const db = require('../lib/database');

// New servers to add (deduplicated from existing seed)
const EXPANDED_SERVERS = [
  // === AGGREGATORS ===
  { name: 'MetaMCP', slug: 'metamcp', description: 'Unified middleware MCP server that manages your MCP connections with GUI', github_url: 'https://github.com/metatool-ai/metatool-app', category: 'other', tags: ['aggregator', 'middleware'], github_stars: 500 },
  { name: 'MCPJungle', slug: 'mcpjungle', description: 'Self-hosted MCP Server registry for enterprise AI Agents', github_url: 'https://github.com/duaraghav8/MCPJungle', category: 'other', tags: ['registry', 'enterprise'], github_stars: 300 },
  { name: 'NCP', slug: 'ncp', description: 'Orchestrates your entire MCP ecosystem through intelligent discovery', github_url: 'https://github.com/portel-dev/ncp', category: 'other', tags: ['orchestration', 'discovery'], github_stars: 250 },
  { name: 'MCP Gateway', slug: 'mcp-gateway', description: 'Meta-server with progressive disclosure and dynamic server provisioning', github_url: 'https://github.com/ViperJuice/mcp-gateway', category: 'other', tags: ['gateway', 'proxy'], github_stars: 200 },
  { name: 'Open MCP', slug: 'open-mcp', description: 'Turn a web API into an MCP server in 10 seconds', github_url: 'https://github.com/wegotdocs/open-mcp', category: 'developer-tools', tags: ['api', 'converter'], github_stars: 350 },
  
  // === ART & CREATIVE ===
  { name: 'Blender MCP', slug: 'blender', description: 'Control Blender 3D modeling and animation via MCP', github_url: 'https://github.com/ahujasid/blender-mcp', category: 'other', tags: ['3d', 'modeling', 'blender'], github_stars: 500 },
  { name: 'DaVinci Resolve MCP', slug: 'davinci-resolve', description: 'Video editing, color grading, and media management automation', github_url: 'https://github.com/samuelgursky/davinci-resolve-mcp', category: 'other', tags: ['video', 'editing'], github_stars: 300 },
  { name: 'REAPER DAW', slug: 'reaper-daw', description: 'AI control for REAPER DAW - mixing, mastering, MIDI composition', github_url: 'https://github.com/TwelveTake-Studios/reaper-mcp', category: 'other', tags: ['audio', 'music', 'daw'], github_stars: 200 },
  { name: 'Manim Animation', slug: 'manim', description: 'Generate mathematical animations with Manim', github_url: 'https://github.com/abhiemj/manim-mcp-server', category: 'other', tags: ['animation', 'math'], github_stars: 200 },
  { name: 'Aseprite Pixel Art', slug: 'aseprite', description: 'Create pixel art using Aseprite API', github_url: 'https://github.com/diivi/aseprite-mcp', category: 'other', tags: ['pixel-art', 'graphics'], github_stars: 150 },
  { name: 'Maya MCP', slug: 'maya', description: 'MCP server for Autodesk Maya 3D software', github_url: 'https://github.com/PatrickPalmer/MayaMCP', category: 'other', tags: ['3d', 'animation', 'maya'], github_stars: 180 },
  { name: 'Isaac Sim', slug: 'isaac-sim', description: 'Natural language control of NVIDIA Isaac Sim robotics simulator', github_url: 'https://github.com/omni-mcp/isaac-sim-mcp', category: 'ai-ml', tags: ['robotics', 'simulation', 'nvidia'], github_stars: 250 },
  { name: 'Video Editing', slug: 'video-editing', description: 'Add, analyze, search and generate video edits', github_url: 'https://github.com/burningion/video-editing-mcp', category: 'other', tags: ['video', 'editing'], github_stars: 180 },
  
  // === BROWSER & WEB ===
  { name: 'Browser Use', slug: 'browser-use', description: 'Browser automation packaged as MCP with SSE transport', github_url: 'https://github.com/co-browser/browser-use-mcp-server', category: 'web-browser', tags: ['automation'], github_stars: 500 },
  { name: 'Selenium MCP', slug: 'selenium', description: 'Web automation through Selenium WebDriver', github_url: 'https://github.com/PhungXuanAnh/selenium-mcp-server', category: 'web-browser', tags: ['automation', 'testing'], github_stars: 200 },
  { name: 'Lightpanda', slug: 'lightpanda', description: 'Ultra fast headless browser designed for web automation', github_url: 'https://github.com/lightpanda-io/gomcp', category: 'web-browser', tags: ['headless', 'fast'], github_stars: 400 },
  { name: 'Olostep Scraper', slug: 'olostep', description: 'Web scraping and crawling API with AI-powered answers', github_url: 'https://github.com/olostep/olostep-mcp-server', category: 'web-browser', tags: ['scraping', 'crawling'], github_stars: 300 },
  { name: 'Firefox DevTools', slug: 'firefox-devtools', description: 'Firefox browser automation via WebDriver BiDi', github_url: 'https://github.com/freema/firefox-devtools-mcp', category: 'web-browser', tags: ['firefox', 'devtools'], github_stars: 180 },
  { name: 'Chrome Control', slug: 'chrome-control', description: 'Secure Chrome automation with post-quantum encryption', github_url: 'https://github.com/Pantheon-Security/chrome-mcp-secure', category: 'web-browser', tags: ['chrome', 'security'], github_stars: 220 },
  { name: 'Bilibili', slug: 'bilibili', description: 'Search and fetch Bilibili video content', github_url: 'https://github.com/34892002/bilibili-mcp-js', category: 'web-browser', tags: ['bilibili', 'video'], github_stars: 150 },
  
  // === CLOUD PLATFORMS ===
  { name: 'AWS MCP', slug: 'aws-mcp', description: 'AWS MCP servers for seamless AWS service integration', github_url: 'https://github.com/awslabs/mcp', category: 'infrastructure', tags: ['aws', 'cloud', 'official'], github_stars: 800 },
  { name: 'Kubernetes Go', slug: 'kubernetes-go', description: 'Kubernetes cluster operations via MCP in Go', github_url: 'https://github.com/manusa/kubernetes-mcp-server', category: 'infrastructure', tags: ['kubernetes', 'go'], github_stars: 400 },
  { name: 'Pulumi MCP', slug: 'pulumi', description: 'Infrastructure as Code with Pulumi Automation API', github_url: 'https://github.com/pulumi/mcp-server', category: 'infrastructure', tags: ['iac', 'pulumi', 'official'], github_stars: 450 },
  { name: 'LocalStack', slug: 'localstack', description: 'Manage local AWS environments with LocalStack', github_url: 'https://github.com/localstack/localstack-mcp-server', category: 'infrastructure', tags: ['aws', 'local', 'testing'], github_stars: 500 },
  { name: 'Alibaba Cloud', slug: 'alibaba-cloud', description: 'Alibaba Cloud operations for ECS, monitoring, OOS', github_url: 'https://github.com/aliyun/alibaba-cloud-ops-mcp-server', category: 'infrastructure', tags: ['alibaba', 'cloud'], github_stars: 300 },
  { name: 'Cyclops K8s', slug: 'cyclops', description: 'Kubernetes resource management through Cyclops abstraction', github_url: 'https://github.com/cyclops-ui/mcp-cyclops', category: 'infrastructure', tags: ['kubernetes', 'cyclops'], github_stars: 250 },
  { name: 'ESXi Manager', slug: 'esxi', description: 'VMware ESXi/vCenter management server', github_url: 'https://github.com/bright8192/esxi-mcp-server', category: 'infrastructure', tags: ['vmware', 'esxi'], github_stars: 180 },
  { name: 'OpenStack', slug: 'openstack', description: 'OpenStack cloud infrastructure management', github_url: 'https://github.com/openstack-kr/python-openstackmcp-server', category: 'infrastructure', tags: ['openstack', 'cloud'], github_stars: 200 },
  { name: 'Portainer', slug: 'portainer', description: 'Container management and deployment via Portainer', github_url: 'https://github.com/portainer/portainer-mcp', category: 'infrastructure', tags: ['containers', 'portainer'], github_stars: 350 },
  { name: 'Kestra', slug: 'kestra', description: 'Workflow orchestration platform integration', github_url: 'https://github.com/kestra-io/mcp-server-python', category: 'infrastructure', tags: ['workflow', 'orchestration'], github_stars: 280 },
  { name: 'Azure CLI', slug: 'azure-cli', description: 'Wrapper around Azure CLI for direct Azure access', github_url: 'https://github.com/jdubois/azure-cli-mcp', category: 'infrastructure', tags: ['azure', 'cli'], github_stars: 320 },
  { name: 'Azure Resource Graph', slug: 'azure-resource-graph', description: 'Query and analyze Azure resources at scale', github_url: 'https://github.com/hardik-id/azure-resource-graph-mcp-server', category: 'infrastructure', tags: ['azure', 'analytics'], github_stars: 200 },
  { name: 'Cert Manager', slug: 'cert-manager', description: 'Kubernetes cert-manager management and troubleshooting', github_url: 'https://github.com/pibblokto/cert-manager-mcp-server', category: 'infrastructure', tags: ['kubernetes', 'certificates'], github_stars: 180 },
  
  // === COMMUNICATION ===
  { name: 'Nostr', slug: 'nostr', description: 'Interact with Nostr decentralized protocol', github_url: 'https://github.com/AbdelStark/nostr-mcp', category: 'communication', tags: ['nostr', 'decentralized'], github_stars: 200 },
  { name: 'iMessage Query', slug: 'imessage', description: 'Query and analyze iMessage conversations on macOS', github_url: 'https://github.com/hannesrudolph/imessage-query-fastmcp-mcp-server', category: 'communication', tags: ['imessage', 'macos'], github_stars: 250 },
  { name: 'LINE Bot', slug: 'line-bot', description: 'LINE Official Account integration', github_url: 'https://github.com/line/line-bot-mcp-server', category: 'communication', tags: ['line', 'bot', 'official'], github_stars: 300 },
  { name: 'Mattermost', slug: 'mattermost', description: 'Mattermost API for channels, messages, threads', github_url: 'https://github.com/conarti/mattermost-mcp', category: 'communication', tags: ['mattermost', 'chat'], github_stars: 180 },
  { name: 'Infobip', slug: 'infobip', description: 'Global cloud communication - SMS, RCS, WhatsApp, Viber', github_url: 'https://github.com/infobip/mcp', category: 'communication', tags: ['sms', 'messaging', 'official'], github_stars: 350 },
  { name: 'Discourse', slug: 'discourse', description: 'Forum integration for topics, posts, categories', github_url: 'https://github.com/discourse/discourse-mcp', category: 'communication', tags: ['forum', 'discourse', 'official'], github_stars: 280 },
  { name: 'CalDAV', slug: 'caldav', description: 'Universal calendar protocol integration', github_url: 'https://github.com/madbonez/caldav-mcp', category: 'productivity', tags: ['calendar', 'caldav'], github_stars: 200 },
  { name: 'VRChat', slug: 'vrchat', description: 'VRChat API for friends, worlds, avatars', github_url: 'https://github.com/sawa-zen/vrchat-mcp', category: 'communication', tags: ['vrchat', 'vr'], github_stars: 150 },
  { name: 'MS Teams', slug: 'ms-teams', description: 'Microsoft Teams messaging integration', github_url: 'https://github.com/InditexTech/mcp-teams-server', category: 'communication', tags: ['teams', 'microsoft'], github_stars: 300 },
  { name: 'Cal.com', slug: 'calcom', description: 'Manage Cal.com event types and bookings', github_url: 'https://github.com/Danielpeter-99/calcom-mcp', category: 'productivity', tags: ['calendar', 'scheduling'], github_stars: 180 },
  { name: 'Slack Power', slug: 'slack-power', description: 'Complete Slack context - DMs, channels, threads, search', github_url: 'https://github.com/jtalk22/slack-mcp-server', category: 'communication', tags: ['slack', 'complete'], github_stars: 350 },
  { name: 'ntfy Notifications', slug: 'ntfy', description: 'Send/fetch ntfy push notifications', github_url: 'https://github.com/gitmotion/ntfy-me-mcp', category: 'communication', tags: ['notifications', 'push'], github_stars: 200 },
  { name: 'Telephony', slug: 'telephony', description: 'Voice calls with STT and speech recognition', github_url: 'https://github.com/khan2a/telephony-mcp-server', category: 'communication', tags: ['voice', 'calls'], github_stars: 250 },
  { name: 'Inbox Zero', slug: 'inbox-zero', description: 'Gmail tools for finding emails needing replies', github_url: 'https://github.com/elie222/inbox-zero', category: 'communication', tags: ['gmail', 'productivity'], github_stars: 400 },
  
  // === DATABASES ===
  { name: 'CockroachDB', slug: 'cockroachdb', description: 'CockroachDB management, monitoring, and querying', github_url: 'https://github.com/amineelkouhen/mcp-cockroachdb', category: 'data-files', tags: ['database', 'cockroachdb'], github_stars: 200 },
  { name: 'Couchbase', slug: 'couchbase', description: 'Unified access to Couchbase Capella and self-managed clusters', github_url: 'https://github.com/Couchbase-Ecosystem/mcp-server-couchbase', category: 'data-files', tags: ['database', 'nosql', 'official'], github_stars: 300 },
  { name: 'Chroma', slug: 'chroma', description: 'Chroma vector database for retrieval capabilities', github_url: 'https://github.com/chroma-core/chroma-mcp', category: 'ai-ml', tags: ['vector', 'embeddings', 'official'], github_stars: 450 },
  { name: 'ClickHouse', slug: 'clickhouse', description: 'ClickHouse database integration for analytics', github_url: 'https://github.com/ClickHouse/mcp-clickhouse', category: 'data-files', tags: ['database', 'analytics'], github_stars: 400 },
  { name: 'Trino', slug: 'trino', description: 'Query and access data from Trino clusters', github_url: 'https://github.com/Dataring-engineering/mcp-server-trino', category: 'data-files', tags: ['database', 'trino'], github_stars: 250 },
  { name: 'Convex', slug: 'convex', description: 'Convex database introspection and queries', github_url: 'https://github.com/get-convex/convex-backend', category: 'data-files', tags: ['database', 'convex'], github_stars: 350 },
  { name: 'GreptimeDB', slug: 'greptimedb', description: 'Time-series database querying', github_url: 'https://github.com/GreptimeTeam/greptimedb-mcp-server', category: 'data-files', tags: ['database', 'timeseries'], github_stars: 200 },
  { name: 'Hydrolix', slug: 'hydrolix', description: 'Time-series datalake for LLM workflows', github_url: 'https://github.com/hydrolix/mcp-hydrolix', category: 'data-files', tags: ['database', 'timeseries', 'official'], github_stars: 250 },
  { name: 'InfluxDB 3', slug: 'influxdb3', description: 'Official InfluxDB 3 Core/Enterprise/Cloud', github_url: 'https://github.com/influxdata/influxdb3_mcp_server', category: 'data-files', tags: ['database', 'timeseries', 'official'], github_stars: 300 },
  { name: 'Memgraph', slug: 'memgraph', description: 'Graph database queries and schema access', github_url: 'https://github.com/memgraph/ai-toolkit', category: 'data-files', tags: ['database', 'graph'], github_stars: 280 },
  { name: 'Neon', slug: 'neon', description: 'Neon Serverless Postgres database management', github_url: 'https://github.com/neondatabase/mcp-server-neon', category: 'data-files', tags: ['database', 'postgres', 'serverless'], github_stars: 400 },
  { name: 'Nile Database', slug: 'nile', description: 'Multi-tenant Postgres with tenant/user management', github_url: 'https://github.com/niledatabase/nile-mcp-server', category: 'data-files', tags: ['database', 'postgres', 'multi-tenant'], github_stars: 250 },
  { name: 'Prisma', slug: 'prisma', description: 'Manage Prisma Postgres databases and migrations', github_url: 'https://github.com/prisma/mcp', category: 'data-files', tags: ['database', 'orm', 'official'], github_stars: 500 },
  { name: 'Redis Official', slug: 'redis-official', description: 'Official Redis MCP for data management and search', github_url: 'https://github.com/redis/mcp-redis', category: 'data-files', tags: ['database', 'cache', 'official'], github_stars: 450 },
  { name: 'Redis Cloud', slug: 'redis-cloud', description: 'Manage Redis Cloud resources with natural language', github_url: 'https://github.com/redis/mcp-redis-cloud', category: 'data-files', tags: ['database', 'cloud'], github_stars: 350 },
  { name: 'Weaviate', slug: 'weaviate', description: 'Vector database for semantic search', github_url: 'https://github.com/weaviate/mcp-server-weaviate', category: 'ai-ml', tags: ['vector', 'search'], github_stars: 380 },
  { name: 'MongoDB Atlas', slug: 'mongodb-atlas', description: 'MongoDB Atlas API for cluster management', github_url: 'https://github.com/montumodi/mongodb-atlas-mcp-server', category: 'data-files', tags: ['database', 'mongodb', 'atlas'], github_stars: 280 },
  { name: 'Fireproof', slug: 'fireproof', description: 'Ledger database with multi-user sync', github_url: 'https://github.com/fireproof-storage/mcp-database-server', category: 'data-files', tags: ['database', 'sync'], github_stars: 200 },
  { name: 'Apache Druid', slug: 'druid', description: 'Comprehensive tools for Apache Druid clusters', github_url: 'https://github.com/iunera/druid-mcp-server', category: 'data-files', tags: ['database', 'analytics'], github_stars: 180 },
  { name: 'Aiven', slug: 'aiven', description: 'Navigate Aiven projects - PostgreSQL, Kafka, ClickHouse', github_url: 'https://github.com/Aiven-Open/mcp-aiven', category: 'data-files', tags: ['database', 'managed', 'official'], github_stars: 350 },
  { name: 'Tablestore', slug: 'tablestore', description: 'Alibaba Tablestore for documents and semantic search', github_url: 'https://github.com/aliyun/alibabacloud-tablestore-mcp-server', category: 'data-files', tags: ['database', 'alibaba'], github_stars: 200 },
  { name: 'Confluent Kafka', slug: 'confluent', description: 'Confluent Kafka and Cloud REST APIs', github_url: 'https://github.com/confluentinc/mcp-confluent', category: 'data-files', tags: ['kafka', 'streaming'], github_stars: 380 },
  { name: 'Google Sheets MCP', slug: 'google-sheets-mcp', description: '25 tools for Google Sheets automation', github_url: 'https://github.com/henilcalagiya/google-sheets-mcp', category: 'data-files', tags: ['sheets', 'google'], github_stars: 250 },
  { name: 'Baserow', slug: 'baserow', description: 'Baserow database with CRUD operations', github_url: 'https://github.com/bram2w/baserow', category: 'data-files', tags: ['database', 'nocode'], github_stars: 200 },
  
  // === CODE EXECUTION ===
  { name: 'E2B Sandbox', slug: 'e2b', description: 'Secure code execution in cloud sandboxes', github_url: 'https://github.com/e2b-dev/mcp-server', category: 'developer-tools', tags: ['sandbox', 'code'], github_stars: 400 },
  { name: 'Pydantic Run Python', slug: 'pydantic-run', description: 'Run Python code in secure sandbox via MCP', github_url: 'https://github.com/pydantic/pydantic-ai', category: 'developer-tools', tags: ['python', 'sandbox'], github_stars: 500 },
  { name: 'YepCode', slug: 'yepcode', description: 'Execute LLM-generated code in secure environment', github_url: 'https://github.com/yepcode/mcp-server-js', category: 'developer-tools', tags: ['code', 'sandbox', 'official'], github_stars: 350 },
  { name: 'Container Use', slug: 'container-use', description: 'Containerized environments for coding agents', github_url: 'https://github.com/dagger/container-use', category: 'developer-tools', tags: ['containers', 'agents'], github_stars: 450 },
  { name: 'Piston Code', slug: 'piston', description: 'Remote code execution via Piston engine', github_url: 'https://github.com/alvii147/piston-mcp', category: 'developer-tools', tags: ['code', 'execution'], github_stars: 200 },
  { name: 'OpenAPI MCP', slug: 'openapi-mcp', description: 'Access any API with existing OpenAPI docs', github_url: 'https://github.com/ckanthony/openapi-mcp', category: 'developer-tools', tags: ['api', 'openapi'], github_stars: 300 },
  
  // === CODING AGENTS ===
  { name: 'Roundtable', slug: 'roundtable', description: 'Unify multiple AI coding assistants - Codex, Claude, Cursor', github_url: 'https://github.com/askbudi/roundtable', category: 'developer-tools', tags: ['agents', 'multi-ai'], github_stars: 400 },
  { name: 'CodeMCP', slug: 'codemcp', description: 'Coding agent with read, write and command tools', github_url: 'https://github.com/ezyang/codemcp', category: 'developer-tools', tags: ['agent', 'coding'], github_stars: 350 },
  { name: 'Serena', slug: 'serena', description: 'Full-featured coding agent using language servers', github_url: 'https://github.com/oraios/serena', category: 'developer-tools', tags: ['agent', 'lsp'], github_stars: 500 },
  { name: 'Desktop Commander', slug: 'desktop-commander', description: 'Swiss-army-knife for programs and file management', github_url: 'https://github.com/wonderwhy-er/DesktopCommanderMCP', category: 'developer-tools', tags: ['desktop', 'files'], github_stars: 450 },
  { name: 'iTerm MCP', slug: 'iterm', description: 'Run commands and query iTerm terminal', github_url: 'https://github.com/ferrislucas/iterm-mcp', category: 'developer-tools', tags: ['terminal', 'iterm'], github_stars: 250 },
  { name: 'Terminator', slug: 'terminator', description: 'Desktop GUI automation using accessibility APIs', github_url: 'https://github.com/mediar-ai/terminator', category: 'developer-tools', tags: ['gui', 'automation'], github_stars: 400 },
  { name: 'LeetCode', slug: 'leetcode', description: 'Search, retrieve, and solve LeetCode problems', github_url: 'https://github.com/doggybee/mcp-server-leetcode', category: 'developer-tools', tags: ['leetcode', 'coding'], github_stars: 280 },
  { name: 'VSCode Server', slug: 'vscode-server', description: 'Read workspace, see linter problems, make edits', github_url: 'https://github.com/juehang/vscode-mcp-server', category: 'developer-tools', tags: ['vscode', 'ide'], github_stars: 300 },
  { name: 'Codex CLI', slug: 'codex-cli', description: 'Connect IDE to Codex CLI for code analysis', github_url: 'https://github.com/x51xxx/codex-mcp-tool', category: 'developer-tools', tags: ['codex', 'analysis'], github_stars: 250 },
  { name: 'Copilot CLI', slug: 'copilot-cli', description: 'GitHub Copilot CLI for code review and analysis', github_url: 'https://github.com/x51xxx/copilot-mcp-server', category: 'developer-tools', tags: ['copilot', 'review'], github_stars: 280 },
  { name: 'SSH MCP', slug: 'ssh-mcp', description: 'SSH control for Linux and Windows servers', github_url: 'https://github.com/blakerouse/ssh-mcp', category: 'developer-tools', tags: ['ssh', 'remote'], github_stars: 320 },
  { name: 'Shell Server', slug: 'shell-server', description: 'Secure shell command execution', github_url: 'https://github.com/tumf/mcp-shell-server', category: 'developer-tools', tags: ['shell', 'security'], github_stars: 250 },
  
  // === AI & ML ===
  { name: 'LangChain MCP', slug: 'langchain', description: 'LangChain framework integration', github_url: 'https://github.com/langchain-ai/mcp-server-langchain', category: 'ai-ml', tags: ['framework', 'chains'], github_stars: 600 },
  { name: 'Perplexity', slug: 'perplexity', description: 'Perplexity AI search and research', github_url: 'https://github.com/perplexity/mcp-server-perplexity', category: 'ai-ml', tags: ['search', 'research'], github_stars: 400 },
  { name: 'Gemini Bridge', slug: 'gemini-bridge', description: 'Bridge to Google Gemini API', github_url: 'https://github.com/jaspertvdm/mcp-server-gemini-bridge', category: 'ai-ml', tags: ['gemini', 'google'], github_stars: 300 },
  { name: 'Ollama Bridge', slug: 'ollama-bridge', description: 'Bridge to local Ollama LLM server', github_url: 'https://github.com/jaspertvdm/mcp-server-ollama-bridge', category: 'ai-ml', tags: ['ollama', 'local'], github_stars: 350 },
  { name: 'OpenAI Bridge', slug: 'openai-bridge', description: 'Bridge to OpenAI API - GPT-4, GPT-4o', github_url: 'https://github.com/jaspertvdm/mcp-server-openai-bridge', category: 'ai-ml', tags: ['openai', 'gpt'], github_stars: 400 },
  { name: 'GPT Image Gen', slug: 'gpt-image', description: 'OpenAI GPT image generation and editing', github_url: 'https://github.com/SureScaleAI/openai-gpt-image-mcp', category: 'ai-ml', tags: ['image', 'openai'], github_stars: 300 },
  { name: 'Imagen 3', slug: 'imagen3', description: 'Google Imagen 3.0 image generation', github_url: 'https://github.com/hamflx/imagen3-mcp', category: 'ai-ml', tags: ['image', 'google'], github_stars: 250 },
  { name: 'BioMCP', slug: 'biomcp', description: 'Biomedical research - PubMed, ClinicalTrials, MyVariant', github_url: 'https://github.com/genomoncology/biomcp', category: 'ai-ml', tags: ['biomedical', 'research'], github_stars: 350 },
  { name: 'ChatSpatial', slug: 'chatspatial', description: 'Spatial transcriptomics analysis with 60+ methods', github_url: 'https://github.com/cafferychen777/ChatSpatial', category: 'ai-ml', tags: ['bioinformatics', 'spatial'], github_stars: 250 },
  { name: 'FHIR Server', slug: 'fhir', description: 'Healthcare FHIR API for clinical data', github_url: 'https://github.com/wso2/fhir-mcp-server', category: 'ai-ml', tags: ['healthcare', 'fhir'], github_stars: 300 },
  { name: 'Apple Health', slug: 'apple-health', description: 'Access exported Apple Health data with analytics', github_url: 'https://github.com/the-momentum/apple-health-mcp-server', category: 'ai-ml', tags: ['health', 'apple'], github_stars: 280 },
  
  // === FINANCE ===
  { name: 'Coinbase MCP', slug: 'coinbase', description: 'Coinbase cryptocurrency trading and data', github_url: 'https://github.com/coinbase/mcp-server-coinbase', category: 'finance', tags: ['crypto', 'trading'], github_stars: 350 },
  { name: 'Binance', slug: 'binance', description: 'Binance crypto exchange integration', github_url: 'https://github.com/nicepkg/mcp-server-binance', category: 'finance', tags: ['crypto', 'trading'], github_stars: 280 },
  { name: 'Alpaca Trading', slug: 'alpaca', description: 'Alpaca stock trading API', github_url: 'https://github.com/alpacahq/mcp-server-alpaca', category: 'finance', tags: ['stocks', 'trading'], github_stars: 300 },
  { name: 'DataForSEO', slug: 'dataforseo', description: 'SEO data - SERPs, keyword research, domain analytics', github_url: 'https://github.com/dataforseo/mcp-server-dataforseo', category: 'other', tags: ['seo', 'analytics'], github_stars: 400 },
  { name: 'Iaptic', slug: 'iaptic', description: 'Customer purchases, transactions, revenue stats', github_url: 'https://github.com/iaptic/mcp-server-iaptic', category: 'finance', tags: ['purchases', 'analytics', 'official'], github_stars: 200 },
  
  // === SECURITY ===
  { name: 'Vault Official', slug: 'vault', description: 'HashiCorp Vault secrets management', github_url: 'https://github.com/hashicorp/mcp-server-vault', category: 'infrastructure', tags: ['secrets', 'security', 'official'], github_stars: 450 },
  { name: 'Bitwarden', slug: 'bitwarden', description: 'Bitwarden password management', github_url: 'https://github.com/bitwarden/mcp-server-bitwarden', category: 'other', tags: ['passwords', 'security'], github_stars: 350 },
  { name: 'Netskope', slug: 'netskope', description: 'Netskope Private Access security components', github_url: 'https://github.com/johnneerdael/netskope-mcp', category: 'infrastructure', tags: ['security', 'vpn'], github_stars: 200 },
  
  // === PRODUCTIVITY ===
  { name: 'Notion Official', slug: 'notion-official', description: 'Official Notion MCP Server', github_url: 'https://github.com/makenotion/notion-mcp-server', category: 'productivity', tags: ['notion', 'official'], github_stars: 500 },
  { name: 'Google Tasks MCP', slug: 'google-tasks', description: 'Manage Google Tasks', github_url: 'https://github.com/zcaceres/gtasks-mcp', category: 'productivity', tags: ['tasks', 'google'], github_stars: 250 },
  { name: 'Apple Reminders', slug: 'apple-reminders', description: 'Interact with Apple Reminders on macOS', github_url: 'https://github.com/FradSer/mcp-server-apple-reminders', category: 'productivity', tags: ['reminders', 'apple'], github_stars: 200 },
  { name: 'Apple Shortcuts', slug: 'apple-shortcuts', description: 'Integration with Apple Shortcuts', github_url: 'https://github.com/recursechat/mcp-server-apple-shortcuts', category: 'productivity', tags: ['shortcuts', 'apple'], github_stars: 180 },
  { name: 'Product Hunt', slug: 'producthunt', description: 'Interact with Product Hunt posts and users', github_url: 'https://github.com/jaipandya/producthunt-mcp-server', category: 'productivity', tags: ['producthunt', 'startups'], github_stars: 200 },
  { name: 'Liveblocks', slug: 'liveblocks', description: 'Manage Liveblocks rooms, threads, comments', github_url: 'https://github.com/liveblocks/liveblocks-mcp-server', category: 'productivity', tags: ['collaboration', 'realtime', 'official'], github_stars: 300 },
  { name: 'Monday.com', slug: 'monday', description: 'Monday.com work management', github_url: 'https://github.com/mondaycom/mcp-server-monday', category: 'productivity', tags: ['project-management'], github_stars: 280 },
  { name: 'Feishu', slug: 'feishu', description: 'Feishu/Lark document management with OAuth', github_url: 'https://github.com/ztxtxwd/open-feishu-mcp-server', category: 'productivity', tags: ['feishu', 'docs'], github_stars: 250 },
  { name: 'Tinybird', slug: 'tinybird', description: 'Interact with Tinybird Workspace', github_url: 'https://github.com/tinybirdco/mcp-tinybird', category: 'data-files', tags: ['analytics', 'realtime'], github_stars: 300 },
  { name: 'MS 365', slug: 'ms365', description: 'Microsoft 365 suite via Graph API', github_url: 'https://github.com/softeria/ms-365-mcp-server', category: 'productivity', tags: ['microsoft', 'office'], github_stars: 350 },
  
  // === SEARCH ===
  { name: 'Brave Search Official', slug: 'brave-search', description: 'Official Brave Search API integration', github_url: 'https://github.com/brave/brave-search-mcp', category: 'web-browser', tags: ['search', 'official'], github_stars: 500 },
  { name: 'SerpAPI', slug: 'serpapi', description: 'Google search results API', github_url: 'https://github.com/serpapi/mcp-server-serpapi', category: 'web-browser', tags: ['search', 'google'], github_stars: 300 },
  { name: 'DuckDuckGo MCP', slug: 'duckduckgo', description: 'Privacy-focused DuckDuckGo search', github_url: 'https://github.com/nicepkg/mcp-server-duckduckgo', category: 'web-browser', tags: ['search', 'privacy'], github_stars: 250 },
  { name: 'Docfork', slug: 'docfork', description: 'Up-to-date docs for 9000+ libraries in your IDE', github_url: 'https://github.com/docfork/mcp-server-docfork', category: 'developer-tools', tags: ['documentation', 'libs'], github_stars: 400 },
  
  // === OTHER ===
  { name: '3D Printer', slug: '3d-printer', description: 'OctoEverywhere 3D printer control and monitoring', github_url: 'https://github.com/OctoEverywhere/mcp', category: 'other', tags: ['3d-printer', 'iot', 'official'], github_stars: 200 },
  { name: 'Home Assistant MCP', slug: 'homeassistant', description: 'Home Assistant smart home control', github_url: 'https://github.com/nicepkg/mcp-server-homeassistant', category: 'other', tags: ['smart-home', 'iot'], github_stars: 350 },
  { name: 'MQTT', slug: 'mqtt', description: 'MQTT IoT messaging protocol', github_url: 'https://github.com/nicepkg/mcp-server-mqtt', category: 'other', tags: ['iot', 'messaging'], github_stars: 200 },
  { name: 'ESP RainMaker', slug: 'esp-rainmaker', description: 'Manage Espressif ESP RainMaker IoT devices', github_url: 'https://github.com/espressif/esp-rainmaker-mcp', category: 'other', tags: ['iot', 'esp32', 'official'], github_stars: 250 },
  { name: 'Mermaid Generator', slug: 'mermaid', description: '22+ diagram types with 50+ templates', github_url: 'https://github.com/Narasimhaponnada/mermaid-mcp', category: 'developer-tools', tags: ['diagrams', 'mermaid'], github_stars: 350 },
  { name: 'ECharts', slug: 'echarts', description: 'Generate charts using Apache ECharts', github_url: 'https://github.com/hustcc/mcp-echarts', category: 'other', tags: ['charts', 'visualization'], github_stars: 280 },
  { name: 'AntV Charts', slug: 'antv', description: 'Generate visual charts using AntV', github_url: 'https://github.com/antvis/mcp-server-chart', category: 'other', tags: ['charts', 'visualization', 'official'], github_stars: 350 },
  { name: 'Open Library', slug: 'open-library', description: 'Open Library API for book information', github_url: 'https://github.com/8enSmith/mcp-open-library', category: 'other', tags: ['books', 'library'], github_stars: 180 },
  { name: 'TMDB Movies', slug: 'tmdb', description: 'The Movie Database API for movies and TV', github_url: 'https://github.com/drakonkat/wizzy-mcp-tmdb', category: 'other', tags: ['movies', 'tv'], github_stars: 200 },
  { name: 'AniList', slug: 'anilist', description: 'AniList API for anime and manga info', github_url: 'https://github.com/yuna0x0/anilist-mcp', category: 'other', tags: ['anime', 'manga'], github_stars: 180 },
  { name: 'Discogs', slug: 'discogs', description: 'Discogs music database API', github_url: 'https://github.com/cswkim/discogs-mcp-server', category: 'other', tags: ['music', 'database'], github_stars: 150 },
  { name: 'Quran', slug: 'quran', description: 'Quran.com corpus via REST API', github_url: 'https://github.com/djalal/quran-mcp-server', category: 'other', tags: ['quran', 'religious'], github_stars: 150 },
  { name: 'Bazi Astrology', slug: 'bazi', description: 'Chinese Astrology charting and analysis', github_url: 'https://github.com/cantian-ai/bazi-mcp', category: 'other', tags: ['astrology', 'chinese'], github_stars: 120 },
  { name: 'Rijksmuseum', slug: 'rijksmuseum', description: 'Rijksmuseum artwork search and details', github_url: 'https://github.com/r-huijts/rijksmuseum-mcp', category: 'other', tags: ['art', 'museum'], github_stars: 150 },
  { name: 'Met Museum', slug: 'met-museum', description: 'Metropolitan Museum of Art collection API', github_url: 'https://github.com/mikechao/metmuseum-mcp', category: 'other', tags: ['art', 'museum'], github_stars: 140 },
  { name: 'Smithsonian', slug: 'smithsonian', description: 'Smithsonian Open Access collections', github_url: 'https://github.com/molanojustin/smithsonian-mcp', category: 'other', tags: ['museum', 'collections'], github_stars: 130 },
  { name: 'WWII Sources', slug: 'oorlogsbronnen', description: 'Dutch WWII records and photographs', github_url: 'https://github.com/r-huijts/oorlogsbronnen-mcp', category: 'other', tags: ['history', 'wwii'], github_stars: 100 },
  { name: 'Spotify Bulk', slug: 'spotify-bulk', description: 'Bulk Spotify operations and playlist creation', github_url: 'https://github.com/khglynn/spotify-bulk-actions-mcp', category: 'other', tags: ['spotify', 'music'], github_stars: 200 },
  { name: 'SVG Maker', slug: 'svgmaker', description: 'AI-driven SVG generation from natural language', github_url: 'https://github.com/GenWaveLLC/svgmaker-mcp', category: 'other', tags: ['svg', 'graphics'], github_stars: 180 },
  { name: 'YouTube API', slug: 'youtube-api', description: 'Fully functional YouTube CLI and MCP', github_url: 'https://github.com/eat-pray-ai/yutu', category: 'web-browser', tags: ['youtube', 'video'], github_stars: 250 },
  { name: 'Cloud Pricing', slug: 'cloud-pricing', description: 'Multi-cloud pricing comparison - AWS, Azure, GCP, OCI', github_url: 'https://github.com/jasonwilbur/cloud-cost-mcp', category: 'infrastructure', tags: ['pricing', 'cloud'], github_stars: 300 },
  { name: 'Intlayer i18n', slug: 'intlayer', description: 'AI assistance for Intlayer i18n/CMS tool', github_url: 'https://github.com/aymericzip/intlayer', category: 'developer-tools', tags: ['i18n', 'localization'], github_stars: 200 },
  { name: 'Carbon Voice', slug: 'carbon-voice', description: 'Voice messages and conversations in Carbon Voice', github_url: 'https://github.com/PhononX/cv-mcp-server', category: 'communication', tags: ['voice', 'messages', 'official'], github_stars: 180 },
  { name: 'WaYStation', slug: 'waystation', description: 'Connect Claude to apps - Notion, Slack, Airtable', github_url: 'https://github.com/waystation-ai/mcp', category: 'other', tags: ['integration', 'apps'], github_stars: 300 },
  { name: 'IPFS Storage', slug: 'ipfs', description: 'IPFS storage upload and manipulation', github_url: 'https://github.com/alexbakers/mcp-ipfs', category: 'infrastructure', tags: ['ipfs', 'storage'], github_stars: 200 },
  { name: '4EVERLAND', slug: '4everland', description: 'Deploy to IPFS, Greenfield, Arweave', github_url: 'https://github.com/4everland/4everland-hosting-mcp', category: 'infrastructure', tags: ['decentralized', 'hosting', 'official'], github_stars: 250 },
];

async function expandServers() {
  await db.initDb();
  console.log('Expanding server database...\n');
  
  let added = 0;
  let skipped = 0;
  
  for (const server of EXPANDED_SERVERS) {
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
  
  console.log(`\n========================`);
  console.log(`Added: ${added}`);
  console.log(`Skipped (existing): ${skipped}`);
  console.log(`Total servers now: ${db.servers.count()}`);
}

module.exports = { EXPANDED_SERVERS };

if (require.main === module) {
  expandServers().catch(console.error);
}
