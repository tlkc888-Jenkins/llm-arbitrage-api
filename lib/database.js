/**
 * Database module - SQLite for user, API key, and usage storage
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'savvyllm.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    subscription_tier TEXT DEFAULT 'starter',
    trial_ends_at TEXT,
    card_fingerprint TEXT,
    signup_ip TEXT,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT DEFAULT 'Default',
    last_used_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    query_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS card_fingerprints (
    fingerprint TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ip_tracking (
    ip TEXT PRIMARY KEY,
    signup_count INTEGER DEFAULT 0,
    last_signup_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
  CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, date);
`);

// === User functions ===

const createUser = db.prepare(`
  INSERT INTO users (email, password_hash, trial_ends_at, signup_ip)
  VALUES (?, ?, datetime('now', '+30 days'), ?)
`);

const getUserByEmail = db.prepare(`
  SELECT * FROM users WHERE email = ?
`);

const getUserById = db.prepare(`
  SELECT * FROM users WHERE id = ?
`);

const getUserByStripeCustomer = db.prepare(`
  SELECT * FROM users WHERE stripe_customer_id = ?
`);

const updateUserStripe = db.prepare(`
  UPDATE users SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

const updateUserSubscription = db.prepare(`
  UPDATE users SET subscription_status = ?, subscription_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

const updateUserCardFingerprint = db.prepare(`
  UPDATE users SET card_fingerprint = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

const verifyUserEmail = db.prepare(`
  UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

// === API Key functions ===

const createApiKey = db.prepare(`
  INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
  VALUES (?, ?, ?, ?)
`);

const getApiKeyByHash = db.prepare(`
  SELECT ak.*, u.subscription_status, u.subscription_tier, u.trial_ends_at
  FROM api_keys ak
  JOIN users u ON ak.user_id = u.id
  WHERE ak.key_hash = ? AND ak.revoked = 0
`);

const getApiKeysByUser = db.prepare(`
  SELECT id, key_prefix, name, last_used_at, created_at FROM api_keys
  WHERE user_id = ? AND revoked = 0
`);

const updateApiKeyUsed = db.prepare(`
  UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = ?
`);

const revokeApiKey = db.prepare(`
  UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?
`);

// === Usage functions ===

const incrementUsage = db.prepare(`
  INSERT INTO usage (user_id, date, query_count)
  VALUES (?, date('now'), 1)
  ON CONFLICT(user_id, date) DO UPDATE SET query_count = query_count + 1
`);

const getUsageToday = db.prepare(`
  SELECT query_count FROM usage WHERE user_id = ? AND date = date('now')
`);

const getUsageThisMonth = db.prepare(`
  SELECT SUM(query_count) as total FROM usage
  WHERE user_id = ? AND date >= date('now', 'start of month')
`);

// === Anti-abuse functions ===

const checkCardFingerprint = db.prepare(`
  SELECT user_id FROM card_fingerprints WHERE fingerprint = ?
`);

const saveCardFingerprint = db.prepare(`
  INSERT OR IGNORE INTO card_fingerprints (fingerprint, user_id) VALUES (?, ?)
`);

const trackIpSignup = db.prepare(`
  INSERT INTO ip_tracking (ip, signup_count, last_signup_at)
  VALUES (?, 1, CURRENT_TIMESTAMP)
  ON CONFLICT(ip) DO UPDATE SET signup_count = signup_count + 1, last_signup_at = CURRENT_TIMESTAMP
`);

const getIpSignupCount = db.prepare(`
  SELECT signup_count FROM ip_tracking WHERE ip = ?
`);

module.exports = {
  db,
  users: {
    create: (email, passwordHash, ip) => createUser.run(email, passwordHash, ip),
    getByEmail: (email) => getUserByEmail.get(email),
    getById: (id) => getUserById.get(id),
    getByStripeCustomer: (customerId) => getUserByStripeCustomer.get(customerId),
    updateStripe: (id, customerId) => updateUserStripe.run(customerId, id),
    updateSubscription: (id, status, tier) => updateUserSubscription.run(status, tier, id),
    updateCardFingerprint: (id, fingerprint) => updateUserCardFingerprint.run(fingerprint, id),
    verifyEmail: (id) => verifyUserEmail.run(id),
  },
  apiKeys: {
    create: (userId, keyHash, keyPrefix, name) => createApiKey.run(userId, keyHash, keyPrefix, name),
    getByHash: (hash) => getApiKeyByHash.get(hash),
    getByUser: (userId) => getApiKeysByUser.all(userId),
    updateUsed: (hash) => updateApiKeyUsed.run(hash),
    revoke: (id, userId) => revokeApiKey.run(id, userId),
  },
  usage: {
    increment: (userId) => incrementUsage.run(userId),
    getToday: (userId) => getUsageToday.get(userId)?.query_count || 0,
    getThisMonth: (userId) => getUsageThisMonth.get(userId)?.total || 0,
  },
  antiAbuse: {
    checkCardFingerprint: (fp) => checkCardFingerprint.get(fp),
    saveCardFingerprint: (fp, userId) => saveCardFingerprint.run(fp, userId),
    trackIpSignup: (ip) => trackIpSignup.run(ip),
    getIpSignupCount: (ip) => getIpSignupCount.get(ip)?.signup_count || 0,
  },
};
