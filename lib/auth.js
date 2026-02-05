/**
 * Authentication module - JWT, password hashing, API key generation
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-' + crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = '7d';

// === Password ===

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// === JWT ===

function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// === API Keys ===

function generateApiKey() {
  // Format: svl_live_<random>
  const random = crypto.randomBytes(24).toString('base64url');
  return `svl_live_${random}`;
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function getKeyPrefix(key) {
  // Return first 12 chars for display (e.g., "svl_live_abc...")
  return key.substring(0, 12) + '...';
}

// === Middleware ===

function authMiddleware(db) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    // Support both "Bearer <jwt>" and "Bearer <api_key>"
    const token = authHeader.replace('Bearer ', '');
    
    // Check if it's an API key (starts with svl_)
    if (token.startsWith('svl_')) {
      const keyHash = hashApiKey(token);
      const keyData = db.apiKeys.getByHash(keyHash);
      
      if (!keyData) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Check subscription status
      const now = new Date();
      const trialEnds = keyData.trial_ends_at ? new Date(keyData.trial_ends_at) : null;
      const isTrialing = keyData.subscription_status === 'trialing' && trialEnds && now < trialEnds;
      const isActive = keyData.subscription_status === 'active';
      
      if (!isTrialing && !isActive) {
        return res.status(403).json({ 
          error: 'Subscription required',
          subscription_status: keyData.subscription_status,
          trial_ended: trialEnds ? trialEnds.toISOString() : null
        });
      }
      
      // Update last used
      db.apiKeys.updateUsed(keyHash);
      
      req.user = {
        id: keyData.user_id,
        tier: keyData.subscription_tier,
        status: keyData.subscription_status,
        authType: 'api_key'
      };
      
      return next();
    }
    
    // Otherwise, treat as JWT
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      authType: 'jwt'
    };
    
    next();
  };
}

// Optional auth - doesn't require auth but attaches user if present
function optionalAuthMiddleware(db) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (token.startsWith('svl_')) {
      const keyHash = hashApiKey(token);
      const keyData = db.apiKeys.getByHash(keyHash);
      
      if (keyData) {
        db.apiKeys.updateUsed(keyHash);
        req.user = {
          id: keyData.user_id,
          tier: keyData.subscription_tier,
          status: keyData.subscription_status,
          authType: 'api_key'
        };
      } else {
        req.user = null;
      }
    } else {
      const decoded = verifyToken(token);
      req.user = decoded ? {
        id: decoded.userId,
        email: decoded.email,
        authType: 'jwt'
      } : null;
    }
    
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  authMiddleware,
  optionalAuthMiddleware,
};
