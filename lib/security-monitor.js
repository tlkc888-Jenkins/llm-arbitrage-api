/**
 * Security Monitor — Track and alert on suspicious activity
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// In-memory tracking for rate limiting and pattern detection
const requestTracker = new Map();
const suspiciousIPs = new Set();
const alerts = [];

// Suspicious patterns to watch for
const SUSPICIOUS_PATTERNS = [
  /\.\.\//, // Path traversal
  /\<script/i, // XSS attempts
  /union.*select/i, // SQL injection
  /exec\s*\(/i, // Command injection
  /\/etc\/passwd/, // File access
  /\.env/, // Env file access
  /\.git/, // Git exposure
  /wp-admin|wordpress|phpmy/i, // Scanner bots
  /eval\s*\(/i, // Code injection
  /base64_decode/i, // PHP injection
];

// Sensitive endpoints to monitor closely
const SENSITIVE_ENDPOINTS = [
  '/api/admin',
  '/api/v1/key',
  '/api/v1/stripe',
];

// Extract IP from request
function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket?.remoteAddress 
    || 'unknown';
}

// Check if request looks suspicious
function isSuspicious(req) {
  const url = req.originalUrl || req.url;
  const body = JSON.stringify(req.body || {});
  const fullRequest = url + body;
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fullRequest)) {
      return { suspicious: true, reason: `Pattern match: ${pattern}` };
    }
  }
  
  return { suspicious: false };
}

// Track request for rate limiting
function trackRequest(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  
  if (!requestTracker.has(ip)) {
    requestTracker.set(ip, []);
  }
  
  const requests = requestTracker.get(ip);
  requests.push(now);
  
  // Clean old requests
  const cutoff = now - windowMs;
  const recent = requests.filter(t => t > cutoff);
  requestTracker.set(ip, recent);
  
  return recent.length;
}

// Log security event to Supabase
async function logSecurityEvent(eventType, data) {
  console.log(`[SECURITY] ${eventType}:`, JSON.stringify(data));
  
  // Store in memory for quick access
  alerts.push({
    timestamp: new Date().toISOString(),
    type: eventType,
    ...data
  });
  
  // Keep only last 1000 alerts in memory
  if (alerts.length > 1000) {
    alerts.shift();
  }
  
  // Also log to Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/security_events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          event_type: eventType,
          ip_address: data.ip,
          path: data.path,
          user_agent: data.userAgent,
          reason: data.reason,
          extra: JSON.stringify(data.extra || {}),
          created_at: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to log security event to Supabase:', e.message);
    }
  }
}

// Security middleware
function securityMiddleware(req, res, next) {
  const ip = getIP(req);
  const path = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Check for suspicious patterns
  const { suspicious, reason } = isSuspicious(req);
  if (suspicious) {
    logSecurityEvent('SUSPICIOUS_REQUEST', {
      ip,
      path,
      userAgent,
      reason,
      method: req.method
    });
    suspiciousIPs.add(ip);
  }
  
  // Track rate
  const requestCount = trackRequest(ip);
  
  // Alert on high rate (potential DDoS/scraping)
  if (requestCount > 100) {
    logSecurityEvent('HIGH_RATE', {
      ip,
      path,
      userAgent,
      requestCount,
      reason: `${requestCount} requests in 1 minute`
    });
  }
  
  // Log access to sensitive endpoints
  if (SENSITIVE_ENDPOINTS.some(e => path.startsWith(e))) {
    logSecurityEvent('SENSITIVE_ACCESS', {
      ip,
      path,
      userAgent,
      method: req.method
    });
  }
  
  // Log if already flagged as suspicious
  if (suspiciousIPs.has(ip)) {
    logSecurityEvent('FLAGGED_IP_ACCESS', {
      ip,
      path,
      userAgent
    });
  }
  
  next();
}

// Get recent alerts
function getAlerts(limit = 50) {
  return alerts.slice(-limit).reverse();
}

// Get stats
function getStats() {
  return {
    totalTrackedIPs: requestTracker.size,
    suspiciousIPs: Array.from(suspiciousIPs),
    recentAlerts: alerts.slice(-20).reverse(),
    alertCount: alerts.length
  };
}

// Clear old data (call periodically)
function cleanup() {
  const now = Date.now();
  const cutoff = now - 3600000; // 1 hour
  
  for (const [ip, requests] of requestTracker.entries()) {
    const recent = requests.filter(t => t > cutoff);
    if (recent.length === 0) {
      requestTracker.delete(ip);
    } else {
      requestTracker.set(ip, recent);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanup, 600000);

module.exports = {
  middleware: securityMiddleware,
  getAlerts,
  getStats,
  logSecurityEvent
};
