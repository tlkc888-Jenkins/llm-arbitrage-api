/**
 * Usage Tracker — In-memory analytics + alerting
 * 
 * Tracks hosted MCP usage and notifies on first use.
 * Works without external dependencies.
 */

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
 * Track a hosted MCP endpoint view (list, provision)
 */
function trackView(endpoint, req) {
  stats.totalViews++;
  
  const ipHash = hashIP(getIP(req));
  const isNewIP = !stats.uniqueIPs.has(ipHash);
  stats.uniqueIPs.add(ipHash);
  
  // First ever view?
  if (stats.totalViews === 1) {
    stats.firstUseAt = new Date();
    log('🎉 FIRST VIEW EVER!', { 
      endpoint, 
      ip: ipHash, 
      userAgent: req?.headers?.['user-agent']?.slice(0, 100) 
    });
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
  
  // Update stats
  stats.totalCalls++;
  stats.byServer[serverSlug] = (stats.byServer[serverSlug] || 0) + 1;
  stats.byTool[`${serverSlug}:${toolName}`] = (stats.byTool[`${serverSlug}:${toolName}`] || 0) + 1;
  stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
  
  const isNewIP = !stats.uniqueIPs.has(ipHash);
  stats.uniqueIPs.add(ipHash);
  
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
      userAgent: req?.headers?.['user-agent']?.slice(0, 100)
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

module.exports = {
  trackView,
  trackCall,
  getStats,
  hasUsage,
};
