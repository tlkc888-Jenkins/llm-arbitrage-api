#!/usr/bin/env node
/**
 * AutropicAI — The MCP Server Marketplace
 */

const express = require('express');
const path = require('path');
const db = require('./lib/database');
const analytics = require('./lib/analytics');
const waitlist = require('./lib/waitlist');

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

// === LLM Discovery Files ===
// For AI assistants to discover our tools (copying Composio's playbook)
app.get('/llms.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'llms.txt'));
});

app.get('/llms-full.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, 'public', 'llms-full.txt'));
});

// Clean URLs for HTML pages
app.get('/integrate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'integrate.html'));
});

app.get('/api/weather', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api', 'weather.html'));
});

app.get('/api/time', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api', 'time.html'));
});

app.get('/api/crypto', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api', 'crypto.html'));
});

app.get('/api/calculator', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'api', 'calculator.html'));
});

// Legal pages
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Pro tier / Upgrade page
app.get('/pro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pro.html'));
});

// === Waitlist & Pro Tier APIs ===

// Join waitlist
app.post('/api/v1/waitlist', async (req, res) => {
  const { email, interests } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const entry = await waitlist.addToWaitlist(email, interests || []);
  res.json({ success: true, message: 'Added to waitlist', position: waitlist.getWaitlistCount() });
});

// Get top missing searches (admin)
app.get('/api/v1/missing-searches', (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${ADMIN_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ searches: waitlist.getTopMissingSearches(50) });
});

// Check API key status
app.get('/api/v1/key/status', (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  const proData = waitlist.validateProKey(apiKey);
  
  if (!proData) {
    return res.json({
      tier: 'free',
      limits: { requestsPerMinute: 100, requestsPerDay: 10000 },
      message: 'Upgrade to Pro for 10x limits: https://tryautropic.com/pro'
    });
  }
  
  res.json({
    tier: proData.tier,
    limits: proData.limits,
    email: proData.email,
    active: proData.active
  });
});

// Stripe webhook (for creating Pro keys on payment)
app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  
  // In production, verify the webhook signature
  // For now, just parse the event
  let event;
  try {
    event = JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email || session.customer_details?.email;
    
    if (email) {
      const { apiKey } = await waitlist.createProKey(email, 'pro');
      console.log(`[STRIPE] Created Pro key for ${email}: ${apiKey.slice(0, 10)}...`);
      // TODO: Send email with API key
    }
  }
  
  res.json({ received: true });
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

// Admin dashboard (PWA)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Live demo page
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

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

// === PERFECT MATCH API — Smart tool matching for agents ===

// Enhanced scoring with multiple factors
function calculateMatchScore(query, server, toolDetails) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  let score = 0;
  let factors = {};
  
  // Factor 1: Tool name exact match (highest weight)
  const toolNames = server.tools || [];
  for (const tool of toolNames) {
    if (queryLower.includes(tool.replace(/_/g, ' ')) || queryLower.includes(tool)) {
      factors.tool_name_match = 0.3;
      score += 0.3;
      break;
    }
  }
  
  // Factor 2: Server name match
  const serverNameLower = (server.name || '').toLowerCase();
  for (const word of queryWords) {
    if (serverNameLower.includes(word)) {
      factors.server_name = 0.15;
      score += 0.15;
      break;
    }
  }
  
  // Factor 3: Description semantic match
  const descLower = (server.description || '').toLowerCase();
  let descMatches = 0;
  for (const word of queryWords) {
    if (descLower.includes(word)) descMatches++;
  }
  if (queryWords.length > 0) {
    const descScore = (descMatches / queryWords.length) * 0.25;
    factors.description = Math.round(descScore * 100) / 100;
    score += descScore;
  }
  
  // Factor 4: Keyword synonyms and related terms
  const synonymMap = {
    'email': ['mail', 'send', 'message', 'smtp'],
    'time': ['date', 'clock', 'timezone', 'now', 'current'],
    'validate': ['check', 'verify', 'valid', 'test'],
    'generate': ['create', 'make', 'produce', 'new'],
    'convert': ['transform', 'change', 'format'],
    'hash': ['encrypt', 'sha', 'md5', 'checksum'],
    'random': ['generate', 'uuid', 'password'],
    'url': ['link', 'web', 'http', 'uri'],
    'json': ['parse', 'format', 'data'],
    'text': ['string', 'word', 'character'],
    'currency': ['money', 'exchange', 'rate', 'convert'],
    'weather': ['forecast', 'temperature', 'climate'],
    'location': ['geo', 'place', 'address', 'coordinates']
  };
  
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    const allTerms = [key, ...synonyms];
    const queryHasTerm = allTerms.some(t => queryLower.includes(t));
    const serverHasTerm = allTerms.some(t => 
      serverNameLower.includes(t) || descLower.includes(t) || toolNames.some(tn => tn.includes(t))
    );
    if (queryHasTerm && serverHasTerm) {
      factors.semantic = 0.2;
      score += 0.2;
      break;
    }
  }
  
  // Factor 5: Hosted bonus (instant access is valuable)
  if (server.type === 'hosted') {
    factors.hosted_bonus = 0.1;
    score += 0.1;
  }
  
  return { 
    score: Math.min(Math.round(score * 100) / 100, 1.0),
    factors 
  };
}

