/**
 * Usage Tracker — In-memory analytics + Supabase persistence
 * 
 * Tracks hosted MCP usage, notifies on first use,
 * and persists to Supabase when configured.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Persist to Supabase if configured
async function persistToSupabase(eventType, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  
  try {
    const payload = {
      event_type: eventType,
      server_slug: data.server || null,
      tool_name: data.tool || null,
      ip_hash: data.ip || null,
      user_agent: data.userAgent || null,
      metadata: data.metadata || {},
    };
    
    await fetch(`${SUPABASE_URL}/rest/v1/usage_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Silent fail - don't break the app
    console.error('[SUPABASE]', e.message);
  }
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

// In-memory storage
const stats = {
  firstUseAt: null,
  totalCalls: 0,
  totalViews: 0,
  byServer: {},
  byTool: {},
  byHour: {},
  recentCalls: [],  // Last 100 calls
  uniqueIPs: new Set(),
};

// Format timestamp
function formatTime(date = new Date()) {
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

// Hash IP for privacy
function hashIP(ip) {
  if (!ip) return 'unknown';
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash = hash & hash;
  }
  return 'ip_' + Math.abs(hash).toString(36);
}

// Extract IP from request
function getIP(req) {
  return req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() 
    || req?.socket?.remoteAddress 
    || 'unknown';
}

// Log to console with prefix
function log(msg, data = null) {
  const timestamp = formatTime();
  if (data) {
    console.log(`[USAGE ${timestamp}] ${msg}`, JSON.stringify(data));
  } else {
    console.log(`[USAGE ${timestamp}] ${msg}`);
  }
}

/**
 * Track a hosted MCP endpoint view (list, provision, discover)
 */
function trackView(endpoint, req) {
  stats.totalViews++;
  
  const ipHash = hashIP(getIP(req));
  const userAgent = req?.headers?.['user-agent']?.slice(0, 200) || 'unknown';
  const isNewIP = !stats.uniqueIPs.has(ipHash);
  stats.uniqueIPs.add(ipHash);
  
  // Extract query from endpoint if it's a discover call
  const discoverMatch = endpoint.match(/\/discover\?q=(.+)/);
  const query = discoverMatch ? decodeURIComponent(discoverMatch[1]) : null;
  
  // Persist to Supabase
  persistToSupabase(query ? 'discover' : 'view', {
    ip: ipHash,
    userAgent,
    metadata: { endpoint, query }
  });
  
  // First ever view?
  if (stats.totalViews === 1) {
    stats.firstUseAt = new Date();
    log('🎉 FIRST VIEW EVER!', { endpoint, ip: ipHash, userAgent: userAgent.slice(0, 100) });
  } else if (isNewIP) {
    log('👀 New visitor', { endpoint, ip: ipHash });
  }
}

/**
 * Track a hosted MCP tool call
 */
function trackCall(serverSlug, toolName, req) {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13);
  const ipHash = hashIP(getIP(req));
  const userAgent = req?.headers?.['user-agent']?.slice(0, 200) || 'unknown';
  
  // Update stats
  stats.totalCalls++;
  stats.byServer[serverSlug] = (stats.byServer[serverSlug] || 0) + 1;
  stats.byTool[`${serverSlug}:${toolName}`] = (stats.byTool[`${serverSlug}:${toolName}`] || 0) + 1;
  stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
  
  const isNewIP = !stats.uniqueIPs.has(ipHash);
  stats.uniqueIPs.add(ipHash);
  
  // Persist to Supabase
  persistToSupabase('tool_call', {
    server: serverSlug,
    tool: toolName,
    ip: ipHash,
    userAgent,
    metadata: {}
  });
  
  // Add to recent calls (keep last 100)
  stats.recentCalls.push({
    time: formatTime(now),
    server: serverSlug,
    tool: toolName,
    ip: ipHash,
    newUser: isNewIP
  });
  if (stats.recentCalls.length > 100) {
    stats.recentCalls.shift();
  }
  
  // First ever call?
  if (stats.totalCalls === 1) {
    stats.firstUseAt = stats.firstUseAt || now;
    log('🚀 FIRST TOOL CALL EVER!', {
      server: serverSlug,
      tool: toolName,
      ip: ipHash,
      userAgent: userAgent.slice(0, 100)
    });
  } else if (isNewIP) {
    log('🆕 New user called tool', { server: serverSlug, tool: toolName, ip: ipHash });
  } else if (stats.totalCalls % 10 === 0) {
    log(`📊 Milestone: ${stats.totalCalls} total calls`);
  }
}

/**
 * Get current stats
 */
function getStats() {
  return {
    summary: {
      firstUseAt: stats.firstUseAt ? formatTime(stats.firstUseAt) : null,
      totalCalls: stats.totalCalls,
      totalViews: stats.totalViews,
      uniqueUsers: stats.uniqueIPs.size,
    },
    byServer: stats.byServer,
    topTools: Object.entries(stats.byTool)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tool, count]) => ({ tool, count })),
    recentCalls: stats.recentCalls.slice(-20).reverse(),
    hourlyUsage: Object.entries(stats.byHour)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 24)
      .map(([hour, count]) => ({ hour, count })),
  };
}

/**
 * Check if we've had any usage
 */
function hasUsage() {
  return stats.totalCalls > 0 || stats.totalViews > 0;
}

/**
 * Get persisted stats from Supabase (survives restarts)
 */
async function getPersistedStats() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { error: 'Supabase not configured' };
  }
  
  try {
    // Get total counts by event type
    const eventsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/usage_events?select=event_type,server_slug,tool_name,created_at&order=created_at.desc&limit=500`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );
    
    if (!eventsRes.ok) {
      throw new Error(`Supabase error: ${eventsRes.status}`);
    }
    
    const events = await eventsRes.json();
    
    // Aggregate stats
    const stats = {
      total: events.length,
      byType: {},
      byServer: {},
      byTool: {},
      recent: events.slice(0, 20),
      firstEvent: events.length > 0 ? events[events.length - 1].created_at : null,
      lastEvent: events.length > 0 ? events[0].created_at : null,
    };
    
    for (const e of events) {
      stats.byType[e.event_type] = (stats.byType[e.event_type] || 0) + 1;
      if (e.server_slug) {
        stats.byServer[e.server_slug] = (stats.byServer[e.server_slug] || 0) + 1;
      }
      if (e.tool_name) {
        const key = `${e.server_slug}:${e.tool_name}`;
        stats.byTool[key] = (stats.byTool[key] || 0) + 1;
      }
    }
    
    return stats;
  } catch (e) {
    console.error('[SUPABASE QUERY]', e.message);
    return { error: e.message };
  }
}

module.exports = {
  trackView,
  trackCall,
  getStats,
  getPersistedStats,
  hasUsage,
  isSupabaseConfigured,
};
