/**
 * Analytics — Track usage for market intelligence
 * 
 * Stores: search queries, server views, MCP tool calls
 * Data is the moat.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Check if Supabase is configured
const isConfigured = () => SUPABASE_URL && SUPABASE_KEY;

// Hash IP for privacy (we don't need exact IPs, just uniqueness)
function hashIP(ip) {
  if (!ip) return 'unknown';
  // Simple hash - not cryptographic, just for grouping
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'ip_' + Math.abs(hash).toString(36);
}

// Extract useful info from request
function extractMeta(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket?.remoteAddress 
    || 'unknown';
  
  return {
    ip_hash: hashIP(ip),
    user_agent: req.headers['user-agent'] || 'unknown',
    referer: req.headers['referer'] || null,
  };
}

// Log event to Supabase
async function track(event_type, data, req = null) {
  if (!isConfigured()) {
    // Silent fail if not configured - don't break the app
    return;
  }
  
  try {
    const meta = req ? extractMeta(req) : {};
    
    const payload = {
      event_type,
      query: data.query || null,
      server_slug: data.server_slug || null,
      category: data.category || null,
      source: data.source || 'api',
      results_count: data.results_count || null,
      ip_hash: meta.ip_hash || null,
      user_agent: meta.user_agent || null,
      referer: meta.referer || null,
      extra: data.extra ? JSON.stringify(data.extra) : null,
    };
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      console.error('Analytics error:', res.status, await res.text());
    }
  } catch (e) {
    // Don't let analytics break the app
    console.error('Analytics error:', e.message);
  }
}

// Convenience methods
const analytics = {
  // Someone searched for servers
  search: (query, results_count, req, source = 'web') => 
    track('search', { query, results_count, source }, req),
  
  // Someone viewed a server detail page
  view: (server_slug, req, source = 'web') => 
    track('view', { server_slug, source }, req),
  
  // MCP server tool was called
  mcpCall: (tool_name, query, results_count) => 
    track('mcp_call', { query, results_count, source: 'mcp', extra: { tool: tool_name } }),
  
  // Someone submitted a server
  submit: (github_url, req) => 
    track('submit', { query: github_url, source: 'web' }, req),
  
  // Check if configured
  isConfigured,
};

module.exports = analytics;