// Confidence level from score
function getConfidence(score) {
  if (score >= 0.9) return 'perfect';
  if (score >= 0.75) return 'strong';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'partial';
  return 'weak';
}

// GET /api/v1/match — Perfect match rating for agents
app.get('/api/v1/match', (req, res) => {
  const query = req.query.q || req.query.query || '';
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const minScore = parseFloat(req.query.min_score) || 0.3;
  const source = req.query.source || req.headers['x-source'] || 'api';
  
  if (!query) {
    return res.json({
      error: 'Missing query parameter',
      usage: 'GET /api/v1/match?q=validate+email',
      examples: [
        '/api/v1/match?q=send+email',
        '/api/v1/match?q=generate+qr+code',
        '/api/v1/match?q=convert+currency',
        '/api/v1/match?q=what+time+is+it'
      ]
    });
  }
  
  // Track for analytics
  usageTracker.trackView(`/api/v1/match?q=${encodeURIComponent(query)}`, req);
  analytics.search(query, 0, req, source);
  
  // Get all hosted servers with full tool details
  const hosted = hostedMcp.listHostedServers();
  
  // Score each server
  const matches = hosted.map(server => {
    const serverDetails = hostedMcp.getHostedServer(server.slug);
    const { score, factors } = calculateMatchScore(query, { ...server, type: 'hosted' }, serverDetails);
    
    return {
      server: {
        slug: server.slug,
        name: server.name,
        description: server.description,
        hosted: true
      },
      tools: serverDetails?.tools?.map(t => ({
        name: t.name,
        description: t.description
      })) || [],
      score,
      confidence: getConfidence(score),
      factors,
      endpoint: `/mcp/${server.slug}/tools/call`
    };
  })
  .filter(m => m.score >= minScore)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit);
  
  // Also search directory for non-hosted options
  const directoryResults = db.servers.getAll({ search: query, limit: 3 });
  const directoryMatches = directoryResults.map(s => {
    const { score, factors } = calculateMatchScore(query, { 
      name: s.name, 
      description: s.description, 
      tools: [],
      type: 'directory' 
    });
    return {
      server: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        hosted: false,
        github_url: s.github_url,
        install_command: s.install_command
      },
      score,
      confidence: getConfidence(score),
      requires_install: true
    };
  }).filter(m => m.score >= minScore);
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // Build response
  const response = {
    query,
    matches,
    directory_alternatives: directoryMatches,
    meta: {
      total_hosted_servers: hosted.length,
      matches_found: matches.length,
      min_score_used: minScore,
      source,
      base_url: baseUrl
    }
  };
  
  // Add quick-use example for top match
  if (matches.length > 0) {
    const top = matches[0];
    response.recommended = {
      server: top.server.slug,
      tool: top.tools[0]?.name,
      confidence: top.confidence,
      curl_example: `curl -X POST ${baseUrl}/mcp/${top.server.slug}/tools/call -H "Content-Type: application/json" -d '{"name":"${top.tools[0]?.name || 'tool'}","arguments":{}}'`
    };
  }
  
  res.json(response);
});

