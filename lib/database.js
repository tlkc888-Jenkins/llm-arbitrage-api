/**
 * Database module - SQLite via sql.js (pure JS, no native compilation)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'savvyllm.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;
let SQL = null;

// Initialize database
async function initDb() {
  if (db) return db;
  
  SQL = await initSqlJs();
  
  // Load existing database or create new
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    console.error('Error loading database:', e);
    db = new SQL.Database();
  }
  
  // Initialize tables
  db.run(`
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
    )
  `);
  
  db.run(`
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
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      query_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS card_fingerprints (
      fingerprint TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS ip_tracking (
      ip TEXT PRIMARY KEY,
      signup_count INTEGER DEFAULT 0,
      last_signup_at TEXT
    )
  `);
  
  // Create indexes
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, date)`);
  } catch (e) {
    // Indexes might already exist
  }
  
  saveDb();
  return db;
}

// Save database to file
function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// Helper to run queries
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  const result = db.exec("SELECT last_insert_rowid() as id");
  const lastId = result[0]?.values[0]?.[0] || 0;
  saveDb();
  return { lastInsertRowid: lastId };
}

function get(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// === User functions ===

const users = {
  create: (email, passwordHash, ip) => {
    const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return run(
      `INSERT INTO users (email, password_hash, trial_ends_at, signup_ip) VALUES (?, ?, ?, ?)`,
      [email, passwordHash, trialEnds, ip]
    );
  },
  
  getByEmail: (email) => get(`SELECT * FROM users WHERE email = ?`, [email]),
  
  getById: (id) => get(`SELECT * FROM users WHERE id = ?`, [id]),
  
  getByStripeCustomer: (customerId) => get(`SELECT * FROM users WHERE stripe_customer_id = ?`, [customerId]),
  
  updateStripe: (id, customerId) => run(
    `UPDATE users SET stripe_customer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [customerId, id]
  ),
  
  updateSubscription: (id, status, tier) => run(
    `UPDATE users SET subscription_status = ?, subscription_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, tier, id]
  ),
  
  updateCardFingerprint: (id, fingerprint) => run(
    `UPDATE users SET card_fingerprint = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [fingerprint, id]
  ),
  
  verifyEmail: (id) => run(
    `UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id]
  ),
};

// === API Key functions ===

const apiKeys = {
  create: (userId, keyHash, keyPrefix, name) => run(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name) VALUES (?, ?, ?, ?)`,
    [userId, keyHash, keyPrefix, name]
  ),
  
  getByHash: (hash) => get(`
    SELECT ak.*, u.subscription_status, u.subscription_tier, u.trial_ends_at
    FROM api_keys ak
    JOIN users u ON ak.user_id = u.id
    WHERE ak.key_hash = ? AND ak.revoked = 0
  `, [hash]),
  
  getByUser: (userId) => all(
    `SELECT id, key_prefix, name, last_used_at, created_at FROM api_keys WHERE user_id = ? AND revoked = 0`,
    [userId]
  ),
  
  updateUsed: (hash) => run(
    `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE key_hash = ?`,
    [hash]
  ),
  
  revoke: (id, userId) => run(
    `UPDATE api_keys SET revoked = 1 WHERE id = ? AND user_id = ?`,
    [id, userId]
  ),
};

// === Usage functions ===

const usage = {
  increment: (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = get(`SELECT * FROM usage WHERE user_id = ? AND date = ?`, [userId, today]);
    if (existing) {
      run(`UPDATE usage SET query_count = query_count + 1 WHERE user_id = ? AND date = ?`, [userId, today]);
    } else {
      run(`INSERT INTO usage (user_id, date, query_count) VALUES (?, ?, 1)`, [userId, today]);
    }
  },
  
  getToday: (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const row = get(`SELECT query_count FROM usage WHERE user_id = ? AND date = ?`, [userId, today]);
    return row?.query_count || 0;
  },
  
  getThisMonth: (userId) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const row = get(
      `SELECT SUM(query_count) as total FROM usage WHERE user_id = ? AND date >= ?`,
      [userId, startOfMonth.toISOString().split('T')[0]]
    );
    return row?.total || 0;
  },
};

// === Anti-abuse functions ===

const antiAbuse = {
  checkCardFingerprint: (fp) => get(`SELECT user_id FROM card_fingerprints WHERE fingerprint = ?`, [fp]),
  
  saveCardFingerprint: (fp, userId) => {
    try {
      run(`INSERT OR IGNORE INTO card_fingerprints (fingerprint, user_id) VALUES (?, ?)`, [fp, userId]);
    } catch (e) {}
  },
  
  trackIpSignup: (ip) => {
    const existing = get(`SELECT * FROM ip_tracking WHERE ip = ?`, [ip]);
    if (existing) {
      run(`UPDATE ip_tracking SET signup_count = signup_count + 1, last_signup_at = CURRENT_TIMESTAMP WHERE ip = ?`, [ip]);
    } else {
      run(`INSERT INTO ip_tracking (ip, signup_count, last_signup_at) VALUES (?, 1, CURRENT_TIMESTAMP)`, [ip]);
    }
  },
  
  getIpSignupCount: (ip) => {
    const row = get(`SELECT signup_count FROM ip_tracking WHERE ip = ?`, [ip]);
    return row?.signup_count || 0;
  },
};

// Raw query helper for admin
function query(sql, params = []) {
  return all(sql, params);
}

module.exports = {
  initDb,
  saveDb,
  users,
  apiKeys,
  usage,
  antiAbuse,
  query,
};
