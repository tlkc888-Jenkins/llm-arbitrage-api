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
    console.log(`${db.servers.count()} MCP servers loaded`);
  });
}

start().catch(console.error);