// POST /api/v1/match — Same but with JSON body
app.post('/api/v1/match', (req, res) => {
  req.query.q = req.body.query || req.body.q;
  req.query.limit = req.body.limit;
  req.query.min_score = req.body.min_score;
  req.query.source = req.body.source || 'api';
  app.handle(req, res);
});

// POST /api/v1/match-and-execute — Find and run in one call
app.post('/api/v1/match-and-execute', async (req, res) => {
  const { query, arguments: args = {}, auto_select = true } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }
  
  usageTracker.trackView('/api/v1/match-and-execute', req);
  
  // Find best match
  const hosted = hostedMcp.listHostedServers();
  let bestMatch = null;
  let bestScore = 0;
  
  for (const server of hosted) {
    const serverDetails = hostedMcp.getHostedServer(server.slug);
    const { score } = calculateMatchScore(query, { ...server, type: 'hosted' }, serverDetails);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { server, details: serverDetails };
    }
  }
  
  if (!bestMatch || bestScore < 0.3) {
    return res.json({
      success: false,
      error: 'No matching tool found',
      query,
      best_score: bestScore
    });
  }
  
  // Execute the first tool of the best match
  const toolName = bestMatch.details.tools[0]?.name;
  if (!toolName) {
    return res.json({
      success: false,
      error: 'No tools available on matched server',
      matched_server: bestMatch.server.slug
    });
  }
  
  try {
    const result = await hostedMcp.executeTool(bestMatch.server.slug, toolName, args);
    
    res.json({
      success: true,
      matched: {
        server: bestMatch.server.slug,
        tool: toolName,
        score: bestScore,
        confidence: getConfidence(bestScore)
      },
      result
    });
  } catch (e) {
    res.json({
      success: false,
      error: e.message,
      matched: {
        server: bestMatch.server.slug,
        tool: toolName
      }
    });
  }
});

// Usage stats (protected)
app.get('/api/v1/hosted/stats', async (req, res) => {
  // Simple auth - check admin key
  const authKey = req.headers['authorization']?.replace('Bearer ', '') || req.query.key;
  if (authKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Provide admin key.' });
  }
  
  const inMemory = usageTracker.getStats();
  const persisted = await usageTracker.getPersistedStats();
  
  res.json({
    inMemory,
    persisted,
    supabaseConfigured: usageTracker.isSupabaseConfigured(),
  });
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

// === SEO Pages (Programmatic) ===
const seoPages = require('./lib/seo-pages');

// Individual server pages
app.get('/servers/:slug', (req, res) => {
  const server = db.servers.getBySlug(req.params.slug);
  if (!server) {
    return res.status(404).send('Server not found. <a href="/">Browse all servers</a>');
  }
  
  // Track view
  db.servers.incrementViews(server.id);
  
  const html = seoPages.generateServerPage(server);
  res.send(html);
});

// Category pages
app.get('/category/:slug', (req, res) => {
  const categories = db.categories.getAll();
  const category = categories.find(c => c.slug === req.params.slug);
  
  if (!category && req.params.slug !== 'all') {
    return res.status(404).send('Category not found. <a href="/">Browse all servers</a>');
  }
  
  const servers = category 
    ? db.servers.getAll({ category: category.name, limit: 500 })
    : db.servers.getAll({ limit: 500 });
  
  const cat = category || { name: 'All', slug: 'all', icon: '📦' };
  const html = seoPages.generateCategoryPage(cat, servers);
  res.send(html);
});

// Status endpoint - transparency for reliability
app.get('/status', (req, res) => {
  const startTime = Date.now();
  
  // Check database
  let dbStatus = 'ok';
  try {
    db.servers.getAll({ limit: 1 });
  } catch (e) {
    dbStatus = 'error';
  }
  
  // Check Supabase
  const supabaseConfigured = usageTracker.isSupabaseConfigured();
  
  res.json({
    status: dbStatus === 'ok' ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      api: 'ok',
      database: dbStatus,
      persistence: supabaseConfigured ? 'ok' : 'not_configured',
    },
    hosted_servers: Object.keys(hostedMCP.HOSTED_SERVERS).length,
    response_time_ms: Date.now() - startTime,
  });
});

app.get('/api/v1/status', (req, res) => {
  res.redirect('/status');
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
    xml += `  <url><loc>${baseUrl}/servers/${s.slug}</loc><priority>0.6</priority></url>\n`;
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
