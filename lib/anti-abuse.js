/**
 * Anti-abuse module - disposable email detection, IP tracking, rate limiting
 */

const validator = require('validator');

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamail.org',
  'sharklasers.com', 'grr.la', 'guerrillamail.net', 'guerrillamail.biz',
  'mailinator.com', 'maildrop.cc', 'throwaway.email', '10minutemail.com',
  'tempail.com', 'fakeinbox.com', 'mailnesia.com', 'trashmail.com',
  'getnada.com', 'yopmail.com', 'mohmal.com', 'dispostable.com',
  'mailcatch.com', 'spam4.me', 'binkmail.com', 'safetymail.info',
  'spamgourmet.com', 'mytrashmail.com', 'mt2015.com', 'thankyou2010.com',
  'trash2009.com', 'mt2009.com', 'trashymail.com', 'antichef.com',
  'emailwarden.com', 'gishpuppy.com', 'kasmail.com', 'onewaymail.com',
  'spamobox.com', 'spamspot.com', 'thisisnotmyrealemail.com', 'tradermail.info',
  'veryrealemail.com', 'zippymail.info', 'flyspam.com', 'incognitomail.com',
  'mailexpire.com', 'mailforspam.com', 'meltmail.com', 'mintemail.com',
  'nobulk.com', 'nospamfor.us', 'nowmymail.com', 'spamfree24.org',
  'spamherelots.com', 'tempomail.fr', 'temporaryinbox.com', 'jetable.org',
  'link2mail.net', 'uggsrock.com', 'mailnull.com', 'e4ward.com',
  'spamex.com', 'sneakemail.com', 'mailmoat.com', 'spamcannon.com',
  'spamcon.org', 'spamcowboy.com', 'spamday.com', 'spaml.com',
  'tempinbox.com', 'tempr.email', 'discard.email', 'discardmail.com',
  'disposableemailaddresses.com', 'emailondeck.com', 'emkei.cz',
  'getairmail.com', 'mailsac.com', 'inboxalias.com', 'burnermail.io',
]);

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /^test[0-9]*@/i,
  /^user[0-9]+@/i,
  /^fake[0-9]*@/i,
  /^temp[0-9]*@/i,
  /^spam[0-9]*@/i,
  /^throwaway/i,
  /^disposable/i,
];

function isDisposableEmail(email) {
  if (!email || !validator.isEmail(email)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return { valid: false, reason: 'Invalid email domain' };
  }
  
  // Check disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Disposable email addresses not allowed' };
  }
  
  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(email)) {
      return { valid: false, reason: 'Suspicious email pattern detected' };
    }
  }
  
  return { valid: true };
}

function validateSignupIp(db, ip, maxSignups = 3) {
  const count = db.antiAbuse.getIpSignupCount(ip);
  
  if (count >= maxSignups) {
    return {
      valid: false,
      reason: 'Too many signups from this IP address',
      signupCount: count,
    };
  }
  
  return { valid: true, signupCount: count };
}

function checkCardReuse(db, fingerprint) {
  const existing = db.antiAbuse.checkCardFingerprint(fingerprint);
  
  if (existing) {
    return {
      valid: false,
      reason: 'This card has already been used for another account',
      existingUserId: existing.user_id,
    };
  }
  
  return { valid: true };
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.ip ||
         'unknown';
}

// Rate limiting - simple in-memory (use Redis for production scaling)
const rateLimitStore = new Map();

function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const windowKey = `${key}:${Math.floor(now / windowMs)}`;
  
  const current = rateLimitStore.get(windowKey) || 0;
  
  // Clean old entries periodically
  if (Math.random() < 0.01) {
    const cutoff = Math.floor(now / windowMs) - 2;
    for (const k of rateLimitStore.keys()) {
      const window = parseInt(k.split(':').pop());
      if (window < cutoff) rateLimitStore.delete(k);
    }
  }
  
  if (current >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  rateLimitStore.set(windowKey, current + 1);
  return { allowed: true, remaining: maxRequests - current - 1 };
}

// Middleware
function rateLimitMiddleware(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.user?.id || getClientIp(req);
    const result = rateLimit(key, maxRequests, windowMs);
    
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfterMs: windowMs,
      });
    }
    
    next();
  };
}

module.exports = {
  isDisposableEmail,
  validateSignupIp,
  checkCardReuse,
  getClientIp,
  rateLimit,
  rateLimitMiddleware,
};
