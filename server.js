#!/usr/bin/env node
/**
 * AutropicAI — The MCP Server Marketplace
 */

const express = require('express');
const path = require('path');
const db = require('./lib/database');
const analytics = require('./lib/analytics');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin_dev_key';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// === API Routes ===

// List servers (JSON API)
app.get('/api/v1/servers', (req, res) => {
  const { category, search, limit, featured } = req.query;
  const servers = db.servers.getAll({
    category,
    search,
    limit: limit ? parseInt(limit) : 100,
    featured: featured === 'true'
  });
  
  // Track searches (the valuable data!)
  if (search) {
    const source = req.headers['user-agent']?.includes('MCP') ? 'mcp' : 'api';
    analytics.search(search, servers.length, req, source);
  }
  
  res.json({
    servers: servers.map(s => ({
      ...s,
      tags: JSON.parse(s.tags || '[]')
    })),
    total: servers.length
  });
});

// Get single server
app.get('/api/v1/servers/:slug', (req, res) => {
  const server = db.servers.getBySlug(req.params.slug);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  // Increment view count
  db.servers.incrementViews(server.id);
  
  // Track view (valuable data!)
  const source = req.headers['user-agent']?.includes('MCP') ? 'mcp' : 'api';
  analytics.view(req.params.slug, req, source);
  
  res.json({
    ...server,
    tags: JSON.parse(server.tags || '[]')
  });
});

// List categories
app.get('/api/v1/categories', (req, res) => {
  const categories = db.categories.getAll();
  res.json({ categories });
});

// Submit a server
app.post('/api/v1/submit', (req, res) => {
  const { github_url, email, notes } = req.body;
  
  if (!github_url) {
    return res.status(400).json({ error: 'github_url is required' });
  }
  
  // Basic URL validation
  if (!github_url.includes('github.com/')) {
    return res.status(400).json({ error: 'Must be a GitHub URL' });
  }
  
  db.submissions.create({
    github_url,
    submitter_email: email,
    notes
  });
  
  // Track submission
  analytics.submit(github_url, req);
  
  res.status(201).json({ message: 'Submission received! We\'ll review it soon.' });
});

// Stats endpoint
app.get('/api/v1/stats', (req, res) => {
  res.json(db.stats.overview());
});

// === Admin Routes ===

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/api/admin/stats', adminAuth, (req, res) => {
  res.json({
    ...db.stats.overview(),
    submissions: db.submissions.getPending()
  });
});

app.get('/api/admin/submissions', adminAuth, (req, res) => {
  res.json({ submissions: db.submissions.getPending() });
});

app.post('/api/admin/submissions/:id/approve', adminAuth, (req, res) => {
  db.submissions.approve(req.params.id);
  res.json({ message: 'Approved' });
});

app.post('/api/admin/submissions/:id/reject', adminAuth, (req, res) => {
  db.submissions.reject(req.params.id);
  res.json({ message: 'Rejected' });
});

