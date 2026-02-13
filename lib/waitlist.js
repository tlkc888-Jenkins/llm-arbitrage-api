/**
 * Waitlist & Pro Tier Management
 * 
 * Tracks:
 * - Failed searches (what agents want but can't find)
 * - Email waitlist for premium features
 * - Pro tier API keys
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// In-memory storage (backed by Supabase when configured)
const missingSearches = new Map(); // query -> count
const waitlistEmails = [];
const proKeys = new Map(); // apiKey -> {email, tier, limits}

/**
 * Track a search that returned no results
 */
async function trackMissingSearch(query, userAgent, ipHash) {
  const key = query.toLowerCase().trim();
  const current = missingSearches.get(key) || { count: 0, firstSeen: new Date(), lastSeen: new Date() };
  current.count++;
  current.lastSeen = new Date();
  missingSearches.set(key, current);
  
  // Persist to Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/missing_searches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          query: key,
          count: current.count,
          first_seen: current.firstSeen.toISOString(),
          last_seen: current.lastSeen.toISOString(),
          user_agent: userAgent,
          ip_hash: ipHash
        })
      });
    } catch (e) {
      console.error('[MISSING SEARCH]', e.message);
    }
  }
  
  return current;
}

/**
 * Get top missing searches
 */
function getTopMissingSearches(limit = 20) {
  return Array.from(missingSearches.entries())
    .map(([query, data]) => ({ query, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Add email to waitlist
 */
async function addToWaitlist(email, interests = []) {
  const entry = {
    email,
    interests,
    joinedAt: new Date(),
    source: 'website'
  };
  
  waitlistEmails.push(entry);
  
  // Persist to Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          email,
          interests: JSON.stringify(interests),
          joined_at: entry.joinedAt.toISOString()
        })
      });
    } catch (e) {
      console.error('[WAITLIST]', e.message);
    }
  }
  
  return entry;
}

/**
 * Get waitlist count
 */
function getWaitlistCount() {
  return waitlistEmails.length;
}

/**
 * Validate Pro API key and get limits
 */
function validateProKey(apiKey) {
  if (!apiKey) return null;
  return proKeys.get(apiKey) || null;
}

/**
 * Create Pro API key (called by Stripe webhook)
 */
async function createProKey(email, tier = 'pro') {
  const apiKey = 'atp_' + require('crypto').randomBytes(24).toString('hex');
  
  const limits = {
    pro: { requestsPerMinute: 1000, requestsPerDay: 100000 },
    business: { requestsPerMinute: 10000, requestsPerDay: -1 }, // -1 = unlimited
  };
  
  const entry = {
    email,
    tier,
    limits: limits[tier] || limits.pro,
    createdAt: new Date(),
    active: true
  };
  
  proKeys.set(apiKey, entry);
  
  // Persist to Supabase if configured
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/pro_keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          api_key: apiKey,
          email,
          tier,
          limits: JSON.stringify(entry.limits),
          created_at: entry.createdAt.toISOString(),
          active: true
        })
      });
    } catch (e) {
      console.error('[PRO KEY]', e.message);
    }
  }
  
  return { apiKey, ...entry };
}

/**
 * Rate limit check
 */
const rateLimits = new Map(); // ipHash -> { minute: count, day: count, lastMinute, lastDay }

function checkRateLimit(ipHash, apiKey = null) {
  const now = Date.now();
  const minuteAgo = now - 60000;
  const dayAgo = now - 86400000;
  
  let limits = { requestsPerMinute: 100, requestsPerDay: 10000 }; // Free tier
  
  // Check for Pro tier
  if (apiKey) {
    const proData = validateProKey(apiKey);
    if (proData) {
      limits = proData.limits;
    }
  }
  
  const key = apiKey || ipHash;
  let usage = rateLimits.get(key);
  
  if (!usage || usage.lastMinute < minuteAgo) {
    usage = { minute: 0, day: usage?.day || 0, lastMinute: now, lastDay: usage?.lastDay || now };
  }
  
  if (usage.lastDay < dayAgo) {
    usage.day = 0;
    usage.lastDay = now;
  }
  
  usage.minute++;
  usage.day++;
  rateLimits.set(key, usage);
  
  const overMinute = limits.requestsPerMinute > 0 && usage.minute > limits.requestsPerMinute;
  const overDay = limits.requestsPerDay > 0 && usage.day > limits.requestsPerDay;
  
  return {
    allowed: !overMinute && !overDay,
    usage: { minute: usage.minute, day: usage.day },
    limits,
    exceeded: overMinute ? 'minute' : (overDay ? 'day' : null)
  };
}

module.exports = {
  trackMissingSearch,
  getTopMissingSearches,
  addToWaitlist,
  getWaitlistCount,
  validateProKey,
  createProKey,
  checkRateLimit
};
