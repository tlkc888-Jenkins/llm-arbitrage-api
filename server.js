#!/usr/bin/env node
/**
 * MCPHub — The MCP Server Marketplace
 */

const express = require('express');
const path = require('path');
const db = require('./lib/database');

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

// === Start ===

async function start() {
  await db.initDb();
  console.log('Database initialized');
  
  app.listen(PORT, () => {
    console.log(`MCPHub running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