// Add server directly (admin)
app.post('/api/admin/servers', adminAuth, (req, res) => {
  try {
    const result = db.servers.create(req.body);
    res.status(201).json({ message: 'Server added', id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Analytics status (admin)
app.get('/api/admin/analytics', adminAuth, (req, res) => {
  res.json({
    configured: analytics.isConfigured(),
    message: analytics.isConfigured() 
      ? 'Analytics active — check Supabase for data'
      : 'Add SUPABASE_URL and SUPABASE_KEY to enable analytics'
  });
});

// === HTML Routes (SPA-style, serve index.html) ===

// Server detail page
app.get('/server/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Category page
app.get('/category/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Submit page
app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Search
app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === Hosted MCP Servers (Runtime Provision) ===
const hostedMcp = require('./lib/hosted-mcp');
const usageTracker = require('./lib/usage-tracker');

// List available hosted servers
app.get('/api/v1/hosted', (req, res) => {
  usageTracker.trackView('/api/v1/hosted', req);
  
  const servers = hostedMcp.listHostedServers();
  res.json({
    description: 'Hosted MCP servers available for instant use. No installation required.',
    servers,
    usage: {
      list_tools: 'GET /mcp/:slug/tools/list',
      call_tool: 'POST /mcp/:slug/tools/call { "name": "tool_name", "arguments": {} }'
    }
  });
});

// === DISCOVER ENDPOINT — The agent on-ramp ===

// Simple keyword matching for discovery
function matchScore(query, text) {
  if (!text) return 0;
  const q = query.toLowerCase().split(/\s+/);
  const t = text.toLowerCase();
  return q.filter(word => t.includes(word)).length;
}

// GET /discover?q=send+email — Returns best tool for the job
app.get('/discover', (req, res) => {
  const query = req.query.q || req.query.query || '';
  if (!query) {
    return res.json({
      error: 'Missing query. Usage: GET /discover?q=send+email',
      examples: [
        '/discover?q=current+time',
        '/discover?q=generate+uuid',
        '/discover?q=fetch+webpage',
        '/discover?q=store+data'
      ]
    });
  }
  
  usageTracker.trackView(`/discover?q=${encodeURIComponent(query)}`, req);
  
  // Search hosted servers first (instant access)
  const hosted = hostedMcp.listHostedServers();
  const hostedMatches = hosted.map(server => {
    const toolNames = server.tools.join(' ');
    const score = matchScore(query, server.name + ' ' + server.description + ' ' + toolNames);
    return { ...server, score, type: 'hosted' };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  
  // Search directory too
  const directory = db.servers.getAll({ search: query, limit: 5 });
  const directoryMatches = directory.map(s => ({
    slug: s.slug,
    name: s.name,
    description: s.description,
    github_url: s.github_url,
    install_command: s.install_command,
    type: 'directory',
    score: matchScore(query, s.name + ' ' + s.description)
  }));
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // Best hosted match = instant solution
  if (hostedMatches.length > 0) {
    const best = hostedMatches[0];
    return res.json({
      found: true,
      instant: true,
      query,
      recommendation: {
        server: best.name,
        description: best.description,
        endpoint: `${baseUrl}/mcp/${best.slug}/tools/call`,
        tools: best.tools,
        usage: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { name: best.tools[0], arguments: {} },
          example: `curl -X POST ${baseUrl}/mcp/${best.slug}/tools/call -H "Content-Type: application/json" -d '{"name":"${best.tools[0]}","arguments":{}}'`
        }
      },
      alternatives: {
        hosted: hostedMatches.slice(1, 3),
        directory: directoryMatches.slice(0, 3)
      }
    });
  }
  
  // No hosted match, suggest from directory
  if (directoryMatches.length > 0) {
    const best = directoryMatches[0];
    return res.json({
      found: true,
      instant: false,
      query,
      recommendation: {
        server: best.name,
        description: best.description,
        github_url: best.github_url,
        install_command: best.install_command,
        note: 'This server requires local installation. Use the install_command or visit github_url.'
      },
      alternatives: {
        directory: directoryMatches.slice(1, 5)
      },
      tip: 'Want instant access? Check our hosted servers: GET /api/v1/hosted'
    });
  }
  
  // Nothing found
  res.json({
    found: false,
    query,
    message: 'No matching tools found. Try different keywords.',
    available_hosted: hosted.map(h => ({ name: h.name, description: h.description })),
    search_directory: `${baseUrl}/api/v1/servers?search=${encodeURIComponent(query)}`
  });
});

// POST /discover — Same but accepts JSON body
app.post('/discover', express.json(), (req, res) => {
  req.query.q = req.body.query || req.body.q || req.body.need;
  req.url = `/discover?q=${encodeURIComponent(req.query.q || '')}`;
  app.handle(req, res);
});

// Usage stats (protected)
app.get('/api/v1/hosted/stats', (req, res) => {
  // Simple auth - check admin key
  const authKey = req.headers['authorization']?.replace('Bearer ', '') || req.query.key;
  if (authKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Provide admin key.' });
  }
  
  res.json(usageTracker.getStats());
});

// Provision a hosted server (returns endpoint info)
app.get('/api/v1/provision/:slug', (req, res) => {
  usageTracker.trackView(`/api/v1/provision/${req.params.slug}`, req);
  
  const server = hostedMcp.getHostedServer(req.params.slug);
  if (!server) {
    return res.status(404).json({ error: 'Server not found. Use GET /api/v1/hosted to list available servers.' });
  }
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    provisioned: true,
    server: server.name,
    description: server.description,
    endpoints: {
      list_tools: `${baseUrl}/mcp/${req.params.slug}/tools/list`,
      call_tool: `${baseUrl}/mcp/${req.params.slug}/tools/call`
    },
    tools: server.tools,
    usage: {
      example: `curl -X POST ${baseUrl}/mcp/${req.params.slug}/tools/call -H "Content-Type: application/json" -d '{"name": "${server.tools[0]?.name || 'tool_name'}", "arguments": {}}'`
    }
  });
});

// MCP-style tool listing
app.get('/mcp/:slug/tools/list', (req, res) => {
  const server = hostedMcp.getHostedServer(req.params.slug);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  res.json({
    tools: server.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }))
  });
});

// MCP-style tool execution
app.post('/mcp/:slug/tools/call', async (req, res) => {
  const { name, arguments: args } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Missing "name" field for tool' });
  }
  
  // Track this call
  usageTracker.trackCall(req.params.slug, name, req);
  
  const result = await hostedMcp.executeTool(req.params.slug, name, args || {});
  
  res.json({
    tool: name,
    result,
    _server: req.params.slug
  });
});

// Sitemap for SEO
app.get('/sitemap.xml', (req, res) => {
  const servers = db.servers.getAll({ limit: 1000 });
  const categories = db.categories.getAll();
  const baseUrl = 'https://tryautropic.com';
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${baseUrl}/submit</loc><priority>0.7</priority></url>
`;
  
  categories.forEach(cat => {
    xml += `  <url><loc>${baseUrl}/category/${cat.slug}</loc><priority>0.8</priority></url>\n`;
  });
  
  servers.forEach(s => {
    xml += `  <url><loc>${baseUrl}/server/${s.slug}</loc><priority>0.6</priority></url>\n`;
  });
  
  xml += '</urlset>';
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// === Start ===

async function start() {
  await db.initDb();
  console.log('Database initialized');
  
  // Seed on startup (Render free tier has ephemeral disk)
  // Always run to add new servers while skipping existing ones
  console.log('Checking for new servers to seed...');
  try {
    const { seedServers } = require('./scripts/seed-from-awesome');
    const result = await seedServers(db);  // Pass db instance
    if (result.added > 0) {
      console.log(`Seeded: added ${result.added} new, skipped ${result.skipped} existing`);
    } else {
      console.log(`Database up to date: ${result.skipped} servers`);
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
  console.log(`Total servers: ${db.servers.count()}`);
  
  app.listen(PORT, () => {
    console.log(`AutropicAI running on http://localhost:${PORT}`);
    console.log(`${db.servers.count()} MCP servers in directory`);
    console.log(`${hostedMcp.listHostedServers().length} hosted MCP servers`);
    console.log(`Supabase analytics: ${usageTracker.isSupabaseConfigured() ? '✓ connected' : '✗ not configured'}`);
  });
}

start().catch(console.error);
