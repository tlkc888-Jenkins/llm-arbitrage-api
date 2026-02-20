/**
 * Rate Limiter — Hard limits with 429 responses
 * 
 * Tiers:
 * - Anonymous: 60 req/min, 500 req/day
 * - Free API Key: 100 req/min, 2000 req/day  
 * - Pro API Key: 1000 req/min, 50000 req/day
 */

const TIERS = {
  anonymous: { perMinute: 60, perDay: 500 },
  free: { perMinute: 100, perDay: 2000 },
  pro: { perMinute: 1000, perDay: 50000 }
};

// In-memory stores (consider Redis for multi-instance)
const minuteStore = new Map(); // IP/key -> { count, resetAt }
const dayStore = new Map();    // IP/key -> { count, resetAt }

function getIdentifier(req) {
  // Check for API key first
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey) {
    return { id: `key:${apiKey}`, type: 'key', key: apiKey };
  }
  
  // Fall back to IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket?.remoteAddress 
    || 'unknown';
  return { id: `ip:${ip}`, type: 'ip', ip };
}

function getTier(identifier, keyValidator) {
  if (identifier.type === 'key' && keyValidator) {
    const keyData = keyValidator(identifier.key);
    if (keyData?.tier === 'pro') return 'pro';
    if (keyData?.valid) return 'free';
  }
  return 'anonymous';
}

function checkLimit(store, id, limit, windowMs) {
  const now = Date.now();
  const record = store.get(id);
  
  if (!record || now > record.resetAt) {
    // New window
    store.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

function createRateLimiter(keyValidator = null) {
  return function rateLimitMiddleware(req, res, next) {
    const identifier = getIdentifier(req);
    const tier = getTier(identifier, keyValidator);
    const limits = TIERS[tier];
    
    // Check minute limit
    const minuteCheck = checkLimit(
      minuteStore, 
      identifier.id, 
      limits.perMinute, 
      60 * 1000
    );
    
    if (!minuteCheck.allowed) {
      res.set({
        'X-RateLimit-Limit': limits.perMinute,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': Math.ceil(minuteCheck.resetAt / 1000),
        'Retry-After': Math.ceil((minuteCheck.resetAt - Date.now()) / 1000)
      });
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${limits.perMinute}/minute for ${tier} tier.`,
        tier,
        retryAfter: Math.ceil((minuteCheck.resetAt - Date.now()) / 1000),
        upgrade: tier === 'anonymous' 
          ? 'Add X-Api-Key header for higher limits. Get a free key at https://tryautropic.com/mining'
          : tier === 'free'
          ? 'Upgrade to Pro for 1000 req/min at https://tryautropic.com/pro'
          : null
      });
    }
    
    // Check daily limit
    const dayCheck = checkLimit(
      dayStore, 
      identifier.id, 
      limits.perDay, 
      24 * 60 * 60 * 1000
    );
    
    if (!dayCheck.allowed) {
      res.set({
        'X-RateLimit-Limit-Day': limits.perDay,
        'X-RateLimit-Remaining-Day': 0,
        'X-RateLimit-Reset-Day': Math.ceil(dayCheck.resetAt / 1000),
        'Retry-After': Math.ceil((dayCheck.resetAt - Date.now()) / 1000)
      });
      
      return res.status(429).json({
        error: 'Daily rate limit exceeded',
        message: `Daily limit reached. Limit: ${limits.perDay}/day for ${tier} tier.`,
        tier,
        retryAfter: Math.ceil((dayCheck.resetAt - Date.now()) / 1000),
        upgrade: tier !== 'pro' 
          ? 'Upgrade for higher daily limits at https://tryautropic.com/pro'
          : null
      });
    }
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limits.perMinute,
      'X-RateLimit-Remaining': minuteCheck.remaining,
      'X-RateLimit-Reset': Math.ceil(minuteCheck.resetAt / 1000),
      'X-RateLimit-Tier': tier
    });
    
    // Attach tier info to request for downstream use
    req.rateLimitTier = tier;
    req.rateLimitIdentifier = identifier;
    
    next();
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  
  for (const [key, record] of minuteStore.entries()) {
    if (now > record.resetAt + 60000) minuteStore.delete(key);
  }
  
  for (const [key, record] of dayStore.entries()) {
    if (now > record.resetAt + 86400000) dayStore.delete(key);
  }
}, 5 * 60 * 1000);

// Stats for monitoring
function getStats() {
  return {
    activeMinuteTrackers: minuteStore.size,
    activeDayTrackers: dayStore.size,
    tiers: TIERS
  };
}

module.exports = {
  createRateLimiter,
  getStats,
  TIERS
};
